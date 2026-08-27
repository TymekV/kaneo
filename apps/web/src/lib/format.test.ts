import { describe, expect, it, vi } from "vitest";
import { formatDateTimeShort } from "./format";

const { preferences } = vi.hoisted(() => ({
  preferences: { timeFormat: "24h" as "12h" | "24h" },
}));

vi.mock("@/store/user-preferences", () => ({
  useUserPreferencesStore: {
    getState: () => preferences,
  },
}));

describe("formatDateTimeShort", () => {
  it("uses the 12-hour time preference", () => {
    preferences.timeFormat = "12h";
    const value = new Date(2026, 0, 2, 13, 5);

    expect(formatDateTimeShort(value, "en-US")).toBe(
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h12",
      }).format(value),
    );
  });

  it("uses the 24-hour time preference", () => {
    preferences.timeFormat = "24h";
    const value = new Date(2026, 0, 2, 13, 5);

    expect(formatDateTimeShort(value, "en-US")).toBe(
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(value),
    );
  });
});
