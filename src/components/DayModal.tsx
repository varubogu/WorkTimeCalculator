import { useState } from "react";
import type { DayData, Entry, Settings, Translations } from "../types";
import { netMinutes, fmtH } from "../utils";
import { clearEntry } from "../storage";

interface Props {
  dayObj: DayData;
  year: number;
  month: number;
  settings: Settings;
  t: Translations;
  onSave: (entry: Entry | null) => void;
  onClose: () => void;
}

export default function DayModal({ dayObj, year, month, settings, t, onSave, onClose }: Props) {
  const [entry, setEntry] = useState<Entry>({
    start: dayObj.entry.start || "",
    end:   dayObj.entry.end   || "",
    brk:   typeof dayObj.entry.brk === "number" ? dayObj.entry.brk : settings.breakMin,
    vac:   !!dayObj.entry.vac,
  });

  const net = (!entry.vac && entry.start && entry.end)
    ? netMinutes(entry.start, entry.end, entry.brk)
    : null;
  const hrsStr = net !== null ? fmtH(net / 60, settings.hourDisplay) : null;
  const timeStepSeconds = Math.max(1, Math.floor(settings.timeStepMin || 1)) * 60;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card sketch-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="caveat" style={{ fontSize: 22 }}>
            {year}-{String(month + 1).padStart(2, "0")}-{String(dayObj.d).padStart(2, "0")}
            {dayObj.isHoliday && <span className="mono muted" style={{ fontSize: 11, marginLeft: 6 }}>{t.holiday}</span>}
          </span>
          <button className="btn sm" onClick={onClose}>✕</button>
        </div>

        <label className="modal-field">
          <span className="mono small muted">{t.startTime}</span>
          <input type="time" className="modal-time-input" value={entry.start}
            step={timeStepSeconds}
            disabled={entry.vac}
            onChange={e => setEntry(p => ({ ...p, start: e.target.value }))} />
        </label>

        <label className="modal-field">
          <span className="mono small muted">{t.endTime}</span>
          <input type="time" className="modal-time-input" value={entry.end}
            step={timeStepSeconds}
            disabled={entry.vac}
            onChange={e => setEntry(p => ({ ...p, end: e.target.value }))} />
        </label>

        <label className="modal-field">
          <span className="mono small muted">{t.breakTime} ({t.minutes})</span>
          <input type="number" className="modal-num-input" value={entry.brk}
            min="0" max="480" step="1" disabled={entry.vac}
            onChange={e => setEntry(p => ({ ...p, brk: parseInt(e.target.value) || 0 }))} />
        </label>

        <label className="modal-field row-field">
          <input type="checkbox" checked={entry.vac}
            onChange={e => setEntry(p => ({ ...p, vac: e.target.checked }))} />
          <span className="mono small">{t.vacation}</span>
        </label>

        {hrsStr && (
          <div className="modal-computed caveat" style={{ fontSize: 20 }}>
            {hrsStr}
          </div>
        )}

        <div className="row gap-8 mt-12" style={{ justifyContent: "space-between" }}>
          <button className="btn sm" style={{ color: "var(--accent-bad)" }}
            onClick={() => { clearEntry(dayObj.dateStr); onSave(null); }}>
            {t.clear}
          </button>
          <div className="row gap-8">
            <button className="btn sm" onClick={onClose}>{t.cancel}</button>
            <button className="btn sm primary" onClick={() => onSave(entry)}>{t.save}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
