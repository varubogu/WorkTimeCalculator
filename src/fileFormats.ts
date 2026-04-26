import {
  defaultSettings,
  defaultSettingsPreferences,
  mergePeriodSettings,
  mergeSettings,
  mergeSettingsPeriods,
  mergeSettingsPreferences,
  settingsToPeriodSettings,
  settingsToPreferences,
} from "./storage";
import type {
  Entry,
  LegacySettingsPeriod,
  PeriodSettings,
  Settings,
  SettingsFile,
  SettingsPeriodMap,
  WorkEntriesFile,
  WorkEntriesFileEntry,
} from "./types";

const WORK_ENTRIES_SCHEMA_PATH = "/schemas/wtc-work-entries.schema.json";
const SETTINGS_SCHEMA_PATH = "/schemas/wtc-settings.schema.json";

export const WORK_ENTRIES_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: WORK_ENTRIES_SCHEMA_PATH,
  title: "Work Time Calculator Work Entries",
  type: "object",
  additionalProperties: false,
  required: ["schema", "entries"],
  properties: {
    $schema: { type: "string", format: "uri" },
    schema: { const: "wtc-work-entries/v1" },
    entries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "start", "end", "breakMin", "vacation"],
        properties: {
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          start: { type: "string", pattern: "^(\\d{1,2}:\\d{2})?$" },
          end: { type: "string", pattern: "^(\\d{1,2}:\\d{2})?$" },
          breakMin: { type: "number", minimum: 0 },
          vacation: { type: "boolean" },
        },
      },
    },
  },
} as const;

export const SETTINGS_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: SETTINGS_SCHEMA_PATH,
  title: "Work Time Calculator Settings",
  type: "object",
  additionalProperties: false,
  required: ["schema", "preferences", "periods"],
  properties: {
    $schema: { type: "string", format: "uri" },
    schema: { const: "wtc-settings/v2" },
    preferences: {
      type: "object",
      additionalProperties: false,
      required: [
        "hourDisplay",
        "lang",
        "dark",
      ],
      properties: {
        hourDisplay: { enum: ["clock", "decimal"] },
        lang: { enum: ["ja", "en"] },
        dark: { type: "boolean" },
      },
    },
    periods: {
      type: "object",
      additionalProperties: {
        type: "object",
        additionalProperties: false,
        required: [
          "dayHours",
          "dayStart",
          "timeStepMin",
          "breakMin",
          "showHolidays",
          "monthTargetMin",
          "monthTargetMax",
          "monthOvertimeTargetMin",
          "monthOvertimeTargetMax",
          "yearTargetMin",
          "yearTargetMax",
          "yearOvertimeTargetMin",
          "yearOvertimeTargetMax",
        ],
        properties: {
          dayHours: { type: "number", exclusiveMinimum: 0 },
          dayStart: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
          timeStepMin: { type: "integer", minimum: 1, maximum: 120 },
          breakMin: { type: "number", minimum: 0 },
          showHolidays: { type: "boolean" },
          monthTargetMin: { type: "number" },
          monthTargetMax: { type: "number" },
          monthOvertimeTargetMin: { type: "number" },
          monthOvertimeTargetMax: { type: "number" },
          yearTargetMin: { type: "number" },
          yearTargetMax: { type: "number" },
          yearOvertimeTargetMin: { type: "number" },
          yearOvertimeTargetMax: { type: "number" },
        },
      },
      propertyNames: {
        pattern: "^(\\*|\\d{4}-\\d{2}-\\d{2})$",
      },
      required: ["*"],
    },
  },
} as const;

export const LEGACY_SETTINGS_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: SETTINGS_SCHEMA_PATH,
  title: "Work Time Calculator Settings v1",
  type: "object",
  additionalProperties: false,
  required: ["schema", "baseSettings", "periods"],
  properties: {
    $schema: { type: "string", format: "uri" },
    schema: { const: "wtc-settings/v1" },
    baseSettings: {
      type: "object",
      additionalProperties: false,
      required: [
        "dayHours",
        "dayStart",
        "timeStepMin",
        "hourDisplay",
        "monthTargetMin",
        "monthTargetMax",
        "monthOvertimeTargetMin",
        "monthOvertimeTargetMax",
        "yearTargetMin",
        "yearTargetMax",
        "yearOvertimeTargetMin",
        "yearOvertimeTargetMax",
        "breakMin",
        "showHolidays",
        "lang",
        "dark",
      ],
      properties: {
        dayHours: { type: "number", exclusiveMinimum: 0 },
        dayStart: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
        timeStepMin: { type: "integer", minimum: 1, maximum: 120 },
        hourDisplay: { enum: ["clock", "decimal"] },
        monthTargetMin: { type: "number" },
        monthTargetMax: { type: "number" },
        monthOvertimeTargetMin: { type: "number" },
        monthOvertimeTargetMax: { type: "number" },
        yearTargetMin: { type: "number" },
        yearTargetMax: { type: "number" },
        yearOvertimeTargetMin: { type: "number" },
        yearOvertimeTargetMax: { type: "number" },
        breakMin: { type: "number", minimum: 0 },
        showHolidays: { type: "boolean" },
        lang: { enum: ["ja", "en"] },
        dark: { type: "boolean" },
      },
    },
    periods: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["effectiveFrom", "effectiveTo", "overrides"],
        properties: {
          effectiveFrom: { anyOf: [{ type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, { type: "null" }] },
          effectiveTo: { anyOf: [{ type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, { type: "null" }] },
          overrides: {
            type: "object",
            additionalProperties: false,
            properties: {
              dayHours: { type: "number", exclusiveMinimum: 0 },
              dayStart: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
              timeStepMin: { type: "integer", minimum: 1, maximum: 120 },
              breakMin: { type: "number", minimum: 0 },
              showHolidays: { type: "boolean" },
            },
          },
        },
      },
    },
  },
} as const;

type ParseSuccess<T> = { ok: true; value: T };
type ParseFailure = { ok: false; errors: string[] };

const TIME_PATTERN = /^\d{1,2}:\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTime(value: unknown): value is string {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function parseScalar(value: string): unknown {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function splitKeyValue(line: string): [string, string] | null {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const key = line.slice(0, idx).trim();
  return [String(parseScalar(key)), line.slice(idx + 1).trim()];
}

function parseSimpleYaml(text: string): unknown {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.replace(/\t/g, "  "))
    .filter(line => line.trim() !== "" && !line.trim().startsWith("#"));

  let index = 0;

  function currentIndent(line: string): number {
    return line.length - line.trimStart().length;
  }

  function parseBlock(indent: number): unknown {
    const line = lines[index];
    if (!line) return {};
    return line.trimStart().startsWith("- ") ? parseArray(indent) : parseObject(indent);
  }

  function parseArray(indent: number): unknown[] {
    const arr: unknown[] = [];

    while (index < lines.length) {
      const line = lines[index];
      const lineIndent = currentIndent(line);
      if (lineIndent < indent || !line.trimStart().startsWith("- ")) break;

      const content = line.trimStart().slice(2).trim();
      index += 1;

      if (content === "") {
        arr.push(parseBlock(indent + 2));
        continue;
      }

      const kv = splitKeyValue(content);
      if (kv) {
        const [key, rawValue] = kv;
        const item: Record<string, unknown> = {};
        if (rawValue === "") {
          item[key] = parseBlock(indent + 2);
        } else {
          item[key] = parseScalar(rawValue);
        }

        while (index < lines.length) {
          const next = lines[index];
          const nextIndent = currentIndent(next);
          if (nextIndent < indent + 2 || next.trimStart().startsWith("- ")) break;
          const nextKv = splitKeyValue(next.trim());
          if (!nextKv) break;
          const [nextKey, nextValue] = nextKv;
          index += 1;
          item[nextKey] = nextValue === "" ? parseBlock(nextIndent + 2) : parseScalar(nextValue);
        }
        arr.push(item);
        continue;
      }

      arr.push(parseScalar(content));
    }

    return arr;
  }

  function parseObject(indent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    while (index < lines.length) {
      const line = lines[index];
      const lineIndent = currentIndent(line);
      if (lineIndent < indent) break;
      if (lineIndent > indent) {
        index += 1;
        continue;
      }

      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) break;
      const kv = splitKeyValue(trimmed);
      if (!kv) {
        index += 1;
        continue;
      }

      const [key, rawValue] = kv;
      index += 1;
      obj[key] = rawValue === "" ? parseBlock(indent + 2) : parseScalar(rawValue);
    }

    return obj;
  }

  return parseBlock(0);
}

function yamlScalar(value: string | number | boolean): string {
  if (typeof value === "string") {
    if (value === "" || /[:#\-\n]/.test(value) || /^\s|\s$/.test(value)) return JSON.stringify(value);
    return value;
  }
  return String(value);
}

function yamlKey(key: string): string {
  if (key === "*" || key === "" || /[:#\-\n\s]/.test(key)) return JSON.stringify(key);
  return key;
}

function toYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (isRecord(item) || Array.isArray(item)) {
          const nested = toYaml(item, indent + 2);
          const [first, ...rest] = nested.split("\n");
          return `${pad}- ${first.trimStart()}${rest.length ? `\n${rest.join("\n")}` : ""}`;
        }
        return `${pad}- ${yamlScalar(item as string | number | boolean)}`;
      })
      .join("\n");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        if (Array.isArray(item) || isRecord(item)) {
          const nested = toYaml(item, indent + 2);
          return `${pad}${yamlKey(key)}:\n${nested}`;
        }
        return `${pad}${yamlKey(key)}: ${yamlScalar(item as string | number | boolean)}`;
      })
      .join("\n");
  }

  return `${pad}${yamlScalar(value as string | number | boolean)}`;
}

function parseByFormat(text: string, format: "json" | "yaml"): unknown {
  return format === "json" ? JSON.parse(text) : parseSimpleYaml(text);
}

function schemaUrl(path: string): string {
  const configured = import.meta.env.VITE_SCHEMA_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return `${configured}${path}`;
  if (typeof window !== "undefined" && window.location.origin) return `${window.location.origin}${path}`;
  return path;
}

export function workEntriesSchemaUrl(): string {
  return schemaUrl(WORK_ENTRIES_SCHEMA_PATH);
}

export function settingsSchemaUrl(): string {
  return schemaUrl(SETTINGS_SCHEMA_PATH);
}

function validateWorkEntry(entry: unknown, index: number): string[] {
  if (!isRecord(entry)) return [`entries[${index}] must be an object.`];
  const errors: string[] = [];
  if (!isIsoDate(entry.date)) errors.push(`entries[${index}].date must be YYYY-MM-DD.`);
  if (!isTime(entry.start) && entry.start !== "") errors.push(`entries[${index}].start must be HH:MM or empty.`);
  if (!isTime(entry.end) && entry.end !== "") errors.push(`entries[${index}].end must be HH:MM or empty.`);
  if (typeof entry.breakMin !== "number" || !Number.isFinite(entry.breakMin) || entry.breakMin < 0) {
    errors.push(`entries[${index}].breakMin must be a non-negative number.`);
  }
  if (typeof entry.vacation !== "boolean") errors.push(`entries[${index}].vacation must be boolean.`);
  return errors;
}

export function validateWorkEntriesFile(value: unknown): ParseSuccess<WorkEntriesFile> | ParseFailure {
  if (!isRecord(value)) return { ok: false, errors: ["work entries file must be an object."] };
  const errors: string[] = [];
  if (value.schema !== "wtc-work-entries/v1") errors.push("schema must be wtc-work-entries/v1.");
  if (!Array.isArray(value.entries)) errors.push("entries must be an array.");

  const entries = Array.isArray(value.entries) ? value.entries : [];
  entries.forEach((entry, index) => {
    errors.push(...validateWorkEntry(entry, index));
  });

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      $schema: typeof value.$schema === "string" ? value.$schema : undefined,
      schema: "wtc-work-entries/v1",
      entries: entries as WorkEntriesFileEntry[],
    },
  };
}

function validateLegacySettingsPeriod(period: unknown, index: number): string[] {
  if (!isRecord(period)) return [`periods[${index}] must be an object.`];
  const errors: string[] = [];
  if (period.effectiveFrom !== null && !isIsoDate(period.effectiveFrom)) errors.push(`periods[${index}].effectiveFrom must be YYYY-MM-DD or null.`);
  if (period.effectiveTo !== null && !isIsoDate(period.effectiveTo)) errors.push(`periods[${index}].effectiveTo must be YYYY-MM-DD or null.`);
  if ((period.effectiveFrom === null || isIsoDate(period.effectiveFrom))
    && (period.effectiveTo === null || isIsoDate(period.effectiveTo))
    && typeof period.effectiveFrom === "string"
    && typeof period.effectiveTo === "string"
    && period.effectiveFrom > period.effectiveTo) {
    errors.push(`periods[${index}] has an invalid date range.`);
  }
  if (!isRecord(period.overrides)) errors.push(`periods[${index}].overrides must be an object.`);
  return errors;
}

function validatePeriodSettings(period: unknown, key: string): string[] {
  if (!isRecord(period)) return [`periods.${key} must be an object.`];
  const errors: string[] = [];
  const required: (keyof PeriodSettings)[] = [
    "dayHours",
    "dayStart",
    "timeStepMin",
    "monthTargetMin",
    "monthTargetMax",
    "monthOvertimeTargetMin",
    "monthOvertimeTargetMax",
    "yearTargetMin",
    "yearTargetMax",
    "yearOvertimeTargetMin",
    "yearOvertimeTargetMax",
    "breakMin",
    "showHolidays",
  ];

  for (const field of required) {
    if (!(field in period)) errors.push(`periods.${key}.${field} is required.`);
  }
  if (typeof period.dayHours !== "number" || !Number.isFinite(period.dayHours) || period.dayHours <= 0) errors.push(`periods.${key}.dayHours must be a positive number.`);
  if (!isTime(period.dayStart)) errors.push(`periods.${key}.dayStart must be HH:MM.`);
  if (typeof period.timeStepMin !== "number" || !Number.isInteger(period.timeStepMin) || period.timeStepMin < 1 || period.timeStepMin > 120) {
    errors.push(`periods.${key}.timeStepMin must be an integer from 1 to 120.`);
  }
  if (typeof period.breakMin !== "number" || !Number.isFinite(period.breakMin) || period.breakMin < 0) errors.push(`periods.${key}.breakMin must be a non-negative number.`);
  if (typeof period.showHolidays !== "boolean") errors.push(`periods.${key}.showHolidays must be boolean.`);

  for (const field of [
    "monthTargetMin",
    "monthTargetMax",
    "monthOvertimeTargetMin",
    "monthOvertimeTargetMax",
    "yearTargetMin",
    "yearTargetMax",
    "yearOvertimeTargetMin",
    "yearOvertimeTargetMax",
  ] as const) {
    if (typeof period[field] !== "number" || !Number.isFinite(period[field])) {
      errors.push(`periods.${key}.${field} must be a number.`);
    }
  }

  return errors;
}

function migrateLegacySettingsFile(value: Record<string, unknown>, errors: string[]): ParseSuccess<SettingsFile> | ParseFailure {
  if (!isRecord(value.baseSettings)) errors.push("baseSettings must be an object.");
  if (!Array.isArray(value.periods)) errors.push("periods must be an array.");

  const baseSettings = isRecord(value.baseSettings) ? mergeSettings(value.baseSettings as Partial<Settings>) : defaultSettings();
  const legacyPeriods = Array.isArray(value.periods) ? value.periods : [];
  legacyPeriods.forEach((period, index) => errors.push(...validateLegacySettingsPeriod(period, index)));

  if (errors.length > 0) return { ok: false, errors };

  const periods: SettingsPeriodMap = { "*": settingsToPeriodSettings(baseSettings) };
  for (const period of legacyPeriods as Partial<LegacySettingsPeriod>[]) {
    const key = period.effectiveFrom ?? "*";
    if (key !== "*" && !isIsoDate(key)) continue;
    periods[key] = mergePeriodSettings({ ...settingsToPeriodSettings(baseSettings), ...(period.overrides ?? {}) });
  }

  return {
    ok: true,
    value: {
      $schema: typeof value.$schema === "string" ? value.$schema : undefined,
      schema: "wtc-settings/v2",
      preferences: settingsToPreferences(baseSettings),
      periods: mergeSettingsPeriods(periods),
    },
  };
}

export function validateSettingsFile(value: unknown): ParseSuccess<SettingsFile> | ParseFailure {
  if (!isRecord(value)) return { ok: false, errors: ["settings file must be an object."] };
  const errors: string[] = [];
  if (value.schema === "wtc-settings/v1") return migrateLegacySettingsFile(value, errors);

  if (value.schema !== "wtc-settings/v2") errors.push("schema must be wtc-settings/v2.");
  if (!isRecord(value.preferences)) errors.push("preferences must be an object.");
  if (!isRecord(value.periods)) errors.push("periods must be an object.");

  const preferences = isRecord(value.preferences)
    ? mergeSettingsPreferences(value.preferences as Partial<Settings>)
    : defaultSettingsPreferences();
  const periodMap = isRecord(value.periods) ? value.periods : {};

  if (!Object.prototype.hasOwnProperty.call(periodMap, "*")) errors.push("periods.* is required.");
  for (const [key, period] of Object.entries(periodMap)) {
    if (key !== "*" && !isIsoDate(key)) errors.push(`periods key ${key} must be * or YYYY-MM-DD.`);
    errors.push(...validatePeriodSettings(period, key));
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      $schema: typeof value.$schema === "string" ? value.$schema : undefined,
      schema: "wtc-settings/v2",
      preferences,
      periods: mergeSettingsPeriods(periodMap),
    },
  };
}

export function createWorkEntriesFile(entries: Record<string, Entry>): WorkEntriesFile {
  return {
    $schema: workEntriesSchemaUrl(),
    schema: "wtc-work-entries/v1",
    entries: Object.entries(entries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entry]) => ({
        date,
        start: entry.start,
        end: entry.end,
        breakMin: entry.brk,
        vacation: entry.vac,
      })),
  };
}

export function createSettingsFile(preferences: Partial<Settings>, periods: SettingsPeriodMap): SettingsFile {
  return {
    $schema: settingsSchemaUrl(),
    schema: "wtc-settings/v2",
    preferences: settingsToPreferences(preferences),
    periods: mergeSettingsPeriods(periods),
  };
}

export function serializeWorkEntriesFile(file: WorkEntriesFile, format: "json" | "yaml"): string {
  return format === "json" ? JSON.stringify(file, null, 2) : toYaml(file);
}

export function serializeSettingsFile(file: SettingsFile, format: "json" | "yaml"): string {
  return format === "json" ? JSON.stringify(file, null, 2) : toYaml(file);
}

export function serializeWorkEntriesCsv(entries: Record<string, Entry>): string {
  const rows = [["date", "start", "end", "breakMin", "vacation"]];
  for (const [date, entry] of Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))) {
    rows.push([date, entry.start, entry.end, String(entry.brk), entry.vac ? "true" : "false"]);
  }
  return rows.map(row => row.join(",")).join("\n");
}

export function parseWorkEntriesCsv(text: string): ParseSuccess<WorkEntriesFile> | ParseFailure {
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n").filter(Boolean);
  if (lines.length === 0) return { ok: false, errors: ["CSV is empty."] };
  const header = lines[0].split(",");
  const expected = ["date", "start", "end", "breakMin", "vacation"];
  if (header.join(",") !== expected.join(",")) {
    return { ok: false, errors: [`CSV header must be ${expected.join(",")}.`] };
  }

  const entries: WorkEntriesFileEntry[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const cols = line.split(",");
    if (cols.length !== 5) {
      errors.push(`line ${index + 2} must have 5 columns.`);
      return;
    }

    const entry: WorkEntriesFileEntry = {
      date: cols[0],
      start: cols[1],
      end: cols[2],
      breakMin: Number(cols[3]),
      vacation: cols[4] === "true",
    };
    errors.push(...validateWorkEntry(entry, index));
    entries.push(entry);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { schema: "wtc-work-entries/v1", entries } };
}

export function parseWorkEntriesText(text: string, format: "json" | "yaml"): ParseSuccess<WorkEntriesFile> | ParseFailure {
  try {
    return validateWorkEntriesFile(parseByFormat(text, format));
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Failed to parse work entries file."] };
  }
}

export function parseSettingsText(text: string, format: "json" | "yaml"): ParseSuccess<SettingsFile> | ParseFailure {
  try {
    return validateSettingsFile(parseByFormat(text, format));
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Failed to parse settings file."] };
  }
}
