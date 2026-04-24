import type { DayData, HourDisplay, MonthData, Settings, SettingsPeriod } from "./types";
import { createWorkEntriesFile, serializeWorkEntriesCsv, serializeWorkEntriesFile } from "./fileFormats";
import JP_HOLIDAYS from "./holidays";
import { isoDate, loadEntry, resolveSettingsForDate } from "./storage";

function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

export function timeToMinutes(t: string): number | null {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function netMinutes(start: string, end: string, brk: number): number | null {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === null || e === null || e <= s) return null;
  return Math.max(0, (e - s) - (brk || 0));
}

export function addMinutesToTime(start: string, minutes: number): string | null {
  const s = timeToMinutes(start);
  const total = s === null ? null : s + Math.round(minutes || 0);
  if (total === null || total >= 24 * 60) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtH(fractionalHours: number | null | undefined, mode: HourDisplay = "clock"): string {
  if (fractionalHours == null) return "—";
  if (mode === "decimal") return `${fractionalHours.toFixed(2)}h`;

  const totalMinutes = Math.round(fractionalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function fmtRange(min: number, max: number, mode: HourDisplay = "clock"): string {
  return `${fmtH(min, mode)}-${fmtH(max, mode)}`;
}

export function fmtHoursWithSign(
  fractionalHours: number | null | undefined,
  mode: HourDisplay = "clock",
  sign: "" | "+" | "-" = "",
): string {
  if (fractionalHours == null) return "—";
  if (mode === "decimal") return `${sign}${fractionalHours.toFixed(2)}h`;

  const totalMinutes = Math.round(fractionalHours * 60);
  const absMinutes = Math.abs(totalMinutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function getRealMonthData(
  year: number,
  month: number,
  settings: Settings,
  settingsPeriods: SettingsPeriod[],
  useHolidays: boolean,
  holidayDates: ReadonlySet<string> = JP_HOLIDAYS,
): DayData[] {
  const holidays = useHolidays ? holidayDates : new Set<string>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const out: DayData[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date      = new Date(year, month, d);
    const dow       = date.getDay();
    const dateStr   = isoDate(year, month, d);
    const settingsForDate = resolveSettingsForDate(settings, settingsPeriods, dateStr);
    const resolvedSettings = settingsForDate ?? settings;
    const hasMissingSettings = settingsForDate === null;
    const isWorking = [1, 2, 3, 4, 5].includes(dow);
    const isHoliday = holidays.has(dateStr);
    const isToday   = dateStr === todayStr;
    const entry     = loadEntry(dateStr, resolvedSettings.breakMin);
    const net       = (!entry.vac && entry.start && entry.end)
      ? netMinutes(entry.start, entry.end, entry.brk)
      : null;
    const hrs = net !== null ? net / 60 : 0;

    let kind: DayData["kind"];
    if (entry.vac) {
      kind = "vac";
    } else if (!isWorking && hrs > 0) {
      kind = "wknd";
    } else if (isHoliday && hrs > 0) {
      kind = "ot";
    } else if (isHoliday) {
      kind = "holi";
    } else if (!isWorking) {
      kind = "off";
    } else if (hrs === 0) {
      kind = "off";
    } else if (hrs > resolvedSettings.dayHours) {
      kind = "ot";
    } else {
      kind = "reg";
    }

    out.push({
      d,
      date,
      dow,
      kind,
      hrs,
      regularDayHours: resolvedSettings.dayHours,
      defaultDayStart: resolvedSettings.dayStart,
      defaultBreakMin: resolvedSettings.breakMin,
      timeStepMin: resolvedSettings.timeStepMin,
      isHoliday,
      isWorking,
      isToday,
      hasMissingSettings,
      dateStr,
      entry,
    });
  }
  return out;
}

export function sumHours(data: DayData[]): number {
  return roundHours(data.reduce((s, d) => s + (d.hrs || 0), 0));
}

export function overtimeHoursForDay(day: DayData, regularDayHours: number): number {
  if (day.entry.vac || day.hrs <= 0) return 0;
  if (!day.isWorking || day.isHoliday) return roundHours(day.hrs);
  return roundHours(Math.max(0, day.hrs - regularDayHours));
}

export function sumOvertimeHours(data: DayData[], regularDayHours: number): number {
  return roundHours(data.reduce((sum, day) => sum + overtimeHoursForDay(day, day.regularDayHours ?? regularDayHours), 0));
}

export function sumKindHours(data: DayData[], kind: DayData["kind"]): number {
  return roundHours(data.reduce((sum, day) => sum + (day.kind === kind ? day.hrs : 0), 0));
}

export function buildMonthsData(
  year: number,
  settings: Settings,
  settingsPeriods: SettingsPeriod[],
  holidayDates: ReadonlySet<string> = JP_HOLIDAYS,
): MonthData[] {
  return Array.from({ length: 12 }, (_, i) => ({
    m:    i,
    data: getRealMonthData(year, i, settings, settingsPeriods, settings.showHolidays, holidayDates),
  }));
}

function collectEntries(monthsData: MonthData[]): Record<string, DayData["entry"]> {
  const entries: Record<string, DayData["entry"]> = {};
  for (const { data } of monthsData) {
    for (const d of data) {
      if (d.hrs > 0 || d.entry.vac || d.entry.start || d.entry.end) {
        entries[d.dateStr] = d.entry;
      }
    }
  }
  return entries;
}

export function exportCSV(monthsData: MonthData[], year: number): void {
  const csv = serializeWorkEntriesCsv(collectEntries(monthsData));
  download(`workhours-${year}.csv`, new Blob([csv], { type: "text/csv" }));
}

export function exportJSON(monthsData: MonthData[], year: number): void {
  const text = serializeWorkEntriesFile(createWorkEntriesFile(collectEntries(monthsData)), "json");
  download(`workhours-${year}.json`, new Blob([text], { type: "application/json" }));
}

export function exportYAML(monthsData: MonthData[], year: number): void {
  const text = serializeWorkEntriesFile(createWorkEntriesFile(collectEntries(monthsData)), "yaml");
  download(`workhours-${year}.yaml`, new Blob([text], { type: "application/yaml" }));
}

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
