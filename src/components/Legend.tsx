import type { Translations } from "../types";

interface Props { t: Translations }

export default function Legend({ t }: Props) {
  return (
    <div className="legend">
      <span><span className="icon-chip ot" /> {t.overtime}</span>
      <span><span className="icon-chip vac" /> {t.vacation}</span>
      <span><span className="icon-chip wknd" /> {t.weekendWork}</span>
      <span>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: "#efe4f2",
          border: "1px solid var(--ink)", display: "inline-block" }} />
        {t.holiday}
      </span>
      <span>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(107,142,90,0.35)",
          border: "1px solid var(--ink)", display: "inline-block" }} />
        {t.inRange}
      </span>
    </div>
  );
}
