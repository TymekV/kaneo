import { format, setHours, setMinutes } from "date-fns";
import { Clock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { ContextMenuItem, ContextMenuSeparator } from "./context-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";

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
  pickTime?: boolean;
  confirmShown?: boolean;
  onConfirm?: () => void;
};

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function InlineDatePicker({
  selected,
  onSelect,
  clearLabel,
  clearShown = "auto",
  onClear,
  context = "popover",
  pickTime = false,
  confirmShown = false,
  onConfirm,
  className,
  ...props
}: InlineDatePickerProps) {
  // https://daypicker.dev/guides/timepicker
  const [timeValue, setTimeValue] = useState(
    selected ? format(selected, "HH:mm") : "00:00",
  );
  const isValidTime = TIME_RE.test(timeValue);

  // Marks that the *next* `selected` update was caused by this field's own
  // onSelect call, so the sync effect below shouldn't stomp on what the
  // user is mid-typing (e.g. reformat "4:30" -> "04:30" and yank the caret).
  const selfUpdate = useRef(false);

  useEffect(() => {
    if (selected === undefined) {
      setTimeValue("00:00");
    }
  }, [selected]);

  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    if (selected) setTimeValue(format(selected, "HH:mm"));
  }, [selected]);

  const applyTime = useCallback((time: string, date: Date | undefined) => {
    if (!date || !TIME_RE.test(time)) return date;
    const [hours, minutes] = time.split(":").map(Number);
    return setHours(setMinutes(date, minutes), hours);
  }, []);

  const handleTimeChange = useCallback(
    (time: string) => {
      setTimeValue(time);
      if (selected && TIME_RE.test(time)) {
        selfUpdate.current = true;
        onSelect(applyTime(time, selected));
      }
      // invalid/partial input: keep it in the field, don't touch `selected`
    },
    [selected, onSelect, applyTime],
  );

  const handleDaySelect = useCallback(
    (date: Date | undefined) => {
      onSelect(applyTime(timeValue, date));
    },
    [onSelect, timeValue, applyTime],
  );

  const handleBlur = useCallback(() => {
    // snap back to the last valid time rather than leaving garbage in the field
    if (!isValidTime && selected) {
      setTimeValue(format(selected, "HH:mm"));
    }
  }, [isValidTime, selected]);

  const save = useCallback(() => {
    if (isValidTime) onConfirm?.();
  }, [isValidTime, onConfirm]);

  return (
    <>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={handleDaySelect}
        defaultMonth={selected}
        className={cn(
          "bg-popover",
          context === "context-menu" && "p-2",
          className,
        )}
        {...props}
      />
      <div className="flex flex-col">
        {pickTime && (
          <InputGroup className="mt-2 w-70 sm:w-63">
            <InputGroupAddon>
              <Clock
                className={cn(
                  "text-muted-foreground",
                  !isValidTime && "text-destructive",
                )}
              />
            </InputGroupAddon>
            <InputGroupInput
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              aria-invalid={!isValidTime || undefined}
              placeholder="HH:mm"
              className={cn(
                "appearance-none bg-background",
                !isValidTime &&
                  "border-destructive text-destructive ring-destructive",
              )}
            />
          </InputGroup>
        )}
        {confirmShown && (
          <Button
            className="mt-2 w-full"
            onClick={save}
            disabled={!isValidTime}
          >
            Done
          </Button>
        )}
      </div>
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
