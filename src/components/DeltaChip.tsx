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
      return <span className="tag ok">✓ {t.withinTarget}</span>;
    }
    if (value <= max) {
      const d = Math.round((value - min) * 10) / 10;
      return <span className="tag warn">{fmtHoursWithSign(d, hourDisplay, "+")} · {t.withinLimit}</span>;
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
