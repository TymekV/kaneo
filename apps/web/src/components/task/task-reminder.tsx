import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getReminderBounds,
  ReminderSelector,
  type ReminderUnit,
} from "@/components/reminder-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useUpdateTaskReminder } from "@/hooks/mutations/task/use-update-task-reminder";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type TaskReminderProps = {
  task: Task;
  children: React.ReactNode;
};

export type TaskReminderValue = {
  amount: number;
  enabled: boolean;
  unit: ReminderUnit;
};

export function taskReminderValueFromMinutes(
  leadTimeMinutes: number | null,
): TaskReminderValue {
  if (leadTimeMinutes === null) {
    return { amount: 1, enabled: false, unit: "days" };
  }
  if (leadTimeMinutes % 1440 === 0) {
    return { amount: leadTimeMinutes / 1440, enabled: true, unit: "days" };
  }
  if (leadTimeMinutes % 60 === 0) {
    return { amount: leadTimeMinutes / 60, enabled: true, unit: "hours" };
  }
  return { amount: leadTimeMinutes, enabled: true, unit: "minutes" };
}

function taskReminderMinutes({
  amount,
  enabled,
  unit,
}: TaskReminderValue): number | null {
  if (!enabled) return null;
  return amount * (unit === "days" ? 1440 : unit === "hours" ? 60 : 1);
}

export default function TaskReminder({ task, children }: TaskReminderProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const reminder = taskReminderValueFromMinutes(
    task.reminderLeadTimeMinutes ?? null,
  );
  const [draft, setDraft] = useState(reminder);
  const { mutateAsync: updateReminder, isPending } = useUpdateTaskReminder();
  const { canUpdateTasks } = useWorkspacePermission();
  const canEdit = canUpdateTasks();
  const { min, max } = getReminderBounds(draft.unit);
  const isValid =
    Number.isInteger(draft.amount) &&
    draft.amount >= min &&
    draft.amount <= max;
  const selectorId = `task-reminder-${task.id}`;
  const enabledId = `task-reminder-enabled-${task.id}`;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraft(reminder);
    setOpen(nextOpen);
  };

  const handleSave = async () => {
    if (draft.enabled && !isValid) return;
    try {
      await updateReminder({
        taskId: task.id,
        projectId: task.projectId,
        leadTimeMinutes: taskReminderMinutes(draft),
      });
      setOpen(false);
      toast.success(t("tasks:reminder.updateSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:reminder.updateError"),
      );
    }
  };

  if (!canEdit) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4">
        <div className="flex flex-col gap-4">
          {!task.userId && (
            <Alert variant="warning" className="rounded-md">
              <TriangleAlert />
              <AlertDescription>
                {t("tasks:reminder.unassignedWarning")}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor={enabledId}>
                {t("tasks:reminder.enabledLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("tasks:reminder.enabledDescription")}
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              id={enabledId}
              onCheckedChange={(enabled) =>
                setDraft((current) => ({ ...current, enabled }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={selectorId}>{t("tasks:reminder.label")}</Label>
            <ReminderSelector
              amount={draft.amount}
              disabled={!draft.enabled}
              id={selectorId}
              onAmountChange={(amount) =>
                setDraft((current) => ({ ...current, amount }))
              }
              onUnitChange={(unit) =>
                setDraft((current) => ({ ...current, unit }))
              }
              onConfirm={handleSave}
              unit={draft.unit}
            />
            {draft.enabled && !isValid && (
              <p className="text-xs text-destructive">
                {t("tasks:reminder.invalid", { min, max })}
              </p>
            )}
          </div>
          <Button
            disabled={draft.enabled && !isValid}
            loading={isPending}
            onClick={handleSave}
            size="sm"
            type="button"
          >
            {t("tasks:reminder.done")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
