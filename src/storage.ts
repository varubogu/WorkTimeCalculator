import type { Entry, Settings, SettingsPeriod } from "./types";

const STORAGE_KEY_SETTINGS = "wtc_settings";
const STORAGE_KEY_SETTINGS_PERIODS = "wtc_settings_periods";

function isValidTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{1,2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h <= 23 && m <= 59;
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function entryKey(dateStr: string): string {
  return `wtc_${dateStr}`;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function loadEntry(dateStr: string, defaultBreak: number): Entry {
  try {
    const raw = localStorage.getItem(entryKey(dateStr));
    if (raw) {
      const p = JSON.parse(raw) as Partial<Entry>;
      return {
        start: p.start ?? "",
        end:   p.end   ?? "",
        brk:   typeof p.brk === "number" ? p.brk : defaultBreak,
        vac:   !!p.vac,
      };
    }
  } catch { /* ignore */ }
  return { start: "", end: "", brk: defaultBreak, vac: false };
}

export function saveEntry(dateStr: string, entry: Entry): void {
  localStorage.setItem(entryKey(dateStr), JSON.stringify(entry));
}

export function clearEntry(dateStr: string): void {
  localStorage.removeItem(entryKey(dateStr));
}

export function defaultSettings(): Settings {
  return {
    dayHours:                8,
    dayStart:                "09:00",
    timeStepMin:             15,
    hourDisplay:             "clock",
    monthTargetMin:          140,
    monthTargetMax:          180,
    monthOvertimeTargetMin:  0,
    monthOvertimeTargetMax:  45,
    yearTargetMin:           1680,
    yearTargetMax:           2160,
    yearOvertimeTargetMin:   0,
    yearOvertimeTargetMax:   360,
    breakMin:                60,
    showHolidays:            true,
    lang:                    "ja",
    dark:                    false,
  };
}

export function defaultSettingsPeriods(): SettingsPeriod[] {
  return [];
}

export function createDefaultSettingsPeriod(settings: Settings): SettingsPeriod {
  return {
    effectiveFrom: null,
    effectiveTo: null,
    overrides: {
      dayHours: settings.dayHours,
      dayStart: settings.dayStart,
      breakMin: settings.breakMin,
      timeStepMin: settings.timeStepMin,
    },
  };
}

function finiteNumberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function mergeSettings(s: Partial<Settings>): Settings {
  const d = defaultSettings();
  const dayHours = Number(s.dayHours);
  const timeStepMin = Math.floor(Number(s.timeStepMin));
  return {
    dayHours:                dayHours > 0 ? dayHours : d.dayHours,
    dayStart:                isValidTime(s.dayStart) ? s.dayStart : d.dayStart,
    timeStepMin:             timeStepMin >= 1 && timeStepMin <= 120 ? timeStepMin : d.timeStepMin,
    hourDisplay:             s.hourDisplay === "decimal" ? "decimal" : d.hourDisplay,
    monthTargetMin:          finiteNumberOr(s.monthTargetMin, d.monthTargetMin),
    monthTargetMax:          finiteNumberOr(s.monthTargetMax, d.monthTargetMax),
    monthOvertimeTargetMin:  finiteNumberOr(s.monthOvertimeTargetMin, d.monthOvertimeTargetMin),
    monthOvertimeTargetMax:  finiteNumberOr(s.monthOvertimeTargetMax, d.monthOvertimeTargetMax),
    yearTargetMin:           finiteNumberOr(s.yearTargetMin, d.yearTargetMin),
    yearTargetMax:           finiteNumberOr(s.yearTargetMax, d.yearTargetMax),
    yearOvertimeTargetMin:   finiteNumberOr(s.yearOvertimeTargetMin, d.yearOvertimeTargetMin),
    yearOvertimeTargetMax:   finiteNumberOr(s.yearOvertimeTargetMax, d.yearOvertimeTargetMax),
    breakMin:                finiteNumberOr(s.breakMin, d.breakMin),
    showHolidays:            typeof s.showHolidays === "boolean" ? s.showHolidays : d.showHolidays,
    lang:                    s.lang ?? d.lang,
    dark:                    typeof s.dark === "boolean" ? s.dark : d.dark,
  };
}

function mergeSettingsPeriod(period: Partial<SettingsPeriod>): SettingsPeriod | null {
  const effectiveFrom = period.effectiveFrom ?? null;
  const effectiveTo = period.effectiveTo ?? null;
  if (effectiveFrom !== null && !isIsoDate(effectiveFrom)) return null;
  if (effectiveTo !== null && !isIsoDate(effectiveTo)) return null;
  if (effectiveFrom !== null && effectiveTo !== null && effectiveFrom > effectiveTo) return null;

  const overrides = period.overrides ?? {};
  const mergedOverrides: SettingsPeriod["overrides"] = {};

  if (typeof overrides.dayHours === "number" && Number.isFinite(overrides.dayHours) && overrides.dayHours > 0) {
    mergedOverrides.dayHours = overrides.dayHours;
  }
  if (isValidTime(overrides.dayStart)) {
    mergedOverrides.dayStart = overrides.dayStart;
  }
  if (typeof overrides.timeStepMin === "number" && Number.isFinite(overrides.timeStepMin)) {
    const rounded = Math.floor(overrides.timeStepMin);
    if (rounded >= 1 && rounded <= 120) mergedOverrides.timeStepMin = rounded;
  }
  if (typeof overrides.breakMin === "number" && Number.isFinite(overrides.breakMin) && overrides.breakMin >= 0) {
    mergedOverrides.breakMin = overrides.breakMin;
  }
  if (typeof overrides.showHolidays === "boolean") {
    mergedOverrides.showHolidays = overrides.showHolidays;
  }

  return {
    effectiveFrom,
    effectiveTo,
    overrides: mergedOverrides,
  };
}

export function mergeSettingsPeriods(periods: Partial<SettingsPeriod>[]): SettingsPeriod[] {
  return periods
    .map(period => mergeSettingsPeriod(period))
    .filter((period): period is SettingsPeriod => period !== null)
    .sort((a, b) => {
      const fromA = a.effectiveFrom ?? "";
      const fromB = b.effectiveFrom ?? "";
      const toA = a.effectiveTo ?? "9999-12-31";
      const toB = b.effectiveTo ?? "9999-12-31";
      return fromA.localeCompare(fromB) || toA.localeCompare(toB);
    });
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return mergeSettings(JSON.parse(raw) as Partial<Settings>);
    }
  } catch { /* ignore */ }
  return defaultSettings();
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
}

export function loadSettingsPeriods(): SettingsPeriod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS_PERIODS);
    if (raw) {
      return mergeSettingsPeriods(JSON.parse(raw) as Partial<SettingsPeriod>[]);
    }
  } catch { /* ignore */ }
  return defaultSettingsPeriods();
}

export function ensureSettingsPeriods(baseSettings: Settings, periods: Partial<SettingsPeriod>[]): SettingsPeriod[] {
  const normalized = mergeSettingsPeriods(periods);
  return normalized.length > 0 ? normalized : [createDefaultSettingsPeriod(baseSettings)];
}

export function saveSettingsPeriods(periods: SettingsPeriod[]): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS_PERIODS, JSON.stringify(mergeSettingsPeriods(periods)));
}

export function periodMatchesDate(period: SettingsPeriod, dateStr: string): boolean {
  return (period.effectiveFrom === null || period.effectiveFrom <= dateStr)
    && (period.effectiveTo === null || dateStr <= period.effectiveTo);
}

export function resolveSettingsForDate(
  baseSettings: Settings,
  periods: SettingsPeriod[],
  dateStr: string,
): Settings | null {
  const matching = periods.filter(period => periodMatchesDate(period, dateStr));
  if (matching.length === 0) return null;

  const overrides = matching.reduce<Partial<Settings>>(
    (acc, period) => ({ ...acc, ...period.overrides }),
    {},
  );
  return mergeSettings({ ...baseSettings, ...overrides });
}

export function findFirstMissingSettingsDate(
  periods: SettingsPeriod[],
  startDateStr: string,
  endDateStr: string,
): string | null {
  const cursor = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  while (cursor <= end) {
    const dateStr = isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (!periods.some(period => periodMatchesDate(period, dateStr))) return dateStr;
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}
