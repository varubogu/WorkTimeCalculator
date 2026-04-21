import type { MonthData, Settings, Translations } from "../types";
import { fmtH, fmtRange, sumHours, sumOvertimeHours } from "../utils";
import { exportCSV, exportJSON } from "../utils";
import RangeProgress from "./RangeProgress";

interface Props {
  year: number;
  monthIdx: number;
  monthsData: MonthData[];
  settings: Settings;
  t: Translations;
  onPickMonth: (m: number) => void;
}

function statusFor(tot: number, min: number, max: number) {
  return tot < min ? "under" : tot > max ? "over" : "ok";
}

function statusColor(st: string) {
  return st === "ok" ? "var(--accent-ok)" : st === "over" ? "var(--accent-bad)" : "var(--accent-warn)";
}

export default function Sidebar({ year, monthIdx, monthsData, settings, t, onPickMonth }: Props) {
  const yearTotal = monthsData.reduce((s, m) => s + sumHours(m.data), 0);
  const yearOvertimeTotal = monthsData.reduce((s, m) => s + sumOvertimeHours(m.data, settings.dayHours), 0);
  const yearOvertimeHardMax = Math.max(settings.yearOvertimeTargetMax * 1.3, yearOvertimeTotal * 1.1, settings.yearOvertimeTargetMax + 20, 20);

  return (
    <div className="sidebar">
      <div className="caveat" style={{ fontSize: 24, lineHeight: 1 }}>{year}</div>
      <div className="mono muted small mb-8">
        {t.yearTarget} · {fmtRange(settings.yearTargetMin, settings.yearTargetMax, settings.hourDisplay)}
      </div>
      <RangeProgress
        min={settings.yearTargetMin} max={settings.yearTargetMax}
        value={yearTotal} hardMax={settings.yearTargetMax * 1.3} height={14}
      />
      <div className="row between mt-8 mono small muted">
        <span>{t.actualHours}</span>
        <span style={{ color: "var(--ink)" }}>{fmtH(yearTotal, settings.hourDisplay)}</span>
      </div>
      <div className="mono muted small mt-12">
        {t.targetValue} · {fmtH(settings.yearOvertimeTargetMin, settings.hourDisplay)} / {t.limitValue} · {fmtH(settings.yearOvertimeTargetMax, settings.hourDisplay)}
      </div>
      <div className="mt-8">
        <RangeProgress
          min={settings.yearOvertimeTargetMin} max={settings.yearOvertimeTargetMax}
          value={yearOvertimeTotal} hardMax={yearOvertimeHardMax} height={14} mode="ceiling"
        />
      </div>
      <div className="row between mt-8 mono small muted">
        <span>{t.overtime}</span>
        <span style={{ color: "var(--ink)" }}>{fmtH(yearOvertimeTotal, settings.hourDisplay)}</span>
      </div>
      <div className="sketch-divider" />
      <div className="col gap-4">
        {monthsData.map(({ m, data }) => {
          const tot = sumHours(data);
          const st  = statusFor(tot, settings.monthTargetMin, settings.monthTargetMax);
          return (
            <div
              key={m}
              className={"month-row" + (m === monthIdx ? " active" : "")}
              onClick={() => onPickMonth(m)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div className="dot-status" style={{ background: statusColor(st) }} />
                <span className="caveat" style={{ fontSize: 18, whiteSpace: "nowrap" }}>{t.months[m]}</span>
              </div>
              <span className="mono small muted" style={{ flexShrink: 0 }}>{fmtH(tot, settings.hourDisplay)}</span>
            </div>
          );
        })}
      </div>
      <div className="sketch-divider" />
      <div className="col gap-4">
        <button className="btn sm" style={{ justifyContent: "center" }}
          onClick={() => exportCSV(monthsData, year)}>⤓ CSV</button>
        <button className="btn sm" style={{ justifyContent: "center" }}
          onClick={() => exportJSON(monthsData, year)}>⤓ JSON</button>
      </div>
    </div>
  );
}
