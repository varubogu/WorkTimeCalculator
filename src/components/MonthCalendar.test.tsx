import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import I18N from "../i18n";
import type { DayData } from "../types";
import MonthCalendar from "./MonthCalendar";

function makeDay(overrides: Partial<DayData> = {}): DayData {
  return {
    d: 1,
    date: new Date(2026, 3, 1),
    dow: 3,
    kind: "reg",
    hrs: 8,
    isHoliday: false,
    isWorking: true,
    isToday: false,
    dateStr: "2026-04-01",
    entry: { start: "09:00", end: "18:00", brk: 60, vac: false },
    ...overrides,
  };
}

describe("MonthCalendar", () => {
  it("勤務時間とアクセシブルな日付セルを表示する", () => {
    render(<MonthCalendar year={2026} month={3} data={[makeDay()]} t={I18N.ja} />);

    expect(screen.getByRole("button", { name: "2026-04-01 記録を追加" })).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
  });

  it("日付セルのクリックを通知する", () => {
    const onDayClick = vi.fn();
    render(<MonthCalendar year={2026} month={3} data={[makeDay()]} t={I18N.ja} onDayClick={onDayClick} />);

    screen.getByRole("button", { name: "2026-04-01 記録を追加" }).click();

    expect(onDayClick).toHaveBeenCalledWith(expect.objectContaining({ dateStr: "2026-04-01" }));
  });
});
