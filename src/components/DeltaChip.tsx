import type { HourDisplay, Translations } from "../types";
import { fmtHoursWithSign } from "../utils";

interface Props {
  value: number;
  min: number;
  max: number;
  hourDisplay: HourDisplay;
  t: Translations;
  mode?: "range" | "ceiling";
}

export default function DeltaChip({ value, min, max, hourDisplay, t, mode = "range" }: Props) {
  if (mode === "ceiling") {
    if (value <= min) {
      const remainingToTarget = Math.round(Math.max(0, min - value) * 10) / 10;
      return <span className="tag ok">{t.remaining} {fmtHoursWithSign(remainingToTarget, hourDisplay)} · {t.withinTarget}</span>;
    }
    if (value <= max) {
      const overTarget = Math.round((value - min) * 10) / 10;
      const remainingToLimit = Math.round(Math.max(0, max - value) * 10) / 10;
      return (
        <span className="tag warn">
          {fmtHoursWithSign(overTarget, hourDisplay, "+")} · {t.withinLimit} · {t.remaining} {fmtHoursWithSign(remainingToLimit, hourDisplay)}
        </span>
      );
    }
    const d = Math.round((value - max) * 10) / 10;
    return <span className="tag bad">{fmtHoursWithSign(d, hourDisplay, "+")} · {t.limitExceeded}</span>;
  }

  if (value >= min && value <= max) {
    return <span className="tag ok">✓ {t.inRange}</span>;
  }
  if (value > max) {
    const d = Math.round((value - max) * 10) / 10;
    return <span className="tag bad">{fmtHoursWithSign(d, hourDisplay, "+")} · {t.excess}</span>;
  }
  const d = Math.round((min - value) * 10) / 10;
  return <span className="tag warn">{fmtHoursWithSign(d, hourDisplay, "-")} · {t.shortage}</span>;
}
