import { describe, expect, it } from "vitest";
import { addMinutesToTime, fmtH, netMinutes, overtimeHoursForDay, timeToMinutes } from "./utils";
import type { DayData } from "./types";

describe("time utilities", () => {
  it("HH:MM を分に変換する", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("0:05")).toBe(5);
  });

  it("不正な時刻を null にする", () => {
    expect(timeToMinutes("24:00")).toBeNull();
    expect(timeToMinutes("12:60")).toBeNull();
    expect(timeToMinutes("abc")).toBeNull();
  });

  it("休憩を差し引いた勤務分を計算する", () => {
    expect(netMinutes("09:00", "18:00", 60)).toBe(480);
    expect(netMinutes("09:00", "09:30", 60)).toBe(0);
  });

  it("終了が開始以前の場合は null にする", () => {
    expect(netMinutes("18:00", "09:00", 60)).toBeNull();
    expect(netMinutes("09:00", "09:00", 0)).toBeNull();
  });

  it("開始時刻へ分を加算して HH:MM を返す", () => {
    expect(addMinutesToTime("09:00", 540)).toBe("18:00");
    expect(addMinutesToTime("23:30", 60)).toBeNull();
  });

  it("小数時間を表示用文字列にする", () => {
    expect(fmtH(8)).toBe("8:00");
    expect(fmtH(7.5)).toBe("7:30");
    expect(fmtH(7.5, "decimal")).toBe("7.50h");
    expect(fmtH(null)).toBe("—");
  });

  it("残業時間は平日の超過分と休日勤務を集計する", () => {
    const weekday: DayData = {
      d: 1,
      date: new Date("2026-04-01"),
      dow: 3,
      kind: "ot",
      hrs: 9.5,
      isHoliday: false,
      isWorking: true,
      isToday: false,
      dateStr: "2026-04-01",
      entry: { start: "09:00", end: "19:30", brk: 60, vac: false },
    };
    const weekend: DayData = {
      ...weekday,
      d: 4,
      date: new Date("2026-04-04"),
      dow: 6,
      kind: "wknd",
      hrs: 6,
      isWorking: false,
      dateStr: "2026-04-04",
      entry: { start: "10:00", end: "17:00", brk: 60, vac: false },
    };

    expect(overtimeHoursForDay(weekday, 8)).toBe(1.5);
    expect(overtimeHoursForDay(weekend, 8)).toBe(6);
  });
});
