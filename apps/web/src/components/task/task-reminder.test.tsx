import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import type Task from "@/types/task";
import TaskReminder, { type TaskReminderValue } from "./task-reminder";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: () => true }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const task: Task = {
  id: "task-1",
  title: "Reminder task",
  number: 1,
  description: null,
  status: "to-do",
  priority: null,
  startDate: null,
  dueDate: "2026-09-01T12:00:00.000Z",
  position: 1,
  createdAt: "2026-08-27T00:00:00.000Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
  projectId: "project-1",
};

const reminder: TaskReminderValue = {
  amount: 1,
  enabled: true,
  unit: "days",
};

describe("TaskReminder", () => {
  it("commits the draft reminder only after Done is clicked", async () => {
    const onReminderChange = vi.fn();
    render(
      <TaskReminder
        onReminderChange={onReminderChange}
        reminder={reminder}
        task={task}
      >
        <Button>Open reminder</Button>
      </TaskReminder>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open reminder" }));

    const enabledSwitch = await screen.findByRole("switch", {
      name: "tasks:reminder.enabledLabel",
    });
    fireEvent.click(enabledSwitch);

    expect(enabledSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByLabelText("tasks:reminder.label"),
    ).toBeDisabled();
    expect(onReminderChange).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "tasks:reminder.done" }),
    );

    expect(onReminderChange).toHaveBeenCalledWith({
      ...reminder,
      enabled: false,
    });
  });
});
