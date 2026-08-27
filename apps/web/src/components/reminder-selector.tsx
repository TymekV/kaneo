import { useTranslation } from "react-i18next";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReminderUnit = "minutes" | "hours" | "days";

const reminderUnits: ReminderUnit[] = ["minutes", "hours", "days"];

function isReminderUnit(value: unknown): value is ReminderUnit {
  return value === "minutes" || value === "hours" || value === "days";
}

export function getReminderBounds(unit: ReminderUnit) {
  return unit === "minutes"
    ? { min: 5, max: 43_200 }
    : { min: 1, max: unit === "days" ? 30 : 720 };
}

type ReminderSelectorProps = {
  amount: number;
  disabled?: boolean;
  id: string;
  onAmountChange: (amount: number) => void;
  onUnitChange: (unit: ReminderUnit) => void;
  unit: ReminderUnit;
  onConfirm?: () => void;
};

export function ReminderSelector({
  amount,
  disabled = false,
  id,
  onAmountChange,
  onUnitChange,
  onConfirm,
  unit,
}: ReminderSelectorProps) {
  const { t } = useTranslation();
  const { min, max } = getReminderBounds(unit);
  const getUnitLabel = (value: ReminderUnit) => {
    if (value === "minutes") {
      return t("settings:notificationsPage.reminderLeadTimeUnitMinutes");
    }
    return value === "days"
      ? t("settings:notificationsPage.reminderLeadTimeUnitDays")
      : t("settings:notificationsPage.reminderLeadTimeUnitHours");
  };

  return (
    <div className="flex gap-2">
      <NumberField
        className="w-36"
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onValueChange={(value) => onAmountChange(value ?? 0)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirm?.();
          }
        }}
        step={1}
        value={amount}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <Select
        disabled={disabled}
        items={reminderUnits}
        onValueChange={(value) => {
          if (isReminderUnit(value)) onUnitChange(value);
        }}
        value={unit}
      >
        <SelectTrigger
          aria-label={t("tasks:reminder.unitLabel")}
          className="w-32"
        >
          <SelectValue>{getUnitLabel(unit)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {reminderUnits.map((option) => (
            <SelectItem key={option} value={option}>
              {getUnitLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
