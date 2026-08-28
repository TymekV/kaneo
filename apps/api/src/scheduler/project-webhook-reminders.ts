import {
  and,
  asc,
  between,
  eq,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import db from "../database";
import {
  columnTable,
  integrationTable,
  taskReminderSentTable,
  taskTable,
} from "../database/schema";
import {
  type GenericWebhookConfig,
  normalizeGenericWebhookConfig,
} from "../plugins/generic-webhook/config";
import { sendDueDateReminder } from "../plugins/generic-webhook/events";
import { REMINDER_WINDOW_MINUTES } from "./reminder-timing";

const MINUTE_MS = 60 * 1000;
const CLAIM_BATCH_SIZE = 100;
const STALE_CLAIM_MINUTES = 5;

type ClaimedTask = {
  id: string;
  dueDate: Date;
  sentId: string;
};

// Mirrors the claim strategy in due-date-reminders.ts: lock the candidate
// task rows with SKIP LOCKED so concurrent scheduler runs (e.g. multiple API
// instances) never double-claim the same task, and retry rows that
// previously failed or were left stuck in "sending" by a crashed run instead
// of silently dropping them forever.
async function claimTasksForWebhookReminder(
  projectId: string,
  reminderType: string,
  windowStart: Date,
  windowEnd: Date,
) {
  return db.transaction(async (tx) => {
    const staleAt = new Date(Date.now() - STALE_CLAIM_MINUTES * MINUTE_MS);
    const results = await tx
      .select({
        id: taskTable.id,
        dueDate: taskTable.dueDate,
        sentId: taskReminderSentTable.id,
        sentStatus: taskReminderSentTable.status,
      })
      .from(taskTable)
      .leftJoin(columnTable, eq(taskTable.columnId, columnTable.id))
      .leftJoin(
        taskReminderSentTable,
        and(
          eq(taskReminderSentTable.taskId, taskTable.id),
          eq(taskReminderSentTable.reminderType, reminderType),
        ),
      )
      .where(
        and(
          eq(taskTable.projectId, projectId),
          isNotNull(taskTable.dueDate),
          between(taskTable.dueDate, windowStart, windowEnd),
          or(
            isNull(taskReminderSentTable.id),
            eq(taskReminderSentTable.status, "failed"),
            and(
              eq(taskReminderSentTable.status, "sending"),
              lte(taskReminderSentTable.updatedAt, staleAt),
            ),
          ),
          // Exclude tasks in final columns (completed); include tasks with no column
          or(isNull(columnTable.isFinal), eq(columnTable.isFinal, false)),
        ),
      )
      .orderBy(asc(taskTable.dueDate))
      .limit(CLAIM_BATCH_SIZE)
      .for("update", { of: taskTable, skipLocked: true });

    const claimed: ClaimedTask[] = [];
    for (const task of results) {
      if (!task.dueDate) continue;

      if (task.sentId) {
        console.log("Reclaiming failed/stale webhook reminder for retry", {
          taskId: task.id,
          reminderType,
          sentId: task.sentId,
          previousStatus: task.sentStatus,
        });
        await tx
          .update(taskReminderSentTable)
          .set({
            status: "sending",
            sentAt: null,
            attempts: sql`${taskReminderSentTable.attempts} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(taskReminderSentTable.id, task.sentId));
        claimed.push({
          id: task.id,
          dueDate: task.dueDate,
          sentId: task.sentId,
        });
      } else {
        const [record] = await tx
          .insert(taskReminderSentTable)
          .values({
            taskId: task.id,
            reminderType,
            status: "sending",
            attempts: 1,
          })
          .onConflictDoNothing({
            target: [
              taskReminderSentTable.taskId,
              taskReminderSentTable.reminderType,
            ],
          })
          .returning({ id: taskReminderSentTable.id });
        if (record) {
          claimed.push({
            id: task.id,
            dueDate: task.dueDate,
            sentId: record.id,
          });
        }
      }
    }
    return claimed;
  });
}

export async function checkProjectWebhookReminders(): Promise<{
  degraded: boolean;
}> {
  const now = new Date();
  const integrations = await db
    .select({
      id: integrationTable.id,
      projectId: integrationTable.projectId,
      config: integrationTable.config,
    })
    .from(integrationTable)
    .where(
      and(
        eq(integrationTable.type, "generic-webhook"),
        eq(integrationTable.isActive, true),
      ),
    );
  let degraded = false;
  let sent = 0;
  let failed = 0;

  console.log("Checking project webhook reminders", {
    now: now.toISOString(),
    integrationCount: integrations.length,
  });

  for (const integration of integrations) {
    try {
      const config = normalizeGenericWebhookConfig(
        JSON.parse(integration.config) as GenericWebhookConfig,
      );
      if (!config.events?.dueDateReminder) continue;

      const leadTimeMinutes = config.dueDateReminderLeadTimeMinutes ?? 1440;
      const windowEnd = new Date(now.getTime() + leadTimeMinutes * MINUTE_MS);
      const windowStart = new Date(
        windowEnd.getTime() - REMINDER_WINDOW_MINUTES * MINUTE_MS,
      );
      const reminderType = `generic_webhook:${integration.id}`;

      const tasks = await claimTasksForWebhookReminder(
        integration.projectId,
        reminderType,
        windowStart,
        windowEnd,
      );

      console.log("Claimed tasks for project webhook reminder", {
        integrationId: integration.id,
        projectId: integration.projectId,
        leadTimeMinutes,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        claimedCount: tasks.length,
      });

      for (const task of tasks) {
        console.log("Sending project webhook due date reminder", {
          taskId: task.id,
          integrationId: integration.id,
          projectId: integration.projectId,
          dueDate: task.dueDate.toISOString(),
        });

        try {
          const delivered = await sendDueDateReminder(
            config,
            task.id,
            integration.projectId,
            leadTimeMinutes,
            task.dueDate,
          );

          if (!delivered) {
            failed++;
            await db
              .update(taskReminderSentTable)
              .set({ status: "failed", updatedAt: new Date() })
              .where(eq(taskReminderSentTable.id, task.sentId));
            console.error(
              "Project webhook due date reminder was not delivered",
              {
                taskId: task.id,
                integrationId: integration.id,
                projectId: integration.projectId,
              },
            );
          } else {
            sent++;
            await db
              .update(taskReminderSentTable)
              .set({
                status: "sent",
                sentAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(taskReminderSentTable.id, task.sentId));
            console.log("Project webhook due date reminder sent", {
              taskId: task.id,
              integrationId: integration.id,
              projectId: integration.projectId,
            });
          }
        } catch (error) {
          failed++;
          degraded = true;
          await db
            .update(taskReminderSentTable)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(taskReminderSentTable.id, task.sentId));
          console.error("Failed to send project webhook due date reminder", {
            taskId: task.id,
            integrationId: integration.id,
            projectId: integration.projectId,
            error,
          });
        }
      }
    } catch (error) {
      degraded = true;
      console.error("Failed to process project webhook reminder", {
        integrationId: integration.id,
        projectId: integration.projectId,
        error,
      });
    }
  }

  console.log("Finished checking project webhook reminders", {
    sent,
    failed,
    degraded,
  });

  return { degraded };
}
