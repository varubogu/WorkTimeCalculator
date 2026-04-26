import { useState } from "react";
import type { PeriodSettings, SettingsPeriodMap, SettingsPreferences, Translations } from "../types";
import {
  mergePeriodSettings,
  mergeSettingsPeriods,
  settingsToPreferences,
} from "../storage";

interface Props {
  preferences: SettingsPreferences;
  settingsPeriods: SettingsPeriodMap;
  t: Translations;
  onSave: (preferences: SettingsPreferences, periods: SettingsPeriodMap) => void;
  onClose: () => void;
}

export default function SettingsModal({ preferences, settingsPeriods, t, onSave, onClose }: Props) {
  type NumericPeriodSettingKey = {
    [K in keyof PeriodSettings]: PeriodSettings[K] extends number ? K : never
  }[keyof PeriodSettings];

  const normalizedPeriods = mergeSettingsPeriods(settingsPeriods);
  const [prefs, setPrefs] = useState<SettingsPreferences>({ ...preferences });
  const [periods, setPeriods] = useState<SettingsPeriodMap>(normalizedPeriods);
  const [selectedKey, setSelectedKey] = useState<string>("*");
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [newEffectiveFrom, setNewEffectiveFrom] = useState("");
  const [effectiveFromDraft, setEffectiveFromDraft] = useState("*");

  const sortedKeys = Object.keys(periods).sort((a, b) => {
    if (a === "*") return -1;
    if (b === "*") return 1;
    return a.localeCompare(b);
  });
  const currentKey = periods[selectedKey] ? selectedKey : "*";
  const selectedPeriod = periods[currentKey];

  const numInput = (key: NumericPeriodSettingKey, label: string, min: number, max: number, step = 1) => (
    <input
      type="number"
      aria-label={label}
      value={selectedPeriod[key] as number}
      min={min} max={max}
      step={step}
      style={{
        width: 90, textAlign: "right",
        fontFamily: "JetBrains Mono,monospace", fontSize: 12,
        border: "1.5px solid var(--ink)", background: "var(--paper)",
        padding: "3px 7px", borderRadius: 4, outline: "none", color: "var(--ink)",
      }}
      onChange={e => updateSelectedPeriod({ [key]: parseFloat(e.target.value) || 0 } as Partial<PeriodSettings>)}
    />
  );
  const timeInput = (key: "dayStart") => (
    <input
      type="time"
      aria-label={t.regularStartTime}
      value={selectedPeriod[key]}
      step={Math.max(1, Math.floor(selectedPeriod.timeStepMin || 1)) * 60}
      style={{
        width: 100, textAlign: "right",
        fontFamily: "JetBrains Mono,monospace", fontSize: 12,
        border: "1.5px solid var(--ink)", background: "var(--paper)",
        padding: "3px 7px", borderRadius: 4, outline: "none", color: "var(--ink)",
      }}
      onChange={e => updateSelectedPeriod({ [key]: e.target.value })}
    />
  );
  const hourDisplayInput = (
    <select
      value={prefs.hourDisplay}
      aria-label={t.hourDisplay}
      style={{
        width: 140, textAlign: "left",
        fontFamily: "JetBrains Mono,monospace", fontSize: 12,
        border: "1.5px solid var(--ink)", background: "var(--paper)",
        padding: "3px 7px", borderRadius: 4, outline: "none", color: "var(--ink)",
      }}
      onChange={e => setPrefs(p => ({ ...p, hourDisplay: e.target.value as SettingsPreferences["hourDisplay"] }))}
    >
      <option value="clock">{t.hourDisplayClock}</option>
      <option value="decimal">{t.hourDisplayDecimal}</option>
    </select>
  );

  const updateSelectedPeriod = (patch: Partial<PeriodSettings>) => {
    setPeriods(prev => ({
      ...prev,
      [currentKey]: mergePeriodSettings({ ...prev[currentKey], ...patch }),
    }));
  };

  const handleAddPeriod = () => {
    const nextKey = newEffectiveFrom.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextKey) || periods[nextKey]) {
      window.alert(t.settingsPeriodDuplicate);
      return;
    }
    setPeriods(prev => ({ ...prev, [nextKey]: { ...selectedPeriod } }));
    setSelectedKey(nextKey);
    setEffectiveFromDraft(nextKey);
    setIsAddingPeriod(false);
    setNewEffectiveFrom("");
  };

  const handleRemoveSelectedPeriod = () => {
    if (currentKey === "*") return;
    const { [currentKey]: _removed, ...nextPeriods } = periods;
    setPeriods(nextPeriods as SettingsPeriodMap);
    setSelectedKey("*");
    setEffectiveFromDraft("*");
  };

  const handleSelectedKeyChange = (nextKey: string) => {
    setSelectedKey(nextKey);
    setEffectiveFromDraft(nextKey);
  };

  const handleEffectiveFromBlur = () => {
    if (currentKey === "*") return;
    const nextKey = effectiveFromDraft.trim();
    if (nextKey === currentKey) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextKey) || periods[nextKey]) {
      window.alert(t.settingsPeriodDuplicate);
      setEffectiveFromDraft(currentKey);
      return;
    }
    const { [currentKey]: currentPeriod, ...rest } = periods;
    setPeriods({ ...rest, [nextKey]: currentPeriod } as SettingsPeriodMap);
    setSelectedKey(nextKey);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card sketch-box settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="caveat" style={{ fontSize: 22 }}>⚙ {t.settings}</span>
          <button className="btn sm" onClick={onClose}>✕</button>
        </div>

        <div className="settings-modal-body">
          <div className="settings-section">
            <div className="settings-section-title">{t.settingsPeriods}</div>
            <div className="mono small muted" style={{ marginBottom: 8 }}>{t.settingsPeriodHelp}</div>
            <div className="settings-period-toolbar">
              <select
                className="settings-period-select"
                aria-label={t.settingsPeriodTarget}
                value={currentKey}
                onChange={e => handleSelectedKeyChange(e.target.value)}
              >
                {sortedKeys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
              <button
                className="btn sm"
                type="button"
                aria-label={t.addSettingsPeriod}
                onClick={() => setIsAddingPeriod(prev => !prev)}
              >
                ＋
              </button>
            </div>

            {isAddingPeriod && (
              <div className="sketch-box tight settings-period-add">
                <div className="settings-row">
                  <label>{t.settingsPeriodFrom}</label>
                  <input
                    type="date"
                    aria-label={t.settingsPeriodFrom}
                    value={newEffectiveFrom}
                    onChange={e => setNewEffectiveFrom(e.target.value)}
                  />
                </div>
                <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
                  <button className="btn sm" type="button" onClick={() => setIsAddingPeriod(false)}>{t.cancel}</button>
                  <button className="btn sm" type="button" onClick={handleAddPeriod}>{t.addSettingsPeriod}</button>
                </div>
              </div>
            )}

            <div className="settings-row">
              <label>{t.settingsPeriodFrom}</label>
              {currentKey === "*" ? (
                <input type="text" aria-label={t.settingsPeriodFrom} value="*" disabled />
              ) : (
                <input
                  type="date"
                  aria-label={t.settingsPeriodFrom}
                  value={effectiveFromDraft}
                  onChange={e => setEffectiveFromDraft(e.target.value)}
                  onBlur={handleEffectiveFromBlur}
                />
              )}
            </div>
          </div>

          <div className="sketch-divider" />

          <div className="settings-section">
            <div className="settings-section-title">{t.hoursSection}</div>
            <div className="settings-row"><label>{t.regHoursPerDay}</label>{numInput("dayHours", t.regHoursPerDay, 1, 24, 0.25)}</div>
            <div className="settings-row"><label>{t.regularStartTime}</label>{timeInput("dayStart")}</div>
            <div className="settings-row"><label>{t.timeStep} ({t.minutes})</label>{numInput("timeStepMin", t.timeStep, 1, 120)}</div>
            <div className="settings-row"><label>{t.defaultBreak} ({t.minutes})</label>{numInput("breakMin", t.defaultBreak, 0, 480)}</div>
            <div className="settings-row"><label>{t.hourDisplay}</label>{hourDisplayInput}</div>
          </div>

          <div className="sketch-divider" />

          <div className="settings-section">
            <div className="settings-section-title">{t.monthlyTargetSection}</div>
            <div className="settings-row"><label>{t.monthTargetMin} ({t.h})</label>{numInput("monthTargetMin", t.monthTargetMin, 0, 400)}</div>
            <div className="settings-row"><label>{t.monthTargetMax} ({t.h})</label>{numInput("monthTargetMax", t.monthTargetMax, 0, 400)}</div>
            <div className="settings-row"><label>{t.monthOvertimeTargetMin} ({t.h})</label>{numInput("monthOvertimeTargetMin", t.monthOvertimeTargetMin, 0, 200)}</div>
            <div className="settings-row"><label>{t.monthOvertimeTargetMax} ({t.h})</label>{numInput("monthOvertimeTargetMax", t.monthOvertimeTargetMax, 0, 200)}</div>
          </div>

          <div className="sketch-divider" />

          <div className="settings-section">
            <div className="settings-section-title">{t.yearlyTargetSection}</div>
            <div className="settings-row"><label>{t.yearTargetMin} ({t.h})</label>{numInput("yearTargetMin", t.yearTargetMin, 0, 5000)}</div>
            <div className="settings-row"><label>{t.yearTargetMax} ({t.h})</label>{numInput("yearTargetMax", t.yearTargetMax, 0, 5000)}</div>
            <div className="settings-row"><label>{t.yearOvertimeTargetMin} ({t.h})</label>{numInput("yearOvertimeTargetMin", t.yearOvertimeTargetMin, 0, 2000)}</div>
            <div className="settings-row"><label>{t.yearOvertimeTargetMax} ({t.h})</label>{numInput("yearOvertimeTargetMax", t.yearOvertimeTargetMax, 0, 2000)}</div>
          </div>

          <div className="sketch-divider" />

          <div className="settings-row">
            <label>{t.autoHoliday}</label>
            <div
              className={"toggle" + (selectedPeriod.showHolidays ? " on" : "")}
              onClick={() => updateSelectedPeriod({ showHolidays: !selectedPeriod.showHolidays })}
            />
          </div>

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn sm"
              type="button"
              disabled={currentKey === "*"}
              onClick={handleRemoveSelectedPeriod}
            >
              {t.removeSettingsPeriod}
            </button>
          </div>
        </div>

        <div className="settings-modal-actions row gap-8">
          <button className="btn sm" onClick={onClose}>{t.cancel}</button>
          <button
            className="btn sm primary"
            onClick={() => onSave(settingsToPreferences(prefs), mergeSettingsPeriods(periods))}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
