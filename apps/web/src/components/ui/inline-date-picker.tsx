import { format, setHours, setMinutes } from "date-fns";
import { X } from "lucide-react";
import {
  type ChangeEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { ContextMenuItem, ContextMenuSeparator } from "./context-menu";

export type InlineDatePickerProps = Omit<
  React.ComponentProps<typeof Calendar>,
  "mode" | "selected" | "onSelect" | "required"
> & {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  clearLabel?: string;
  clearShown?: boolean | "auto";
  onClear?: () => void;
  context?: "popover" | "context-menu";
};

export function InlineDatePicker({
  selected,
  onSelect,
  clearLabel,
  clearShown = "auto",
  onClear,
  context = "popover",
  className,
  ...props
}: InlineDatePickerProps) {
  // https://daypicker.dev/guides/timepicker
  const [timeValue, setTimeValue] = useState<string>("00:00");

  useEffect(() => {
    if (selected) {
      setTimeValue(format(selected, "HH:mm"));
    }
  }, [selected]);

  const handleTimeChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const time = e.target.value;
      if (!selected) {
        // Defer composing a full Date until a day is picked.
        setTimeValue(time);
        return;
      }
      const [hours, minutes] = time
        .split(":")
        .map((str) => Number.parseInt(str, 10));
      // Compose a new Date using the current day plus the chosen time.
      const newSelectedDate = setHours(setMinutes(selected, minutes), hours);
      onSelect(newSelectedDate);
      setTimeValue(time);
    },
    [onSelect, selected],
  );

  const handleDaySelect = useCallback(
    (date: Date | undefined) => {
      if (!timeValue || !date) {
        onSelect(date);
        return;
      }
      const [hours, minutes] = timeValue
        .split(":")
        .map((str) => Number.parseInt(str, 10));
      const newDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
      );
      onSelect(newDate);
    },
    [onSelect, timeValue],
  );

  return (
    <>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={handleDaySelect}
        className={cn(
          "w-full bg-popover",
          context === "context-menu" && "p-2",
          className,
        )}
        {...props}
      />
      {(clearShown === "auto" ? !!selected : clearShown) &&
        (context === "popover" ? (
          <div className="pt-2 mt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={onClear ?? (() => onSelect(undefined))}
            >
              <X className="h-4 w-4" />
              {clearLabel}
            </Button>
          </div>
        ) : (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="gap-2 text-muted-foreground"
              onClick={onClear ?? (() => onSelect(undefined))}
            >
              <X className="h-4 w-4" />
              <span>{clearLabel}</span>
            </ContextMenuItem>
          </>
        ))}
    </>
  );
}
