import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DayData, Entry, Lang, MonthData, Settings, SettingsPeriod } from "./types";
import I18N from "./i18n";
import {
  ensureSettingsPeriods,
  findFirstMissingSettingsDate,
  isoDate,
  loadSettings,
  loadSettingsPeriods,
  mergeSettings,
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

function ViewTabs({ view, setView, lang }: { view: View; setView: (v: View) => void; lang: Lang }) {
  return (
    <div className="tab-bar">
      <div className={"tab" + (view === "calendar" ? " active" : "")} onClick={() => setView("calendar")}>
        {lang === "ja" ? "カレンダー" : "Calendar"}
      </div>
      <div className={"tab" + (view === "chart" ? " active" : "")} onClick={() => setView("chart")}>
        {lang === "ja" ? "チャート" : "Chart"}
      </div>
    </div>
  );
}

// ── Mobile month grid ──────────────────────────────────
function MobileMonthGrid({
  monthsData, monthIdx, settings, t, onPickMonth,
}: {
  monthsData: MonthData[];
  monthIdx: number;
  settings: Settings;
  t: (typeof I18N)[Lang];
  onPickMonth: (m: number) => void;
}) {
  function statusColor(tot: number) {
    return tot < settings.monthTargetMin ? "var(--accent-warn)"
      : tot > settings.monthTargetMax ? "var(--accent-bad)"
      : "var(--accent-ok)";
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
      {monthsData.map(({ m, data }) => {
        const tot = sumHours(data);
        return (
          <div key={m} onClick={() => onPickMonth(m)}
            className="sketch-box tight"
            style={{
              padding: 6, cursor: "pointer",
              outline: m === monthIdx ? "2.5px solid var(--accent-sel)" : "none",
              outlineOffset: -2,
            }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <span className="caveat" style={{ fontSize: 16 }}>{t.monthsShort[m]}</span>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--ink)",
                background: statusColor(tot),
              }} />
            </div>
            <div className="mono" style={{ fontSize: 10 }}>{fmtH(tot, settings.hourDisplay)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── App ────────────────────────────────────────────────
export default function App() {
  const today = new Date();
  const initSettings = loadSettings();
  const initSettingsPeriods = ensureSettingsPeriods(initSettings, loadSettingsPeriods());

  const [settings,     setSettings]     = useState<Settings>(initSettings);
  const [settingsPeriods, setSettingsPeriods] = useState<SettingsPeriod[]>(initSettingsPeriods);
  const [lang,         setLang]         = useState<Lang>(initSettings.lang);
  const [dark,         setDark]         = useState(initSettings.dark);
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

  useEffect(() => {
    let cancelled = false;
    if (!settings.showHolidays) {
      setHolidayDates(null);
      return;
    }

    loadHolidayDates(year).then(dates => {
      if (!cancelled) setHolidayDates(dates);
    });

    return () => {
      cancelled = true;
    };
  }, [year, settings.showHolidays]);

  const monthsData = useMemo(
    () => buildMonthsData(year, settings, settingsPeriods, holidayDates ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, settings, settingsPeriods, holidayDates, tick],
  );
  const missingSettingsDate = useMemo(
    () => findFirstMissingSettingsDate(settingsPeriods, isoDate(year, 0, 1), isoDate(year, 11, 31)),
    [settingsPeriods, year],
  );

  const currentMonthData = monthsData[monthIdx].data;
  const currentTotal     = sumHours(currentMonthData);
  const currentOvertimeTotal = sumOvertimeHours(currentMonthData, settings.dayHours);
  const yearTotal        = monthsData.reduce((s, m) => s + sumHours(m.data), 0);
  const yearOvertimeTotal = monthsData.reduce((s, m) => s + sumOvertimeHours(m.data, settings.dayHours), 0);

  const handleSaveSettings = (newS: Settings, newPeriods: SettingsPeriod[]) => {
    const merged = mergeSettings(newS);
    const normalizedPeriods = ensureSettingsPeriods(merged, newPeriods);
    setSettings(merged);
    setSettingsPeriods(normalizedPeriods);
    setLang(merged.lang);
    setDark(merged.dark);
    saveSettings(merged);
    saveSettingsPeriods(normalizedPeriods);
    setSettingsOpen(false);
    setTick(n => n + 1);
  };

  const handleDayClick = (dayObj: DayData) => {
    if (dayObj.hasMissingSettings) {
      window.alert(`${t.settingsPeriodMissing}\n${dayObj.dateStr}`);
      return;
    }
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
      const daySettings = resolveSettingsForDate(settings, settingsPeriods, day.dateStr);
      if (!daySettings) {
        window.alert(`${t.settingsPeriodMissing}\n${day.dateStr}`);
        return;
      }
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
    const merged = { ...settings, lang: v };
    setSettings(merged);
    saveSettings(merged);
  };

  const handleDark = () => {
    const v = !dark;
    setDark(v);
    const merged = { ...settings, dark: v };
    setSettings(merged);
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

    const ensuredPeriods = ensureSettingsPeriods(parsed.value.baseSettings, parsed.value.periods);
    setSettings(parsed.value.baseSettings);
    setSettingsPeriods(ensuredPeriods);
    setLang(parsed.value.baseSettings.lang);
    setDark(parsed.value.baseSettings.dark);
    saveSettings(parsed.value.baseSettings);
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
    const text = serializeSettingsFile(createSettingsFile(settings, settingsPeriods), format);
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
        <span className="mono muted small">{t.click} → {t.addEntry}</span>
      </div>
    </div>
  );

  // ── Chart view ───────────────────────────────────────
  const ChartView = () => (
    <div>
      <div className="row between mb-8" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontSize: 28 }}>{year} · {t.year} {t.progress}</h2>
          <span className="mono muted small">{t.yearTarget}: {fmtRange(settings.yearTargetMin, settings.yearTargetMax, settings.hourDisplay)}</span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <span className="caveat" style={{ fontSize: 22 }}>{fmtH(yearTotal, settings.hourDisplay)}</span>
          <DeltaChip value={yearTotal} min={settings.yearTargetMin} max={settings.yearTargetMax}
            hourDisplay={settings.hourDisplay} t={t} />
        </div>
      </div>
      <div className="sketch-box tight" style={{ padding: "10px 8px 6px" }}>
        <YearTimelineChart
          monthsData={monthsData} year={year}
          targetMin={settings.monthTargetMin} targetMax={settings.monthTargetMax}
          hourDisplay={settings.hourDisplay}
          currentMonthIdx={monthIdx} onPickMonth={setMonthIdx}
          height={280} t={t}
        />
      </div>
      <div className="row between mt-12 mb-8" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h3 style={{ fontSize: 22 }}>{year} · {t.overtime} {t.progress}</h3>
          <span className="mono muted small">
            {t.targetValue}: {fmtH(settings.yearOvertimeTargetMin, settings.hourDisplay)} / {t.limitValue}: {fmtH(settings.yearOvertimeTargetMax, settings.hourDisplay)}
          </span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <span className="caveat" style={{ fontSize: 20 }}>{fmtH(yearOvertimeTotal, settings.hourDisplay)}</span>
          <DeltaChip value={yearOvertimeTotal} min={settings.yearOvertimeTargetMin} max={settings.yearOvertimeTargetMax}
            hourDisplay={settings.hourDisplay} t={t} mode="ceiling" />
        </div>
      </div>
      <div className="sketch-box tight" style={{ padding: "10px 8px 6px" }}>
        <YearTimelineChart
          monthsData={monthsData} year={year}
          targetMin={settings.monthOvertimeTargetMin} targetMax={settings.monthOvertimeTargetMax}
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
        />

        {/* Desktop: 2-pane */}
        <div className="desktop-only" style={{ minHeight: 560, alignItems: "stretch" }}>
          <Sidebar year={year} monthIdx={monthIdx} monthsData={monthsData}
            settings={settings} t={t} onPickMonth={setMonthIdx} />
          <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
            <div className="row between mb-12" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <ViewTabs view={view} setView={setView} lang={lang} />
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
          <ViewTabs view={view} setView={setView} lang={lang} />
          <div className="mt-12">
            {missingSettingsDate && (
              <div className="sketch-box warning-box mb-12">
                {t.settingsPeriodMissing} {missingSettingsDate}
              </div>
            )}
            {view === "calendar" ? <CalendarView /> : <ChartView />}
          </div>
          <div className="sketch-divider" />
          <div className="caveat mb-8" style={{ fontSize: 18 }}>{year} · {t.allMonths}</div>
          <MobileMonthGrid monthsData={monthsData} monthIdx={monthIdx}
            settings={settings} t={t} onPickMonth={setMonthIdx} />
          {missingSettingsDate && (
            <div className="sketch-box warning-box mb-12">
              {t.settingsPeriodMissing} {missingSettingsDate}
            </div>
          )}
        </div>
      </div>

      <div className="mono small muted" style={{ textAlign: "center", marginTop: 12 }}>
        {lang === "ja"
          ? "データはすべてブラウザ内に保存されます"
          : "All data is stored locally in your browser"}
      </div>

      {editDay && (
        <DayModal dayObj={editDay} year={year} month={monthIdx}
          settings={resolveSettingsForDate(settings, settingsPeriods, editDay.dateStr) ?? settings} t={t}
          onSave={handleSaveDay} onClose={() => setEditDay(null)} />
      )}
      {settingsOpen && (
        <SettingsModal settings={settings} settingsPeriods={settingsPeriods} t={t}
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
