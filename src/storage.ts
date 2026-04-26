import type {
  Entry,
  LegacySettingsPeriod,
  PeriodSettings,
  Settings,
  SettingsPeriodMap,
  SettingsPreferences,
} from "./types";

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

export function defaultSettingsPreferences(): SettingsPreferences {
  const settings = defaultSettings();
  return {
    hourDisplay: settings.hourDisplay,
    lang: settings.lang,
    dark: settings.dark,
  };
}

export function defaultPeriodSettings(): PeriodSettings {
  return settingsToPeriodSettings(defaultSettings());
}

export function defaultSettingsPeriods(): SettingsPeriodMap {
  return { "*": defaultPeriodSettings() };
}

export function settingsToPreferences(settings: Partial<Settings>): SettingsPreferences {
  const d = defaultSettingsPreferences();
  return {
    hourDisplay: settings.hourDisplay === "decimal" ? "decimal" : d.hourDisplay,
    lang: settings.lang === "en" ? "en" : d.lang,
    dark: typeof settings.dark === "boolean" ? settings.dark : d.dark,
  };
}

export function settingsToPeriodSettings(settings: Partial<Settings>): PeriodSettings {
  const merged = mergeSettings(settings);
  return {
    dayHours: merged.dayHours,
    dayStart: merged.dayStart,
    timeStepMin: merged.timeStepMin,
    monthTargetMin: merged.monthTargetMin,
    monthTargetMax: merged.monthTargetMax,
    monthOvertimeTargetMin: merged.monthOvertimeTargetMin,
    monthOvertimeTargetMax: merged.monthOvertimeTargetMax,
    yearTargetMin: merged.yearTargetMin,
    yearTargetMax: merged.yearTargetMax,
    yearOvertimeTargetMin: merged.yearOvertimeTargetMin,
    yearOvertimeTargetMax: merged.yearOvertimeTargetMax,
    breakMin: merged.breakMin,
    showHolidays: merged.showHolidays,
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

export function mergeSettingsPreferences(settings: Partial<SettingsPreferences>): SettingsPreferences {
  return settingsToPreferences(settings);
}

export function mergePeriodSettings(settings: Partial<PeriodSettings>): PeriodSettings {
  const d = defaultPeriodSettings();
  return {
    dayHours: typeof settings.dayHours === "number" && Number.isFinite(settings.dayHours) && settings.dayHours > 0
      ? settings.dayHours
      : d.dayHours,
    dayStart: isValidTime(settings.dayStart) ? settings.dayStart : d.dayStart,
    timeStepMin: (() => {
      const step = Math.floor(Number(settings.timeStepMin));
      return step >= 1 && step <= 120 ? step : d.timeStepMin;
    })(),
    monthTargetMin: finiteNumberOr(settings.monthTargetMin, d.monthTargetMin),
    monthTargetMax: finiteNumberOr(settings.monthTargetMax, d.monthTargetMax),
    monthOvertimeTargetMin: finiteNumberOr(settings.monthOvertimeTargetMin, d.monthOvertimeTargetMin),
    monthOvertimeTargetMax: finiteNumberOr(settings.monthOvertimeTargetMax, d.monthOvertimeTargetMax),
    yearTargetMin: finiteNumberOr(settings.yearTargetMin, d.yearTargetMin),
    yearTargetMax: finiteNumberOr(settings.yearTargetMax, d.yearTargetMax),
    yearOvertimeTargetMin: finiteNumberOr(settings.yearOvertimeTargetMin, d.yearOvertimeTargetMin),
    yearOvertimeTargetMax: finiteNumberOr(settings.yearOvertimeTargetMax, d.yearOvertimeTargetMax),
    breakMin: finiteNumberOr(settings.breakMin, d.breakMin),
    showHolidays: typeof settings.showHolidays === "boolean" ? settings.showHolidays : d.showHolidays,
  };
}

function isPeriodKey(value: string): boolean {
  return value === "*" || isIsoDate(value);
}

function sortPeriodKeys(keys: string[]): string[] {
  return keys.sort((a, b) => {
    if (a === "*") return -1;
    if (b === "*") return 1;
    return a.localeCompare(b);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrateLegacySettingsPeriods(
  baseSettings: Settings,
  periods: Partial<LegacySettingsPeriod>[],
): SettingsPeriodMap {
  const migrated: SettingsPeriodMap = { "*": settingsToPeriodSettings(baseSettings) };
  for (const period of periods) {
    const key = period.effectiveFrom ?? "*";
    if (!isPeriodKey(key)) continue;
    migrated[key] = mergePeriodSettings({ ...settingsToPeriodSettings(baseSettings), ...(period.overrides ?? {}) });
  }
  return mergeSettingsPeriods(migrated);
}

export function mergeSettingsPeriods(value: unknown): SettingsPeriodMap {
  if (Array.isArray(value)) {
    return migrateLegacySettingsPeriods(defaultSettings(), value as Partial<LegacySettingsPeriod>[]);
  }

  if (!isRecord(value)) return defaultSettingsPeriods();

  const merged: Partial<SettingsPeriodMap> = {};
  for (const key of sortPeriodKeys(Object.keys(value))) {
    if (!isPeriodKey(key)) continue;
    const period = value[key];
    if (isRecord(period)) merged[key] = mergePeriodSettings(period as Partial<PeriodSettings>);
  }

  if (!merged["*"]) merged["*"] = defaultPeriodSettings();
  return merged as SettingsPeriodMap;
}

export function loadSettings(): SettingsPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return mergeSettingsPreferences(JSON.parse(raw) as Partial<SettingsPreferences>);
    }
  } catch { /* ignore */ }
  return defaultSettingsPreferences();
}

export function saveSettings(settings: SettingsPreferences): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(mergeSettingsPreferences(settings)));
}

export function loadSettingsPeriods(): SettingsPeriodMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS_PERIODS);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
        const baseSettings = rawSettings
          ? mergeSettings(JSON.parse(rawSettings) as Partial<Settings>)
          : defaultSettings();
        return migrateLegacySettingsPeriods(baseSettings, parsed as Partial<LegacySettingsPeriod>[]);
      }
      return mergeSettingsPeriods(parsed);
    }
  } catch { /* ignore */ }
  return defaultSettingsPeriods();
}

export function ensureSettingsPeriods(baseSettings: Partial<Settings>, periods: unknown): SettingsPeriodMap {
  if ((Array.isArray(periods) && periods.length === 0) || (!Array.isArray(periods) && !isRecord(periods))) {
    return { "*": settingsToPeriodSettings(baseSettings) };
  }
  const normalized = mergeSettingsPeriods(periods);
  if (normalized["*"]) return normalized;
  return { ...normalized, "*": settingsToPeriodSettings(baseSettings) };
}

export function saveSettingsPeriods(periods: SettingsPeriodMap): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS_PERIODS, JSON.stringify(mergeSettingsPeriods(periods)));
}

export function resolveSettingsForDate(
  preferences: SettingsPreferences,
  periods: SettingsPeriodMap,
  dateStr: string,
): Settings {
  const normalized = mergeSettingsPeriods(periods);
  const key = resolveSettingsPeriodKeyForDate(normalized, dateStr);
  return mergeSettings({ ...normalized[key], ...preferences });
}

export function resolveSettingsPeriodKeyForDate(
  periods: SettingsPeriodMap,
  dateStr: string,
): string {
  const normalized = mergeSettingsPeriods(periods);
  const matchingKeys = sortPeriodKeys(Object.keys(normalized))
    .filter(periodKey => periodKey === "*" || periodKey <= dateStr);
  return matchingKeys[matchingKeys.length - 1] ?? "*";
}

export function hasAnyHolidayPeriod(periods: SettingsPeriodMap): boolean {
  return Object.values(mergeSettingsPeriods(periods)).some(period => period.showHolidays);
}
