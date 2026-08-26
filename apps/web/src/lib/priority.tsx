import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  CircleAlert,
  Minus,
} from "lucide-react";
import { cn } from "./cn";

export function getPriorityIcon(priority: string, className?: string) {
  switch (priority) {
    case "urgent":
      return (
        <CircleAlert
          className={cn(
            "h-[12px] w-[12px] text-destructive-foreground",
            className,
          )}
        />
      );
    case "high":
      return (
        <ChevronsUp
          className={cn("h-[12px] w-[12px] text-warning-foreground", className)}
        />
      );
    case "medium":
      return (
        <ChevronUp
          className={cn(
            "h-[12px] w-[12px] text-warning-foreground/80",
            className,
          )}
        />
      );
    case "low":
      return (
        <ChevronDown
          className={cn("h-[12px] w-[12px] text-info-foreground/85", className)}
        />
      );
    case "no-priority":
      return (
        <Minus
          className={cn("h-[12px] w-[12px] text-muted-foreground", className)}
        />
      );
    default:
      return (
        <Minus
          className={cn("h-[12px] w-[12px] text-muted-foreground", className)}
        />
      );
  }
}
