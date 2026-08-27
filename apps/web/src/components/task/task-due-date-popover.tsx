import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTaskDueDate } from "@/hooks/mutations/task/use-update-task-due-date";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import { InlineDatePicker } from "../ui/inline-date-picker";

type TaskDueDatePopoverProps = {
  task: Task;
  children: React.ReactNode;
};

export default function TaskDueDatePopover({
  task,
  children,
}: TaskDueDatePopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateTaskDueDate } = useUpdateTaskDueDate();
  const { canUpdateTasks } = useWorkspacePermission();
  const canEdit = canUpdateTasks();
  const [date, setDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setDate(task.dueDate ? new Date(task.dueDate) : undefined);
  }, [task.dueDate]);

  const handleSave = useCallback(async () => {
    try {
      await updateTaskDueDate({
        ...task,
        dueDate: date?.toISOString() || null,
      });
      toast.success(t("tasks:popover.dueDate.updateSuccess"));
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.dueDate.updateError"),
      );
    }
  }, [task, date, updateTaskDueDate, t]);

  if (!canEdit) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <InlineDatePicker
          selected={date}
          onSelect={setDate}
          disabled={
            task.startDate ? { before: new Date(task.startDate) } : undefined
          }
          pickTime
          confirmShown
          onConfirm={handleSave}
          clearLabel={t("tasks:popover.dueDate.clear")}
        />
      </PopoverContent>
    </Popover>
  );
}
