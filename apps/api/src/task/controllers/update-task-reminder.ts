import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskReminderSentTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function updateTaskReminder({
  id,
  leadTimeMinutes,
  currentUserId,
}: {
  id: string;
  leadTimeMinutes: number | null;
  currentUserId: string;
}) {
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, id),
  });

  if (!existingTask) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  if (existingTask.reminderLeadTimeMinutes === leadTimeMinutes) {
    return existingTask;
  }

  const updatedTask = await db.transaction(async (tx) => {
    const [task] = await tx
      .update(taskTable)
      .set({ reminderLeadTimeMinutes: leadTimeMinutes })
      .where(eq(taskTable.id, id))
      .returning();

    if (!task) {
      throw new HTTPException(500, {
        message: "Failed to update task reminder",
      });
    }

    await tx
      .delete(taskReminderSentTable)
      .where(
        and(
          eq(taskReminderSentTable.taskId, id),
          eq(taskReminderSentTable.reminderType, "configured_before"),
        ),
      );

    return task;
  });

  await publishEvent("task.reminder_changed", {
    taskId: updatedTask.id,
    projectId: updatedTask.projectId,
    userId: currentUserId,
    type: "reminder_changed",
  });

  return updatedTask;
}

export default updateTaskReminder;
