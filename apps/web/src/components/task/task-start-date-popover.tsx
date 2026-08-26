import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTask } from "@/hooks/mutations/task/use-update-task";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import { InlineDatePicker } from "../ui/inline-date-picker";

type TaskStartDatePopoverProps = {
  task: Task;
  children: React.ReactNode;
};

export default function TaskStartDatePopover({
  task,
  children,
}: TaskStartDatePopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateTask } = useUpdateTask();
  const { canUpdateTasks } = useWorkspacePermission();
  const canEdit = canUpdateTasks();

  const handleDateChange = async (date: Date | undefined) => {
    try {
      await updateTask({
        ...task,
        startDate: date?.toISOString() || null,
      });
      toast.success(t("tasks:popover.startDate.updateSuccess"));
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.startDate.updateError"),
      );
    }
  };

  if (!canEdit) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <InlineDatePicker
          selected={task.startDate ? new Date(task.startDate) : undefined}
          onSelect={handleDateChange}
          disabled={
            task.dueDate ? { after: new Date(task.dueDate) } : undefined
          }
          clearLabel={t("tasks:popover.startDate.clear")}
        />
      </PopoverContent>
    </Popover>
  );
}
