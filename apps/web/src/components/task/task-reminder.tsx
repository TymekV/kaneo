import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getReminderBounds,
  ReminderSelector,
  type ReminderUnit,
} from "@/components/reminder-selector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import type Task from "@/types/task";

type TaskReminderProps = {
  task: Task;
  children: React.ReactNode;
  reminder: TaskReminderValue;
  onReminderChange: (reminder: TaskReminderValue) => void;
};

export type TaskReminderValue = {
  amount: number;
  enabled: boolean;
  unit: ReminderUnit;
};

export default function TaskReminder({
  task,
  children,
  reminder,
  onReminderChange,
}: TaskReminderProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { canUpdateTasks } = useWorkspacePermission();
  const canEdit = canUpdateTasks();
  const { min, max } = getReminderBounds(reminder.unit);
  const isValid =
    Number.isInteger(reminder.amount) &&
    reminder.amount >= min &&
    reminder.amount <= max;
  const selectorId = `task-reminder-${task.id}`;
  const enabledId = `task-reminder-enabled-${task.id}`;

  if (!canEdit) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4">
        <div className="flex flex-col gap-4">
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
              checked={reminder.enabled}
              id={enabledId}
              onCheckedChange={(enabled) =>
                onReminderChange({ ...reminder, enabled })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={selectorId}>{t("tasks:reminder.label")}</Label>
            <ReminderSelector
              amount={reminder.amount}
              disabled={!reminder.enabled}
              id={selectorId}
              onAmountChange={(amount) =>
                onReminderChange({ ...reminder, amount })
              }
              onUnitChange={(unit) => onReminderChange({ ...reminder, unit })}
              unit={reminder.unit}
            />
            {reminder.enabled && !isValid && (
              <p className="text-xs text-destructive">
                {t("tasks:reminder.invalid", { min, max })}
              </p>
            )}
          </div>
          <Button
            disabled={reminder.enabled && !isValid}
            onClick={() => setOpen(false)}
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
