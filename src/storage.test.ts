import { afterEach, describe, expect, it } from "vitest";
import {
  clearEntry,
  defaultSettings,
  isoDate,
  loadEntry,
  loadSettings,
  mergeSettings,
  saveEntry,
  saveSettings,
} from "./storage";
import type { Settings } from "./types";

afterEach(() => {
  localStorage.clear();
});

describe("storage helpers", () => {
  it("日付を localStorage キー用の ISO 文字列にする", () => {
    expect(isoDate(2026, 0, 5)).toBe("2026-01-05");
  });

  it("勤務記録を保存、読み込み、削除する", () => {
    saveEntry("2026-04-01", { start: "09:00", end: "18:00", brk: 60, vac: false });

    expect(loadEntry("2026-04-01", 45)).toEqual({
      start: "09:00",
      end: "18:00",
      brk: 60,
      vac: false,
    });

    clearEntry("2026-04-01");
    expect(loadEntry("2026-04-01", 45)).toEqual({
      start: "",
      end: "",
      brk: 45,
      vac: false,
    });
  });

  it("壊れた設定値をデフォルトで補完する", () => {
    const merged = mergeSettings({
      dayHours: -1,
      dayStart: "25:00",
      timeStepMin: 999,
      breakMin: 30,
      showHolidays: false,
    });

    expect(merged.dayHours).toBe(defaultSettings().dayHours);
    expect(merged.dayStart).toBe(defaultSettings().dayStart);
    expect(merged.timeStepMin).toBe(defaultSettings().timeStepMin);
    expect(merged.breakMin).toBe(30);
    expect(merged.showHolidays).toBe(false);
  });

  it("設定を保存してマージ済み設定として読み込む", () => {
    const settings: Settings = { ...defaultSettings(), lang: "en", dark: true };
    saveSettings(settings);

    expect(loadSettings()).toMatchObject({ lang: "en", dark: true });
  });
});
