import { afterEach, describe, expect, it } from "vitest";
import {
  ensureSettingsPeriods,
  findFirstMissingSettingsDate,
  clearEntry,
  defaultSettings,
  loadSettingsPeriods,
  isoDate,
  loadEntry,
  loadSettings,
  mergeSettingsPeriods,
  mergeSettings,
  resolveSettingsForDate,
  saveEntry,
  saveSettings,
  saveSettingsPeriods,
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
      monthOvertimeTargetMin: 0,
      breakMin: 30,
      showHolidays: false,
    });

    expect(merged.dayHours).toBe(defaultSettings().dayHours);
    expect(merged.dayStart).toBe(defaultSettings().dayStart);
    expect(merged.timeStepMin).toBe(defaultSettings().timeStepMin);
    expect(merged.hourDisplay).toBe(defaultSettings().hourDisplay);
    expect(merged.monthOvertimeTargetMin).toBe(0);
    expect(merged.breakMin).toBe(30);
    expect(merged.showHolidays).toBe(false);
  });

  it("設定を保存してマージ済み設定として読み込む", () => {
    const settings: Settings = { ...defaultSettings(), lang: "en", dark: true, hourDisplay: "decimal" };
    saveSettings(settings);

    expect(loadSettings()).toMatchObject({ lang: "en", dark: true, hourDisplay: "decimal" });
  });

  it("有効期間付き設定を保存して読み込む", () => {
    saveSettingsPeriods([
      {
        effectiveFrom: null,
        effectiveTo: "2026-04-30",
        overrides: { dayHours: 7.5, dayStart: "08:30", breakMin: 45 },
      },
    ]);

    expect(loadSettingsPeriods()).toEqual([
      {
        effectiveFrom: null,
        effectiveTo: "2026-04-30",
        overrides: { dayHours: 7.5, dayStart: "08:30", breakMin: 45 },
      },
    ]);
  });

  it("対象日の設定を有効期間から解決する", () => {
    const settings = defaultSettings();
    const periods = mergeSettingsPeriods([
      {
        effectiveFrom: null,
        effectiveTo: "2026-04-30",
        overrides: { dayHours: 7.5, dayStart: "08:30", breakMin: 45 },
      },
    ]);

    expect(resolveSettingsForDate(settings, periods, "2026-04-12")).toMatchObject({
      dayHours: 7.5,
      dayStart: "08:30",
      breakMin: 45,
    });
    expect(resolveSettingsForDate(settings, periods, "2026-05-01")).toBeNull();
  });

  it("期間が空なら全期間の初期設定を自動作成する", () => {
    expect(ensureSettingsPeriods(defaultSettings(), [])).toEqual([
      expect.objectContaining({
        effectiveFrom: null,
        effectiveTo: null,
        overrides: expect.objectContaining({
          dayHours: 8,
          dayStart: "09:00",
          breakMin: 60,
          timeStepMin: 15,
        }),
      }),
    ]);
  });

  it("未設定期間の先頭日を検出する", () => {
    const missing = findFirstMissingSettingsDate([
      { effectiveFrom: null, effectiveTo: "2026-03-31", overrides: { dayHours: 8 } },
      { effectiveFrom: "2026-05-01", effectiveTo: null, overrides: { dayHours: 7.5 } },
    ], "2026-01-01", "2026-12-31");

    expect(missing).toBe("2026-04-01");
  });
});
