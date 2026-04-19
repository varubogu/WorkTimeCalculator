import type { Translations } from "../types";

interface Props {
  value: number;
  min: number;
  max: number;
  t: Translations;
}

export default function DeltaChip({ value, min, max, t }: Props) {
  if (value >= min && value <= max) {
    return <span className="tag ok">✓ {t.inRange}</span>;
  }
  if (value > max) {
    const d = Math.round((value - max) * 10) / 10;
    return <span className="tag bad">+{d}h · {t.excess}</span>;
  }
  const d = Math.round((min - value) * 10) / 10;
  return <span className="tag warn">−{d}h · {t.shortage}</span>;
}
