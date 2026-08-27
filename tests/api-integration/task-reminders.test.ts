import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { checkDueDateReminders } from "../../apps/api/src/scheduler/due-date-reminders";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

describe("API integration: task reminders", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("sends configured reminders only for tasks with a per-task lead time", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const dueDate = new Date(Date.now() + 10 * 60 * 1000);

    const [enabledTask, disabledTask] = await db
      .insert(schema.taskTable)
      .values([
        {
          projectId: project.id,
          userId: member.user.id,
          title: "Reminder enabled",
          status: "to-do",
          columnId: columns.todo.id,
          priority: "medium",
          dueDate,
          reminderLeadTimeMinutes: 10,
        },
        {
          projectId: project.id,
          userId: member.user.id,
          title: "Reminder disabled",
          status: "to-do",
          columnId: columns.todo.id,
          priority: "medium",
          dueDate,
          reminderLeadTimeMinutes: null,
        },
      ])
      .returning();

    await checkDueDateReminders();

    const notifications = await db.query.notificationTable.findMany({
      where: eq(schema.notificationTable.type, "due_date_reminder"),
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.resourceId).toBe(enabledTask.id);
    expect(notifications[0]?.resourceId).not.toBe(disabledTask.id);
  });
});
