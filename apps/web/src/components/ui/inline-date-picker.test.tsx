import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineDatePicker } from "./inline-date-picker";

const { preferences } = vi.hoisted(() => ({
  preferences: { timeFormat: "24h" as "12h" | "24h" },
}));

vi.mock("@/store/user-preferences", () => ({
  useUserPreferencesStore: (selector: (state: typeof preferences) => unknown) =>
    selector(preferences),
}));

describe("InlineDatePicker", () => {
  it("displays and applies 12-hour times", () => {
    preferences.timeFormat = "12h";
    const onSelect = vi.fn();
    const selected = new Date(2026, 0, 2, 13, 5);

    render(
      <InlineDatePicker pickTime selected={selected} onSelect={onSelect} />,
    );

    const input = screen.getByPlaceholderText("hh:mm AM/PM");
    expect(input).toHaveValue("01:05 PM");

    fireEvent.change(input, { target: { value: "12:30 AM" } });

    const nextDate = onSelect.mock.lastCall?.[0] as Date;
    expect(nextDate.getHours()).toBe(0);
    expect(nextDate.getMinutes()).toBe(30);
  });

  it("displays and applies 24-hour times", () => {
    preferences.timeFormat = "24h";
    const onSelect = vi.fn();
    const selected = new Date(2026, 0, 2, 13, 5);

    render(
      <InlineDatePicker pickTime selected={selected} onSelect={onSelect} />,
    );

    const input = screen.getByPlaceholderText("HH:mm");
    expect(input).toHaveValue("13:05");

    fireEvent.change(input, { target: { value: "23:45" } });

    const nextDate = onSelect.mock.lastCall?.[0] as Date;
    expect(nextDate.getHours()).toBe(23);
    expect(nextDate.getMinutes()).toBe(45);
  });
});
