import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DayData, Entry, Lang, MonthData, Settings, SettingsPeriodMap, SettingsPreferences, Translations } from "./types";
import I18N from "./i18n";
import {
  ensureSettingsPeriods,
  hasAnyHolidayPeriod,
  isoDate,
  loadSettings,
  loadSettingsPeriods,
  mergeSettingsPreferences,
  resolveSettingsForDate,
  saveSettings,
  saveSettingsPeriods,
  saveEntry,
} from "./storage";
import { loadHolidayDates } from "./holidays";
import {
  createSettingsFile,
  parseSettingsText,
  parseWorkEntriesCsv,
  parseWorkEntriesText,
  serializeSettingsFile,
} from "./fileFormats";
import {
  addMinutesToTime,
  buildMonthsData,
  exportCSV,
  exportJSON,
  exportYAML,
  fmtH,
  fmtHoursWithSign,
  fmtRange,
  sumHours,
  sumKindHours,
  sumOvertimeHours,
} from "./utils";

import AppHeader       from "./components/AppHeader";
import Sidebar         from "./components/Sidebar";
import MonthCalendar   from "./components/MonthCalendar";
import YearTimelineChart from "./components/YearTimelineChart";
import RangeProgress   from "./components/RangeProgress";
import DeltaChip       from "./components/DeltaChip";
import Legend          from "./components/Legend";
import DayModal        from "./components/DayModal";
import SettingsModal   from "./components/SettingsModal";

// ── View tabs ──────────────────────────────────────────
type View = "calendar" | "chart";

function ViewTabs({ view, setView, t }: { view: View; setView: (v: View) => void; t: Translations }) {
  return (
    <div className="tab-bar">
      <div className={"tab" + (view === "calendar" ? " active" : "")} onClick={() => setView("calendar")}>
        {t.calendarTab}
      </div>
      <div className={"tab" + (view === "chart" ? " active" : "")} onClick={() => setView("chart")}>
        {t.chartTab}
      </div>
    </div>
  );
}

// ── Mobile month grid ──────────────────────────────────
function MobileMonthGrid({
  monthsData, monthIdx, monthlySettings, t, onPickMonth,
}: {
  monthsData: MonthData[];
  monthIdx: number;
  monthlySettings: Settings[];
  t: (typeof I18N)[Lang];
  onPickMonth: (m: number) => void;
}) {
  function statusColor(tot: number, settings: Settings) {
    return tot < settings.monthTargetMin ? "var(--accent-warn)"
      : tot > settings.monthTargetMax ? "var(--accent-bad)"
      : "var(--accent-ok)";
  }
  return (
    <div className="mobile-month-grid">
      {monthsData.map(({ m, data }) => {
        const tot = sumHours(data);
        const settings = monthlySettings[m];
        return (
          <button
            key={m}
            type="button"
            onClick={() => onPickMonth(m)}
            className={"mobile-month-item sketch-box tight" + (m === monthIdx ? " active" : "")}
          >
            <div className="row between" style={{ alignItems: "center" }}>
              <span className="caveat" style={{ fontSize: 16 }}>{t.monthsShort[m]}</span>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--ink)",
                background: statusColor(tot, settings),
              }} />
            </div>
            <div className="mono" style={{ fontSize: 10 }}>{fmtH(tot, settings.hourDisplay)}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── App ────────────────────────────────────────────────
export default function App() {
  const today = new Date();
  const initPreferences = loadSettings();
  const initSettingsPeriods = ensureSettingsPeriods({}, loadSettingsPeriods());

  const [preferences,  setPreferences]  = useState<SettingsPreferences>(initPreferences);
  const [settingsPeriods, setSettingsPeriods] = useState<SettingsPeriodMap>(initSettingsPeriods);
  const [lang,         setLang]         = useState<Lang>(initPreferences.lang);
  const [dark,         setDark]         = useState(initPreferences.dark);
  const [year,         setYear]         = useState(today.getFullYear());
  const [monthIdx,     setMonthIdx]     = useState(today.getMonth());
  const [view,         setView]         = useState<View>("calendar");
  const [editDay,      setEditDay]      = useState<DayData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tick,         setTick]         = useState(0);
  const [holidayDates, setHolidayDates] = useState<ReadonlySet<string> | null>(null);
  const [workImportAccept, setWorkImportAccept] = useState(".csv,.json,.yaml,.yml");
  const [settingsImportAccept, setSettingsImportAccept] = useState(".json,.yaml,.yml");
  const workFileInputRef = useRef<HTMLInputElement | null>(null);
  const settingsFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    document.documentElement.lang = lang;
  }, [dark, lang]);

  const t = I18N[lang];
  const currentMonthSettings = useMemo(
    () => resolveSettingsForDate(preferences, settingsPeriods, isoDate(year, monthIdx, 1)),
    [preferences, settingsPeriods, year, monthIdx],
  );
  const yearSettings = useMemo(
    () => resolveSettingsForDate(preferences, settingsPeriods, isoDate(year, 0, 1)),
    [preferences, settingsPeriods, year],
  );
  const monthlySettings = useMemo(
    () => Array.from({ length: 12 }, (_, month) => resolveSettingsForDate(preferences, settingsPeriods, isoDate(year, month, 1))),
    [preferences, settingsPeriods, year],
  );
  const settings = currentMonthSettings;

  useEffect(() => {
    let cancelled = false;
    if (!hasAnyHolidayPeriod(settingsPeriods)) {
      setHolidayDates(null);
      return;
    }

    loadHolidayDates(year).then(dates => {
      if (!cancelled) setHolidayDates(dates);
    });

    return () => {
      cancelled = true;
    };
  }, [year, settingsPeriods]);

  const monthsData = useMemo(
    () => buildMonthsData(year, preferences, settingsPeriods, holidayDates ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, preferences, settingsPeriods, holidayDates, tick],
  );

  const currentMonthData = monthsData[monthIdx].data;
  const currentTotal     = sumHours(currentMonthData);
  const currentOvertimeTotal = sumOvertimeHours(currentMonthData, currentMonthSettings.dayHours);
  const yearTotal        = monthsData.reduce((s, m) => s + sumHours(m.data), 0);
  const yearOvertimeTotal = monthsData.reduce((s, m) => s + sumOvertimeHours(m.data, yearSettings.dayHours), 0);

  const handleSaveSettings = (newPreferences: SettingsPreferences, newPeriods: SettingsPeriodMap) => {
    const merged = mergeSettingsPreferences(newPreferences);
    const normalizedPeriods = ensureSettingsPeriods({}, newPeriods);
    setPreferences(merged);
    setSettingsPeriods(normalizedPeriods);
    setLang(merged.lang);
    setDark(merged.dark);
    saveSettings(merged);
    saveSettingsPeriods(normalizedPeriods);
    setSettingsOpen(false);
    setTick(n => n + 1);
  };

  const handleDayClick = (dayObj: DayData) => {
    setEditDay(dayObj);
  };

  const handleSaveDay = (entry: Entry | null) => {
    if (entry && editDay) saveEntry(editDay.dateStr, entry);
    setEditDay(null);
    setTick(n => n + 1);
  };

  const handleFillRegularHours = () => {
    const targets = currentMonthData.filter(d => d.isWorking && !d.isHoliday);
    const hasExisting = targets.some(d => d.entry.start || d.entry.end || d.entry.vac);
    if (hasExisting && !window.confirm(t.bulkRegularOverwriteConfirm)) return;

    for (const day of targets) {
      const daySettings = resolveSettingsForDate(preferences, settingsPeriods, day.dateStr);
      const totalMinutes = daySettings.dayHours * 60 + daySettings.breakMin;
      const end = addMinutesToTime(daySettings.dayStart, totalMinutes);
      if (!end) {
        window.alert(`${t.bulkRegularTimeOverflow}\n${day.dateStr}`);
        return;
      }
      saveEntry(day.dateStr, {
        start: daySettings.dayStart,
        end,
        brk: daySettings.breakMin,
        vac: false,
      });
    }
    setTick(n => n + 1);
  };

  const handleLang = (v: Lang) => {
    setLang(v);
    const merged = mergeSettingsPreferences({ ...preferences, lang: v });
    setPreferences(merged);
    saveSettings(merged);
  };

  const handleDark = () => {
    const v = !dark;
    setDark(v);
    const merged = mergeSettingsPreferences({ ...preferences, dark: v });
    setPreferences(merged);
    saveSettings(merged);
  };

  const downloadText = (filename: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFileText = async (file: File): Promise<string> => file.text();

  const importWorkFile = async (file: File) => {
    const text = await readFileText(file);
    const lower = file.name.toLowerCase();
    const parsed = lower.endsWith(".csv")
      ? parseWorkEntriesCsv(text)
      : lower.endsWith(".yaml") || lower.endsWith(".yml")
        ? parseWorkEntriesText(text, "yaml")
        : parseWorkEntriesText(text, "json");

    if (!parsed.ok) {
      window.alert(`${t.fileValidationError}\n${parsed.errors.join("\n")}`);
      return;
    }

    for (const entry of parsed.value.entries) {
      saveEntry(entry.date, {
        start: entry.start,
        end: entry.end,
        brk: entry.breakMin,
        vac: entry.vacation,
      });
    }
    window.alert(`${t.fileImportSuccess}\n${t.workFile}`);
    setTick(n => n + 1);
  };

  const importSettingsFile = async (file: File) => {
    const text = await readFileText(file);
    const lower = file.name.toLowerCase();
    const parsed = lower.endsWith(".yaml") || lower.endsWith(".yml")
      ? parseSettingsText(text, "yaml")
      : parseSettingsText(text, "json");

    if (!parsed.ok) {
      window.alert(`${t.fileValidationError}\n${parsed.errors.join("\n")}`);
      return;
    }

    const ensuredPeriods = ensureSettingsPeriods({}, parsed.value.periods);
    setPreferences(parsed.value.preferences);
    setSettingsPeriods(ensuredPeriods);
    setLang(parsed.value.preferences.lang);
    setDark(parsed.value.preferences.dark);
    saveSettings(parsed.value.preferences);
    saveSettingsPeriods(ensuredPeriods);
    window.alert(`${t.fileImportSuccess}\n${t.settingsFile}`);
    setTick(n => n + 1);
  };

  const handleImportFile = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: "work" | "settings",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (kind === "work") {
        await importWorkFile(file);
      } else {
        await importSettingsFile(file);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.fileImportError;
      window.alert(`${t.fileImportError}\n${message}`);
    } finally {
      event.target.value = "";
    }
  };

  const exportSettings = (format: "json" | "yaml") => {
    const text = serializeSettingsFile(createSettingsFile(preferences, settingsPeriods), format);
    downloadText(
      `settings.${format === "json" ? "json" : "yaml"}`,
      text,
      format === "json" ? "application/json" : "application/yaml",
    );
  };

  const triggerWorkImport = (accept: string) => {
    setWorkImportAccept(accept);
    workFileInputRef.current?.click();
  };

  const triggerSettingsImport = (accept: string) => {
    setSettingsImportAccept(accept);
    settingsFileInputRef.current?.click();
  };

  const importMenuItems = [
    { label: `${t.workFile} CSV`, onSelect: () => triggerWorkImport(".csv") },
    { label: `${t.workFile} JSON`, onSelect: () => triggerWorkImport(".json") },
    { label: `${t.workFile} YAML`, onSelect: () => triggerWorkImport(".yaml,.yml") },
    { label: `${t.settingsFile} JSON`, onSelect: () => triggerSettingsImport(".json") },
    { label: `${t.settingsFile} YAML`, onSelect: () => triggerSettingsImport(".yaml,.yml") },
  ];

  const exportMenuItems = [
    { label: `${t.workFile} CSV`, onSelect: () => exportCSV(monthsData, year) },
    { label: `${t.workFile} JSON`, onSelect: () => exportJSON(monthsData, year) },
    { label: `${t.workFile} YAML`, onSelect: () => exportYAML(monthsData, year) },
    { label: `${t.settingsFile} JSON`, onSelect: () => exportSettings("json") },
    { label: `${t.settingsFile} YAML`, onSelect: () => exportSettings("yaml") },
  ];

  // ── Calendar view ────────────────────────────────────
  const CalendarView = () => (
    <div>
      <div className="row between mb-8" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontSize: 28 }}>{t.months[monthIdx]} {year}</h2>
          <span className="mono muted small">{t.monthTarget}: {fmtRange(settings.monthTargetMin, settings.monthTargetMax, settings.hourDisplay)}</span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <button className="btn sm" onClick={handleFillRegularHours}>{t.bulkRegularFill}</button>
          <span className="caveat" aria-label={t.totalHours} style={{ fontSize: 22 }}>{fmtH(currentTotal, settings.hourDisplay)}</span>
          <DeltaChip value={currentTotal} min={settings.monthTargetMin} max={settings.monthTargetMax}
            hourDisplay={settings.hourDisplay} t={t} />
        </div>
      </div>
      <RangeProgress min={settings.monthTargetMin} max={settings.monthTargetMax}
        value={currentTotal} hardMax={settings.monthTargetMax * 1.4} height={18} />
      <div className="sketch-box tight mt-12" style={{ padding: 10 }}>
        <div className="row between" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="mono muted small">
              {t.targetValue}: {fmtH(settings.monthOvertimeTargetMin, settings.hourDisplay)} / {t.limitValue}: {fmtH(settings.monthOvertimeTargetMax, settings.hourDisplay)}
            </span>
          </div>
          <div className="row gap-8" style={{ alignItems: "center" }}>
            <span className="caveat" aria-label={t.overtime} style={{ fontSize: 20 }}>{fmtH(currentOvertimeTotal, settings.hourDisplay)}</span>
            <DeltaChip value={currentOvertimeTotal} min={settings.monthOvertimeTargetMin} max={settings.monthOvertimeTargetMax}
              hourDisplay={settings.hourDisplay} t={t} mode="ceiling" />
          </div>
        </div>
        <div className="mt-8">
          <RangeProgress
            min={settings.monthOvertimeTargetMin}
            max={settings.monthOvertimeTargetMax}
            value={currentOvertimeTotal}
            hardMax={Math.max(settings.monthOvertimeTargetMax * 1.4, currentOvertimeTotal * 1.1, settings.monthOvertimeTargetMax + 10, 10)}
            height={14}
            mode="ceiling"
          />
        </div>
      </div>
      <div className="mt-12">
        <MonthCalendar year={year} month={monthIdx} data={currentMonthData}
          hourDisplay={settings.hourDisplay}
          t={t} showHolidayTint={settings.showHolidays} onDayClick={handleDayClick} />
      </div>
      <div className="row between mt-12" style={{ flexWrap: "wrap", gap: 8 }}>
        <Legend t={t} />
      </div>
    </div>
  );

  // ── Chart view ───────────────────────────────────────
  const ChartView = () => (
    <div>
      <div className="row between mb-8" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontSize: 28 }}>{year} · {t.year} {t.progress}</h2>
          <span className="mono muted small">{t.yearTarget}: {fmtRange(yearSettings.yearTargetMin, yearSettings.yearTargetMax, settings.hourDisplay)}</span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <span className="caveat" style={{ fontSize: 22 }}>{fmtH(yearTotal, settings.hourDisplay)}</span>
          <DeltaChip value={yearTotal} min={yearSettings.yearTargetMin} max={yearSettings.yearTargetMax}
            hourDisplay={settings.hourDisplay} t={t} />
        </div>
      </div>
      <div className="sketch-box tight" style={{ padding: "10px 8px 6px" }}>
        <YearTimelineChart
          monthsData={monthsData} year={year}
          targetMin={settings.monthTargetMin} targetMax={settings.monthTargetMax}
          targetsByMonth={monthlySettings.map(monthSettings => ({ min: monthSettings.monthTargetMin, max: monthSettings.monthTargetMax }))}
          hourDisplay={settings.hourDisplay}
          currentMonthIdx={monthIdx} onPickMonth={setMonthIdx}
          height={280} t={t}
        />
      </div>
      <div className="row between mt-12 mb-8" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h3 style={{ fontSize: 22 }}>{year} · {t.overtime} {t.progress}</h3>
          <span className="mono muted small">
            {t.targetValue}: {fmtH(yearSettings.yearOvertimeTargetMin, settings.hourDisplay)} / {t.limitValue}: {fmtH(yearSettings.yearOvertimeTargetMax, settings.hourDisplay)}
          </span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <span className="caveat" style={{ fontSize: 20 }}>{fmtH(yearOvertimeTotal, settings.hourDisplay)}</span>
          <DeltaChip value={yearOvertimeTotal} min={yearSettings.yearOvertimeTargetMin} max={yearSettings.yearOvertimeTargetMax}
            hourDisplay={settings.hourDisplay} t={t} mode="ceiling" />
        </div>
      </div>
      <div className="sketch-box tight" style={{ padding: "10px 8px 6px" }}>
        <YearTimelineChart
          monthsData={monthsData} year={year}
          targetMin={settings.monthOvertimeTargetMin} targetMax={settings.monthOvertimeTargetMax}
          targetsByMonth={monthlySettings.map(monthSettings => ({ min: monthSettings.monthOvertimeTargetMin, max: monthSettings.monthOvertimeTargetMax }))}
          hourDisplay={settings.hourDisplay}
          currentMonthIdx={monthIdx} onPickMonth={setMonthIdx}
          height={240} t={t}
          mode="overtime"
          regularDayHours={settings.dayHours}
        />
      </div>
      <div className="mt-12" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          {
            label: t.regular,
            val: fmtH(monthsData.reduce((s, m) => s + sumKindHours(m.data, "reg"), 0), settings.hourDisplay),
          },
          {
            label: t.overtime,
            val: fmtHoursWithSign(
              yearOvertimeTotal,
              settings.hourDisplay,
              "+",
            ),
          },
          {
            label: t.weekendWork,
            val: fmtH(monthsData.reduce((s, m) => s + sumKindHours(m.data, "wknd"), 0), settings.hourDisplay),
          },
          {
            label: t.vacation,
            val: monthsData.reduce((s, m) => s + m.data.filter(d => d.kind === "vac").length, 0) + "d",
          },
        ].map((x, i) => (
          <div key={i} className="sketch-box tight" style={{ padding: 8, textAlign: "center" }}>
            <div className="mono small muted">{x.label}</div>
            <div className="caveat" style={{ fontSize: 20, lineHeight: 1 }}>{x.val}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────
  return (
    <div className="app-shell">
      <div className="desktop-frame">
        {/* Header */}
        <AppHeader
          t={t}
          lang={lang}
          onLang={handleLang}
          dark={dark}
          onDark={handleDark}
          onSettings={() => setSettingsOpen(true)}
          importItems={importMenuItems}
          exportItems={exportMenuItems}
          mobileMenu={close => (
            <>
              <div className="mobile-menu-section">
                <div className="mobile-menu-title">{t.allMonths}</div>
                <MobileMonthGrid
                  monthsData={monthsData}
                  monthIdx={monthIdx}
                  monthlySettings={monthlySettings}
                  t={t}
                  onPickMonth={m => {
                    setMonthIdx(m);
                    close();
                  }}
                />
              </div>
              <div className="mobile-menu-section">
                <label className="mobile-menu-row">
                  <span>{t.lang}</span>
                  <select value={lang} onChange={e => handleLang(e.target.value as Lang)}>
                    <option value="ja">JA 日本語</option>
                    <option value="en">EN English</option>
                  </select>
                </label>
                <button className="mobile-menu-row as-button" type="button" onClick={handleDark}>
                  <span>{t.dark}</span>
                  <span className="mobile-menu-value">{dark ? "☀" : "☾"}</span>
                </button>
                <button
                  className="mobile-menu-row as-button"
                  type="button"
                  onClick={() => {
                    setSettingsOpen(true);
                    close();
                  }}
                >
                  <span>{t.settings}</span>
                  <span className="mobile-menu-value">›</span>
                </button>
              </div>
            </>
          )}
        />

        {/* Desktop: 2-pane */}
        <div className="desktop-only" style={{ minHeight: 560, alignItems: "stretch" }}>
          <Sidebar year={year} monthIdx={monthIdx} monthsData={monthsData}
            settings={yearSettings} monthlySettings={monthlySettings} t={t} onPickMonth={setMonthIdx} />
          <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
            <div className="row between mb-12" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <ViewTabs view={view} setView={setView} t={t} />
              <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                <button className="btn sm" onClick={() => setYear(y => y - 1)}>← {year - 1}</button>
                <button className="btn sm" onClick={() => setMonthIdx(m => Math.max(0, m - 1))}>‹ {t.prev}</button>
                <button className="btn sm" onClick={() => setMonthIdx(m => Math.min(11, m + 1))}>{t.next} ›</button>
                <button className="btn sm" onClick={() => setYear(y => y + 1)}>{year + 1} →</button>
              </div>
            </div>
            {view === "calendar" ? <CalendarView /> : <ChartView />}
          </div>
        </div>

        {/* Mobile: stacked */}
        <div className="mobile-only" style={{ flexDirection: "column", padding: 10 }}>
          <div className="row between mb-8" style={{ alignItems: "center" }}>
            <div className="row gap-4">
              <button className="btn sm" onClick={() => setMonthIdx(m => Math.max(0, m - 1))}>‹</button>
              <span className="caveat" style={{ fontSize: 20 }}>{t.months[monthIdx]} {year}</span>
              <button className="btn sm" onClick={() => setMonthIdx(m => Math.min(11, m + 1))}>›</button>
            </div>
            <div className="row gap-4">
              <button className="btn sm" onClick={() => setYear(y => y - 1)}>‹{year - 1}</button>
              <button className="btn sm" onClick={() => setYear(y => y + 1)}>{year + 1}›</button>
            </div>
          </div>
          <ViewTabs view={view} setView={setView} t={t} />
          <div className="mt-12">
            {view === "calendar" ? <CalendarView /> : <ChartView />}
          </div>
        </div>
      </div>

      <div className="mono small muted" style={{ textAlign: "center", marginTop: 12 }}>
        {t.privacyNotice}
      </div>

      {editDay && (
        <DayModal dayObj={editDay} year={year} month={monthIdx}
          settings={resolveSettingsForDate(preferences, settingsPeriods, editDay.dateStr)} t={t}
          onSave={handleSaveDay} onClose={() => setEditDay(null)} />
      )}
      {settingsOpen && (
        <SettingsModal preferences={preferences} settingsPeriods={settingsPeriods} t={t}
          onSave={handleSaveSettings} onClose={() => setSettingsOpen(false)} />
      )}
      <input
        ref={workFileInputRef}
        type="file"
        accept={workImportAccept}
        hidden
        onChange={event => { void handleImportFile(event, "work"); }}
      />
      <input
        ref={settingsFileInputRef}
        type="file"
        accept={settingsImportAccept}
        hidden
        onChange={event => { void handleImportFile(event, "settings"); }}
      />
    </div>
  );
}
