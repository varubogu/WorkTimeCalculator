export interface Entry {
  start: string;
  end: string;
  brk: number;
  vac: boolean;
}

export type DayKind = "reg" | "ot" | "off" | "vac" | "holi" | "wknd";

export interface DayData {
  d: number;
  date: Date;
  dow: number;
  kind: DayKind;
  hrs: number;
  regularDayHours: number;
  defaultDayStart: string;
  defaultBreakMin: number;
  timeStepMin: number;
  isHoliday: boolean;
  isWorking: boolean;
  isToday: boolean;
  hasMissingSettings: boolean;
  dateStr: string;
  entry: Entry;
}

export interface MonthData {
  m: number;
  data: DayData[];
}

export interface Settings {
  dayHours: number;
  dayStart: string;
  timeStepMin: number;
  hourDisplay: HourDisplay;
  monthTargetMin: number;
  monthTargetMax: number;
  monthOvertimeTargetMin: number;
  monthOvertimeTargetMax: number;
  yearTargetMin: number;
  yearTargetMax: number;
  yearOvertimeTargetMin: number;
  yearOvertimeTargetMax: number;
  breakMin: number;
  showHolidays: boolean;
  lang: Lang;
  dark: boolean;
}

export interface SettingsPeriod {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  overrides: Partial<Pick<
    Settings,
    | "dayHours"
    | "dayStart"
    | "timeStepMin"
    | "breakMin"
    | "showHolidays"
  >>;
}

export interface WorkEntriesFileEntry {
  date: string;
  start: string;
  end: string;
  breakMin: number;
  vacation: boolean;
}

export interface WorkEntriesFile {
  $schema?: string;
  schema: "wtc-work-entries/v1";
  entries: WorkEntriesFileEntry[];
}

export interface SettingsFile {
  $schema?: string;
  schema: "wtc-settings/v1";
  baseSettings: Settings;
  periods: SettingsPeriod[];
}

export type HourDisplay = "clock" | "decimal";

export type Lang = "ja" | "en";

export interface Translations {
  brand: string;
  tagline: string;
  lang: string;
  dark: string;
  settings: string;
  export: string;
  import: string;
  year: string;
  month: string;
  target: string;
  range: string;
  progress: string;
  totalHours: string;
  plannedHours: string;
  actualHours: string;
  projected: string;
  remaining: string;
  overtime: string;
  vacation: string;
  holiday: string;
  weekend: string;
  weekendWork: string;
  regular: string;
  inRange: string;
  over: string;
  under: string;
  excess: string;
  shortage: string;
  addEntry: string;
  cancel: string;
  save: string;
  close: string;
  clear: string;
  regHoursPerDay: string;
  regularStartTime: string;
  timeStep: string;
  hourDisplay: string;
  hourDisplayClock: string;
  hourDisplayDecimal: string;
  monthTargetMin: string;
  monthTargetMax: string;
  monthOvertimeTarget: string;
  monthOvertimeTargetMin: string;
  monthOvertimeTargetMax: string;
  yearTargetMin: string;
  yearTargetMax: string;
  yearOvertimeTarget: string;
  yearOvertimeTargetMin: string;
  yearOvertimeTargetMax: string;
  targetValue: string;
  limitValue: string;
  withinTarget: string;
  withinLimit: string;
  limitExceeded: string;
  defaultBreak: string;
  autoHoliday: string;
  startTime: string;
  endTime: string;
  breakTime: string;
  minutes: string;
  months: string[];
  monthsShort: string[];
  dow: string[];
  today: string;
  hours: string;
  h: string;
  click: string;
  note: string;
  noData: string;
  privacyNotice: string;
  calendarTab: string;
  chartTab: string;
  yearTarget: string;
  monthTarget: string;
  hoursSection: string;
  monthlyTargetSection: string;
  yearlyTargetSection: string;
  allMonths: string;
  prev: string;
  next: string;
  bulkRegularFill: string;
  bulkRegularOverwriteConfirm: string;
  bulkRegularTimeOverflow: string;
  workFile: string;
  settingsFile: string;
  exportWorkCsv: string;
  exportWorkJson: string;
  exportWorkYaml: string;
  exportSettingsJson: string;
  exportSettingsYaml: string;
  importWorkFile: string;
  importSettingsFile: string;
  settingsPeriods: string;
  settingsPeriodTarget: string;
  settingsPeriodFrom: string;
  settingsPeriodTo: string;
  settingsPeriodNone: string;
  addSettingsPeriod: string;
  removeSettingsPeriod: string;
  settingsPeriodHelp: string;
  settingsPeriodMissing: string;
  fileImportSuccess: string;
  fileImportError: string;
  fileValidationError: string;
}
