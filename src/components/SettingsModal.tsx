import { useState } from "react";
import type { Settings, Translations } from "../types";

interface Props {
  settings: Settings;
  t: Translations;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, t, onSave, onClose }: Props) {
  const [s, setS] = useState<Settings>({ ...settings });

  const numInput = (key: keyof Settings, min: number, max: number, step = 1) => (
    <input
      type="number"
      value={s[key] as number}
      min={min} max={max}
      step={step}
      style={{
        width: 90, textAlign: "right",
        fontFamily: "JetBrains Mono,monospace", fontSize: 12,
        border: "1.5px solid var(--ink)", background: "var(--paper)",
        padding: "3px 7px", borderRadius: 4, outline: "none", color: "var(--ink)",
      }}
      onChange={e => setS(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
    />
  );
  const timeInput = (key: "dayStart") => (
    <input
      type="time"
      value={s[key]}
      step={Math.max(1, Math.floor(s.timeStepMin || 1)) * 60}
      style={{
        width: 100, textAlign: "right",
        fontFamily: "JetBrains Mono,monospace", fontSize: 12,
        border: "1.5px solid var(--ink)", background: "var(--paper)",
        padding: "3px 7px", borderRadius: 4, outline: "none", color: "var(--ink)",
      }}
      onChange={e => setS(p => ({ ...p, [key]: e.target.value }))}
    />
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card sketch-box settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="caveat" style={{ fontSize: 22 }}>⚙ {t.settings}</span>
          <button className="btn sm" onClick={onClose}>✕</button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Hours</div>
          <div className="settings-row"><label>{t.regHoursPerDay}</label>{numInput("dayHours", 1, 24, 0.25)}</div>
          <div className="settings-row"><label>{t.regularStartTime}</label>{timeInput("dayStart")}</div>
          <div className="settings-row"><label>{t.timeStep} (min)</label>{numInput("timeStepMin", 1, 120)}</div>
          <div className="settings-row"><label>{t.defaultBreak} (min)</label>{numInput("breakMin", 0, 480)}</div>
        </div>

        <div className="sketch-divider" />

        <div className="settings-section">
          <div className="settings-section-title">Monthly target</div>
          <div className="settings-row"><label>{t.monthTargetMin} (h)</label>{numInput("monthTargetMin", 0, 400)}</div>
          <div className="settings-row"><label>{t.monthTargetMax} (h)</label>{numInput("monthTargetMax", 0, 400)}</div>
        </div>

        <div className="sketch-divider" />

        <div className="settings-section">
          <div className="settings-section-title">Yearly target</div>
          <div className="settings-row"><label>{t.yearTargetMin} (h)</label>{numInput("yearTargetMin", 0, 5000)}</div>
          <div className="settings-row"><label>{t.yearTargetMax} (h)</label>{numInput("yearTargetMax", 0, 5000)}</div>
        </div>

        <div className="sketch-divider" />

        <div className="settings-row">
          <label>{t.autoHoliday}</label>
          <div
            className={"toggle" + (s.showHolidays ? " on" : "")}
            onClick={() => setS(p => ({ ...p, showHolidays: !p.showHolidays }))}
          />
        </div>

        <div className="row gap-8 mt-12" style={{ justifyContent: "flex-end" }}>
          <button className="btn sm" onClick={onClose}>{t.cancel}</button>
          <button className="btn sm primary" onClick={() => onSave(s)}>{t.save}</button>
        </div>
      </div>
    </div>
  );
}
