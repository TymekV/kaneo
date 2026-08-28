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
  taskReminderSentTable,
  taskTable,
  userNotificationPreferenceTable,
} from "../database/schema";
import createNotification from "../notification/controllers/create-notification";
import { REMINDER_WINDOW_MINUTES } from "./reminder-timing";

type ReminderType = "configured_before" | "overdue";

const MINUTE_MS = 60 * 1000;
const CLAIM_BATCH_SIZE = 100;
const STALE_CLAIM_MINUTES = 5;

function buildWindows(now: Date) {
  const nowMs = now.getTime();

  return {
    upcoming: {
      start: new Date(nowMs - REMINDER_WINDOW_MINUTES * MINUTE_MS),
      end: now,
      type: "configured_before" as ReminderType,
      notificationType: "due_date_reminder" as const,
    },
    overdue: {
      end: now,
      start: new Date(nowMs - 10 * MINUTE_MS),
      type: "overdue" as ReminderType,
      notificationType: "task_overdue" as const,
    },
  };
}

async function claimTasksNeedingReminder(
  windowStart: Date,
  windowEnd: Date,
  reminderType: ReminderType,
) {
  return db.transaction(async (tx) => {
    const staleAt = new Date(Date.now() - STALE_CLAIM_MINUTES * MINUTE_MS);
    const results = await tx
      .select({
        id: taskTable.id,
        title: taskTable.title,
        userId: taskTable.userId,
        dueDate: taskTable.dueDate,
        projectId: taskTable.projectId,
        leadTimeMinutes: taskTable.reminderLeadTimeMinutes,
        sentId: taskReminderSentTable.id,
      })
      .from(taskTable)
      .leftJoin(columnTable, eq(taskTable.columnId, columnTable.id))
      .leftJoin(
        userNotificationPreferenceTable,
        eq(userNotificationPreferenceTable.userId, taskTable.userId),
      )
      .leftJoin(
        taskReminderSentTable,
        and(
          eq(taskReminderSentTable.taskId, taskTable.id),
          eq(taskReminderSentTable.reminderType, reminderType),
        ),
      )
      .where(
        and(
          isNotNull(taskTable.userId),
          isNotNull(taskTable.dueDate),
          reminderType === "configured_before"
            ? and(
                isNotNull(taskTable.reminderLeadTimeMinutes),
                sql`${taskTable.dueDate} - (${taskTable.reminderLeadTimeMinutes} * interval '1 minute') BETWEEN ${windowStart.toISOString()} AND ${windowEnd.toISOString()}`,
              )
            : between(taskTable.dueDate, windowStart, windowEnd),
          or(
            isNull(taskReminderSentTable.id),
            eq(taskReminderSentTable.status, "failed"),
            and(
              eq(taskReminderSentTable.status, "sending"),
              lte(taskReminderSentTable.updatedAt, staleAt),
            ),
          ),
          or(
            isNull(userNotificationPreferenceTable.id),
            eq(userNotificationPreferenceTable.dueDateReminderEnabled, true),
          ),
          // Exclude tasks in final columns (completed); include tasks with no column
          or(isNull(columnTable.isFinal), eq(columnTable.isFinal, false)),
        ),
      )
      .orderBy(asc(taskTable.dueDate))
      .limit(CLAIM_BATCH_SIZE)
      .for("update", { of: taskTable, skipLocked: true });

    const claimed = [];
    for (const task of results) {
      const values = {
        status: "sending",
        sentAt: null,
        attempts: sql`${taskReminderSentTable.attempts} + 1`,
        updatedAt: new Date(),
      };
      if (task.sentId) {
        console.log("Reclaiming failed/stale reminder for retry", {
          taskId: task.id,
          reminderType,
          sentId: task.sentId,
        });
        await tx
          .update(taskReminderSentTable)
          .set(values)
          .where(eq(taskReminderSentTable.id, task.sentId));
        claimed.push({ ...task, sentId: task.sentId });
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
        if (record) claimed.push({ ...task, sentId: record.id });
      }
    }
    return claimed;
  });
}

async function processReminder(
  task: {
    id: string;
    title: string;
    userId: string | null;
    dueDate: Date | null;
    projectId: string;
    leadTimeMinutes: number | null;
    sentId: string;
  },
  reminderType: ReminderType,
  notificationType: "due_date_reminder" | "task_overdue",
) {
  if (!task.userId) {
    // Defensive: the claim query already filters isNotNull(userId), so this
    // should be unreachable. Still, mark the claim as failed rather than
    // leaving it stuck in "sending" forever if it is ever hit.
    console.error("Reminder claimed without a userId, marking as failed", {
      taskId: task.id,
      sentId: task.sentId,
      reminderType,
    });
    await db
      .update(taskReminderSentTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(taskReminderSentTable.id, task.sentId));
    return;
  }

  console.log("Sending due date reminder", {
    taskId: task.id,
    userId: task.userId,
    reminderType,
    notificationType,
    dueDate: task.dueDate?.toISOString() ?? null,
  });

  try {
    const notification = await createNotification({
      userId: task.userId,
      type: notificationType,
      eventData: {
        taskTitle: task.title,
        reminderType,
        leadTimeMinutes: task.leadTimeMinutes,
        dueDate: task.dueDate?.toISOString() ?? null,
      },
      resourceId: task.id,
      resourceType: "task",
    });
    await db
      .update(taskReminderSentTable)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(taskReminderSentTable.id, task.sentId));
    console.log("Due date reminder sent", {
      taskId: task.id,
      userId: task.userId,
      reminderType,
      notificationId: notification?.id ?? null,
      skippedByPreference: notification === null,
    });
  } catch (error) {
    await db
      .update(taskReminderSentTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(taskReminderSentTable.id, task.sentId));
    console.error("Failed to send due date reminder", {
      taskId: task.id,
      userId: task.userId,
      reminderType,
      error,
    });
    throw error;
  }
}

export async function checkDueDateReminders(): Promise<{ degraded: boolean }> {
  const now = new Date();
  const windows = buildWindows(now);
  let degraded = false;
  let sent = 0;
  let failed = 0;

  console.log("Checking due date reminders", { now: now.toISOString() });

  for (const window of Object.values(windows)) {
    try {
      const tasks = await claimTasksNeedingReminder(
        window.start,
        window.end,
        window.type,
      );

      console.log("Claimed tasks for reminder window", {
        reminderType: window.type,
        windowStart: window.start.toISOString(),
        windowEnd: window.end.toISOString(),
        claimedCount: tasks.length,
      });

      for (const task of tasks) {
        try {
          await processReminder(task, window.type, window.notificationType);
          sent++;
        } catch (error) {
          degraded = true;
          failed++;
          console.error("Failed to process due date reminder", {
            taskId: task.id,
            reminderType: window.type,
            error,
          });
        }
      }
    } catch (error) {
      degraded = true;
      console.error("Failed to query tasks for due date reminders", {
        reminderType: window.type,
        error,
      });
    }
  }

  console.log("Finished checking due date reminders", {
    sent,
    failed,
    degraded,
  });

  return { degraded };
}
