import { useEffect, useMemo, useState } from "react";
import type { DayData, Entry, Lang, MonthData, Settings } from "./types";
import I18N from "./i18n";
import { loadSettings, mergeSettings, saveSettings, saveEntry } from "./storage";
import { loadHolidayDates } from "./holidays";
import { addMinutesToTime, buildMonthsData, sumHours, exportCSV, exportJSON } from "./utils";

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
            <div className="mono" style={{ fontSize: 10 }}>{tot}h</div>
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

  const [settings,     setSettings]     = useState<Settings>(initSettings);
  const [lang,         setLang]         = useState<Lang>(initSettings.lang);
  const [dark,         setDark]         = useState(initSettings.dark);
  const [year,         setYear]         = useState(today.getFullYear());
  const [monthIdx,     setMonthIdx]     = useState(today.getMonth());
  const [view,         setView]         = useState<View>("calendar");
  const [editDay,      setEditDay]      = useState<DayData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tick,         setTick]         = useState(0);
  const [holidayDates, setHolidayDates] = useState<ReadonlySet<string> | null>(null);

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
    () => buildMonthsData(year, settings, holidayDates ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, settings, holidayDates, tick],
  );

  const currentMonthData = monthsData[monthIdx].data;
  const currentTotal     = sumHours(currentMonthData);
  const yearTotal        = monthsData.reduce((s, m) => s + sumHours(m.data), 0);

  const handleSaveSettings = (newS: Settings) => {
    const merged = mergeSettings(newS);
    setSettings(merged);
    setLang(merged.lang);
    setDark(merged.dark);
    saveSettings(merged);
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
    const totalMinutes = settings.dayHours * 60 + settings.breakMin;
    const end = addMinutesToTime(settings.dayStart, totalMinutes);
    if (!end) {
      window.alert(t.bulkRegularTimeOverflow);
      return;
    }

    const targets = currentMonthData.filter(d => d.isWorking && !d.isHoliday);
    const hasExisting = targets.some(d => d.entry.start || d.entry.end || d.entry.vac);
    if (hasExisting && !window.confirm(t.bulkRegularOverwriteConfirm)) return;

    for (const day of targets) {
      saveEntry(day.dateStr, {
        start: settings.dayStart,
        end,
        brk: settings.breakMin,
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

  // ── Calendar view ────────────────────────────────────
  const CalendarView = () => (
    <div>
      <div className="row between mb-8" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontSize: 28 }}>{t.months[monthIdx]} {year}</h2>
          <span className="mono muted small">{t.monthTarget}: {settings.monthTargetMin}–{settings.monthTargetMax}h</span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <button className="btn sm" onClick={handleFillRegularHours}>{t.bulkRegularFill}</button>
          <span className="caveat" style={{ fontSize: 22 }}>{currentTotal}h</span>
          <DeltaChip value={currentTotal} min={settings.monthTargetMin} max={settings.monthTargetMax} t={t} />
        </div>
      </div>
      <RangeProgress min={settings.monthTargetMin} max={settings.monthTargetMax}
        value={currentTotal} hardMax={settings.monthTargetMax * 1.4} height={18} />
      <div className="mt-12">
        <MonthCalendar year={year} month={monthIdx} data={currentMonthData}
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
          <span className="mono muted small">{t.yearTarget}: {settings.yearTargetMin}–{settings.yearTargetMax}h</span>
        </div>
        <div className="row gap-8" style={{ alignItems: "center" }}>
          <span className="caveat" style={{ fontSize: 22 }}>{yearTotal}h</span>
          <DeltaChip value={yearTotal} min={settings.yearTargetMin} max={settings.yearTargetMax} t={t} />
        </div>
      </div>
      <div className="sketch-box tight" style={{ padding: "10px 8px 6px" }}>
        <YearTimelineChart
          monthsData={monthsData} year={year}
          targetMin={settings.monthTargetMin} targetMax={settings.monthTargetMax}
          currentMonthIdx={monthIdx} onPickMonth={setMonthIdx}
          height={280} t={t}
        />
      </div>
      <div className="mt-12" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          {
            label: t.regular,
            val: Math.round(monthsData.reduce((s, m) => s + m.data.filter(d => d.kind === "reg").reduce((a, d) => a + d.hrs, 0), 0) * 10) / 10 + "h",
          },
          {
            label: t.overtime,
            val: "+" + Math.round(monthsData.reduce((s, m) => s + m.data.filter(d => d.kind === "ot").reduce((a, d) => a + Math.max(0, d.hrs - settings.dayHours), 0), 0) * 10) / 10 + "h",
          },
          {
            label: t.weekendWork,
            val: Math.round(monthsData.reduce((s, m) => s + m.data.filter(d => d.kind === "wknd").reduce((a, d) => a + d.hrs, 0), 0) * 10) / 10 + "h",
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
        <AppHeader t={t} lang={lang} onLang={handleLang} dark={dark} onDark={handleDark}
          onSettings={() => setSettingsOpen(true)} />

        {/* Desktop: 2-pane */}
        <div className="desktop-only" style={{ minHeight: 560, alignItems: "stretch" }}>
          <Sidebar year={year} monthIdx={monthIdx} monthsData={monthsData}
            settings={settings} t={t} onPickMonth={setMonthIdx} />
          <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
            <div className="row between mb-12" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <ViewTabs view={view} setView={setView} lang={lang} />
              <div className="row gap-8">
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
            {view === "calendar" ? <CalendarView /> : <ChartView />}
          </div>
          <div className="sketch-divider" />
          <div className="caveat mb-8" style={{ fontSize: 18 }}>{year} · {t.allMonths}</div>
          <MobileMonthGrid monthsData={monthsData} monthIdx={monthIdx}
            settings={settings} t={t} onPickMonth={setMonthIdx} />
          <div className="sketch-divider" />
          <div className="row gap-4">
            <button className="btn sm" onClick={() => exportCSV(monthsData, year)}>⤓ CSV</button>
            <button className="btn sm" onClick={() => exportJSON(monthsData, year)}>⤓ JSON</button>
          </div>
        </div>
      </div>

      <div className="mono small muted" style={{ textAlign: "center", marginTop: 12 }}>
        {lang === "ja"
          ? "データはすべてブラウザ内に保存されます"
          : "All data is stored locally in your browser"}
      </div>

      {editDay && (
        <DayModal dayObj={editDay} year={year} month={monthIdx}
          settings={settings} t={t}
          onSave={handleSaveDay} onClose={() => setEditDay(null)} />
      )}
      {settingsOpen && (
        <SettingsModal settings={settings} t={t}
          onSave={handleSaveSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
