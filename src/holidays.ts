// Japanese public holidays fallback 2024-2027.
const JP_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2024
  "2024-01-01","2024-01-08","2024-02-11","2024-02-12","2024-02-23",
  "2024-03-20","2024-04-29","2024-05-03","2024-05-04","2024-05-05","2024-05-06",
  "2024-07-15","2024-08-11","2024-08-12","2024-09-16","2024-09-22","2024-09-23",
  "2024-10-14","2024-11-03","2024-11-04","2024-11-23",
  // 2025
  "2025-01-01","2025-01-13","2025-02-11","2025-02-23","2025-02-24",
  "2025-03-20","2025-04-29","2025-05-03","2025-05-04","2025-05-05","2025-05-06",
  "2025-07-21","2025-08-11","2025-09-15","2025-09-23","2025-10-13",
  "2025-11-03","2025-11-23","2025-11-24",
  // 2026
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23",
  "2026-03-20","2026-04-29","2026-05-03","2026-05-04","2026-05-05",
  "2026-07-20","2026-08-11","2026-09-21","2026-09-23",
  "2026-10-12","2026-11-03","2026-11-23",
  // 2027
  "2027-01-01","2027-01-11","2027-02-11","2027-02-23",
  "2027-03-21","2027-04-29","2027-05-03","2027-05-04","2027-05-05",
  "2027-07-19","2027-08-11","2027-09-20","2027-09-23",
  "2027-10-11","2027-11-03","2027-11-23",
]);

export default JP_HOLIDAYS;

const HOLIDAY_CACHE_PREFIX = "wtc_holidays_";
const HOLIDAYS_JP_API_BASE = "https://holidays-jp.github.io/api/v1";
const HOLIDAY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface HolidayCache {
  savedAt: number;
  dates: string[];
}

function isHolidayMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([date, name]) => (
    /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof name === "string"
  ));
}

function fallbackForYear(year: number): Set<string> {
  const prefix = `${year}-`;
  return new Set([...JP_HOLIDAYS].filter(date => date.startsWith(prefix)));
}

function isDateArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(x => typeof x === "string");
}

function isHolidayCache(value: unknown): value is HolidayCache {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const cache = value as Partial<HolidayCache>;
  return typeof cache.savedAt === "number" && isDateArray(cache.dates);
}

export async function loadHolidayDates(year: number): Promise<Set<string>> {
  const cacheKey = `${HOLIDAY_CACHE_PREFIX}${year}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as unknown;
      if (isHolidayCache(parsed) && Date.now() - parsed.savedAt < HOLIDAY_CACHE_TTL_MS) {
        return new Set(parsed.dates);
      }
      if (isDateArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore broken cache and retry the API.
  }

  try {
    const res = await fetch(`${HOLIDAYS_JP_API_BASE}/${year}/date.json`);
    if (!res.ok) throw new Error(`Holiday API returned ${res.status}`);
    const data = await res.json() as unknown;
    if (!isHolidayMap(data)) throw new Error("Holiday API returned an unexpected shape");
    const dates = Object.keys(data);
    if (dates.length === 0) return fallbackForYear(year);
    localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), dates }));
    return new Set(dates);
  } catch {
    return fallbackForYear(year);
  }
}
