import { useState } from "react";
import type { Settings, SettingsPeriod, Translations } from "../types";

interface Props {
  settings: Settings;
  settingsPeriods: SettingsPeriod[];
  t: Translations;
  onSave: (s: Settings, periods: SettingsPeriod[]) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, settingsPeriods, t, onSave, onClose }: Props) {
  type EditableSettingsPeriod = SettingsPeriod & { id: string };

  const createPeriodId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const createPeriodOverrides = (source: Settings | SettingsPeriod["overrides"]) => ({
    dayHours: source.dayHours ?? settings.dayHours,
    dayStart: source.dayStart ?? settings.dayStart,
    breakMin: source.breakMin ?? settings.breakMin,
    timeStepMin: source.timeStepMin ?? settings.timeStepMin,
  });
  const createEditablePeriod = (
    period: Omit<EditableSettingsPeriod, "id">
      | SettingsPeriod
      | null = null,
  ): EditableSettingsPeriod => ({
    id: createPeriodId(),
    effectiveFrom: period?.effectiveFrom ?? null,
    effectiveTo: period?.effectiveTo ?? null,
    overrides: { ...createPeriodOverrides(period?.overrides ?? settings) },
  });
  const toInputValue = (value: string | null) => value ?? "";
  const fromInputValue = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const formatPeriodLabel = (period: SettingsPeriod) => `${period.effectiveFrom ?? "—"} ～ ${period.effectiveTo ?? "—"}`;

  const [s, setS] = useState<Settings>({ ...settings });
  const [periods, setPeriods] = useState<EditableSettingsPeriod[]>(
    settingsPeriods.length > 0 ? settingsPeriods.map(period => createEditablePeriod(period)) : [createEditablePeriod()],
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(periods[0]?.id ?? null);
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    effectiveFrom: "",
    effectiveTo: "",
  });

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
  const hourDisplayInput = (
    <select
      value={s.hourDisplay}
      style={{
        width: 140, textAlign: "left",
        fontFamily: "JetBrains Mono,monospace", fontSize: 12,
        border: "1.5px solid var(--ink)", background: "var(--paper)",
        padding: "3px 7px", borderRadius: 4, outline: "none", color: "var(--ink)",
      }}
      onChange={e => setS(p => ({ ...p, hourDisplay: e.target.value as Settings["hourDisplay"] }))}
    >
      <option value="clock">{t.hourDisplayClock}</option>
      <option value="decimal">{t.hourDisplayDecimal}</option>
    </select>
  );

  const updatePeriod = (index: number, next: EditableSettingsPeriod) => {
    setPeriods(prev => prev.map((period, i) => (i === index ? next : period)));
  };

  const selectedPeriodIndex = periods.findIndex(period => period.id === selectedPeriodId);
  const selectedPeriod = selectedPeriodIndex >= 0 ? periods[selectedPeriodIndex] : null;
  const periodOptions = periods.map(period => ({
    id: period.id,
    label: formatPeriodLabel(period),
  }));

  const replaceSelectedPeriod = (next: EditableSettingsPeriod) => {
    if (!selectedPeriod) return;
    updatePeriod(selectedPeriodIndex, next);
  };

  const splitSelectedPeriodAt = (effectiveFrom: string) => {
    if (!selectedPeriod || selectedPeriod.effectiveFrom !== null) return;

    const nextPeriod = createEditablePeriod({
      effectiveFrom,
      effectiveTo: selectedPeriod.effectiveTo,
      overrides: { ...selectedPeriod.overrides },
    });
    const previousPeriod: EditableSettingsPeriod = {
      ...selectedPeriod,
      effectiveTo: effectiveFrom,
    };

    setPeriods(prev => prev.flatMap(period => (
      period.id === selectedPeriod.id ? [previousPeriod, nextPeriod] : [period]
    )));
    setSelectedPeriodId(nextPeriod.id);
  };

  const handleSelectedPeriodFromChange = (value: string) => {
    if (!selectedPeriod) return;
    const nextFrom = fromInputValue(value);
    if (selectedPeriod.effectiveFrom === null && nextFrom !== null) {
      splitSelectedPeriodAt(nextFrom);
      return;
    }
    replaceSelectedPeriod({ ...selectedPeriod, effectiveFrom: nextFrom });
  };

  const handleSelectedPeriodToChange = (value: string) => {
    if (!selectedPeriod) return;
    replaceSelectedPeriod({ ...selectedPeriod, effectiveTo: fromInputValue(value) });
  };

  const handleAddPeriod = () => {
    const nextFrom = fromInputValue(newPeriod.effectiveFrom);
    const nextTo = fromInputValue(newPeriod.effectiveTo);
    const sourceOverrides = selectedPeriod?.overrides ?? createPeriodOverrides(s);
    const nextPeriod: EditableSettingsPeriod = {
      id: createPeriodId(),
      effectiveFrom: nextFrom,
      effectiveTo: nextTo,
      overrides: { ...createPeriodOverrides(sourceOverrides) },
    };
    if (selectedPeriod?.effectiveFrom === null && nextFrom !== null) {
      const previousPeriod: EditableSettingsPeriod = {
        ...selectedPeriod,
        effectiveTo: nextFrom,
      };
      setPeriods(prev => prev.flatMap(period => (
        period.id === selectedPeriod.id ? [previousPeriod, nextPeriod] : [period]
      )));
    } else {
      setPeriods(prev => [...prev, nextPeriod]);
    }
    setSelectedPeriodId(nextPeriod.id);
    setIsAddingPeriod(false);
    setNewPeriod({ effectiveFrom: "", effectiveTo: "" });
  };

  const handleRemoveSelectedPeriod = () => {
    if (!selectedPeriod) return;

    setPeriods(prev => {
      const nextPeriods = prev.filter(period => period.id !== selectedPeriod.id);
      if (nextPeriods.length === 0) {
        const fallbackPeriod = createEditablePeriod();
        setSelectedPeriodId(fallbackPeriod.id);
        return [fallbackPeriod];
      }
      setSelectedPeriodId(nextPeriods[0].id);
      return nextPeriods;
    });
  };

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
          <div className="settings-row"><label>{t.hourDisplay}</label>{hourDisplayInput}</div>
        </div>

        <div className="sketch-divider" />

        <div className="settings-section">
          <div className="settings-section-title">Monthly target</div>
          <div className="settings-row"><label>{t.monthTargetMin} (h)</label>{numInput("monthTargetMin", 0, 400)}</div>
          <div className="settings-row"><label>{t.monthTargetMax} (h)</label>{numInput("monthTargetMax", 0, 400)}</div>
          <div className="settings-row"><label>{t.monthOvertimeTargetMin} (h)</label>{numInput("monthOvertimeTargetMin", 0, 200)}</div>
          <div className="settings-row"><label>{t.monthOvertimeTargetMax} (h)</label>{numInput("monthOvertimeTargetMax", 0, 200)}</div>
        </div>

        <div className="sketch-divider" />

        <div className="settings-section">
          <div className="settings-section-title">Yearly target</div>
          <div className="settings-row"><label>{t.yearTargetMin} (h)</label>{numInput("yearTargetMin", 0, 5000)}</div>
          <div className="settings-row"><label>{t.yearTargetMax} (h)</label>{numInput("yearTargetMax", 0, 5000)}</div>
          <div className="settings-row"><label>{t.yearOvertimeTargetMin} (h)</label>{numInput("yearOvertimeTargetMin", 0, 2000)}</div>
          <div className="settings-row"><label>{t.yearOvertimeTargetMax} (h)</label>{numInput("yearOvertimeTargetMax", 0, 2000)}</div>
        </div>

        <div className="sketch-divider" />

        <div className="settings-row">
          <label>{t.autoHoliday}</label>
          <div
            className={"toggle" + (s.showHolidays ? " on" : "")}
            onClick={() => setS(p => ({ ...p, showHolidays: !p.showHolidays }))}
          />
        </div>

        <div className="sketch-divider" />

        <div className="settings-section">
          <div className="settings-section-title">{t.settingsPeriods}</div>
          <div className="mono small muted" style={{ marginBottom: 8 }}>{t.settingsPeriodHelp}</div>
          <div className="settings-period-toolbar">
            <select
              className="settings-period-select"
              aria-label={t.settingsPeriodTarget}
              value={selectedPeriodId ?? ""}
              onChange={e => setSelectedPeriodId(e.target.value || null)}
            >
              {!selectedPeriod && <option value="">{t.settingsPeriodNone}</option>}
              {periodOptions.map(period => (
                <option key={period.id} value={period.id}>{period.label}</option>
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
                  value={newPeriod.effectiveFrom}
                  onChange={e => setNewPeriod(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="settings-row">
                <label>{t.settingsPeriodTo}</label>
                <input
                  type="date"
                  aria-label={t.settingsPeriodTo}
                  value={newPeriod.effectiveTo}
                  onChange={e => setNewPeriod(prev => ({ ...prev, effectiveTo: e.target.value }))}
                />
              </div>
              <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
                <button className="btn sm" type="button" onClick={() => setIsAddingPeriod(false)}>{t.cancel}</button>
                <button className="btn sm" type="button" onClick={handleAddPeriod}>{t.addSettingsPeriod}</button>
              </div>
            </div>
          )}

          {selectedPeriod ? (
            <div key={selectedPeriod.id} className="sketch-box tight settings-period-editor">
              <div className="settings-row">
                <label>{t.settingsPeriodFrom}</label>
                <input
                  type="date"
                  aria-label={t.settingsPeriodFrom}
                  value={toInputValue(selectedPeriod.effectiveFrom)}
                  onChange={e => handleSelectedPeriodFromChange(e.target.value)}
                />
              </div>
              <div className="settings-row">
                <label>{t.settingsPeriodTo}</label>
                <input
                  type="date"
                  aria-label={t.settingsPeriodTo}
                  value={toInputValue(selectedPeriod.effectiveTo)}
                  onChange={e => handleSelectedPeriodToChange(e.target.value)}
                />
              </div>
              <div className="settings-row">
                <label>{t.regHoursPerDay}</label>
                <input
                  type="number"
                  aria-label={t.regHoursPerDay}
                  value={selectedPeriod.overrides.dayHours ?? s.dayHours}
                  min={1}
                  max={24}
                  step={0.25}
                  onChange={e => updatePeriod(selectedPeriodIndex, {
                    ...selectedPeriod,
                    overrides: { ...selectedPeriod.overrides, dayHours: parseFloat(e.target.value) || 0 },
                  })}
                />
              </div>
              <div className="settings-row">
                <label>{t.regularStartTime}</label>
                <input
                  type="time"
                  aria-label={t.regularStartTime}
                  value={selectedPeriod.overrides.dayStart ?? s.dayStart}
                  step={Math.max(1, Math.floor((selectedPeriod.overrides.timeStepMin ?? s.timeStepMin) || 1)) * 60}
                  onChange={e => updatePeriod(selectedPeriodIndex, {
                    ...selectedPeriod,
                    overrides: { ...selectedPeriod.overrides, dayStart: e.target.value },
                  })}
                />
              </div>
              <div className="settings-row">
                <label>{t.defaultBreak} ({t.minutes})</label>
                <input
                  type="number"
                  aria-label={t.defaultBreak}
                  value={selectedPeriod.overrides.breakMin ?? s.breakMin}
                  min={0}
                  max={480}
                  step={1}
                  onChange={e => updatePeriod(selectedPeriodIndex, {
                    ...selectedPeriod,
                    overrides: { ...selectedPeriod.overrides, breakMin: parseInt(e.target.value) || 0 },
                  })}
                />
              </div>
              <div className="settings-row">
                <label>{t.timeStep} ({t.minutes})</label>
                <input
                  type="number"
                  aria-label={t.timeStep}
                  value={selectedPeriod.overrides.timeStepMin ?? s.timeStepMin}
                  min={1}
                  max={120}
                  step={1}
                  onChange={e => updatePeriod(selectedPeriodIndex, {
                    ...selectedPeriod,
                    overrides: { ...selectedPeriod.overrides, timeStepMin: parseInt(e.target.value) || 1 },
                  })}
                />
              </div>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button
                  className="btn sm"
                  type="button"
                  onClick={handleRemoveSelectedPeriod}
                >
                  {t.removeSettingsPeriod}
                </button>
              </div>
            </div>
          ) : (
            <div className="mono small muted settings-period-empty">{t.settingsPeriodNone}</div>
          )}
        </div>

        <div className="row gap-8 mt-12" style={{ justifyContent: "flex-end" }}>
          <button className="btn sm" onClick={onClose}>{t.cancel}</button>
          <button
            className="btn sm primary"
            onClick={() => onSave(s, periods.map(({ id: _id, ...period }) => period))}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
