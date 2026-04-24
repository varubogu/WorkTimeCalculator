import { describe, expect, it } from "vitest";
import {
  createSettingsFile,
  createWorkEntriesFile,
  parseSettingsText,
  parseWorkEntriesCsv,
  parseWorkEntriesText,
  serializeSettingsFile,
  serializeWorkEntriesCsv,
  serializeWorkEntriesFile,
} from "./fileFormats";
import { defaultSettings } from "./storage";

describe("file formats", () => {
  it("作業時間JSONを往復できる", () => {
    const file = createWorkEntriesFile({
      "2026-04-01": { start: "09:00", end: "18:00", brk: 60, vac: false },
    });

    const parsed = parseWorkEntriesText(serializeWorkEntriesFile(file, "json"), "json");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.entries[0]).toEqual({
        date: "2026-04-01",
        start: "09:00",
        end: "18:00",
        breakMin: 60,
        vacation: false,
      });
    }
  });

  it("作業時間YAMLを往復できる", () => {
    const file = createWorkEntriesFile({
      "2026-04-01": { start: "09:00", end: "18:00", brk: 60, vac: false },
      "2026-04-02": { start: "", end: "", brk: 60, vac: true },
    });

    const parsed = parseWorkEntriesText(serializeWorkEntriesFile(file, "yaml"), "yaml");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.entries).toHaveLength(2);
      expect(parsed.value.entries[1].vacation).toBe(true);
    }
  });

  it("作業時間CSVを検証付きで読み込める", () => {
    const csv = serializeWorkEntriesCsv({
      "2026-04-01": { start: "09:00", end: "18:00", brk: 60, vac: false },
    });

    const parsed = parseWorkEntriesCsv(csv);
    expect(parsed.ok).toBe(true);
  });

  it("設定YAMLを往復できる", () => {
    const file = createSettingsFile(defaultSettings(), [
      {
        effectiveFrom: null,
        effectiveTo: "2026-04-30",
        overrides: { dayHours: 7.5, dayStart: "08:30", breakMin: 45 },
      },
    ]);

    const parsed = parseSettingsText(serializeSettingsFile(file, "yaml"), "yaml");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.periods[0].overrides.dayHours).toBe(7.5);
      expect(parsed.value.periods[0].effectiveFrom).toBeNull();
    }
  });

  it("null の期間境界を含む設定JSONを読み込める", () => {
    const parsed = parseSettingsText(JSON.stringify({
      schema: "wtc-settings/v1",
      baseSettings: defaultSettings(),
      periods: [{ effectiveFrom: null, effectiveTo: null, overrides: { dayHours: 8 } }],
    }), "json");

    expect(parsed.ok).toBe(true);
  });

  it("不正な設定ファイルを拒否する", () => {
    const parsed = parseSettingsText(JSON.stringify({
      schema: "wtc-settings/v1",
      baseSettings: defaultSettings(),
      periods: [{ effectiveFrom: "2026-05-01", effectiveTo: "2026-04-01", overrides: {} }],
    }), "json");

    expect(parsed.ok).toBe(false);
  });
});
