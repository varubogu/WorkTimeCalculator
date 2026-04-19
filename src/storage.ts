import type { Entry, Settings } from "./types";

const STORAGE_KEY_SETTINGS = "wtc_settings";

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
    dayHours:       8,
    dayStart:       "09:00",
    timeStepMin:    15,
    monthTargetMin: 140,
    monthTargetMax: 180,
    yearTargetMin:  1680,
    yearTargetMax:  2160,
    breakMin:       60,
    showHolidays:   true,
    lang:           "ja",
    dark:           false,
  };
}

export function mergeSettings(s: Partial<Settings>): Settings {
  const d = defaultSettings();
  const dayHours = Number(s.dayHours);
  const timeStepMin = Math.floor(Number(s.timeStepMin));
  return {
    dayHours:       dayHours > 0 ? dayHours : d.dayHours,
    dayStart:       isValidTime(s.dayStart) ? s.dayStart : d.dayStart,
    timeStepMin:    timeStepMin >= 1 && timeStepMin <= 120 ? timeStepMin : d.timeStepMin,
    monthTargetMin: Number(s.monthTargetMin) || d.monthTargetMin,
    monthTargetMax: Number(s.monthTargetMax) || d.monthTargetMax,
    yearTargetMin:  Number(s.yearTargetMin)  || d.yearTargetMin,
    yearTargetMax:  Number(s.yearTargetMax)  || d.yearTargetMax,
    breakMin:       typeof s.breakMin === "number" ? s.breakMin : d.breakMin,
    showHolidays:   typeof s.showHolidays === "boolean" ? s.showHolidays : d.showHolidays,
    lang:           s.lang ?? d.lang,
    dark:           typeof s.dark === "boolean" ? s.dark : d.dark,
  };
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
