interface Props {
  min: number;
  max: number;
  value: number;
  hardMax?: number;
  height?: number;
  mode?: "range" | "ceiling";
}

export default function RangeProgress({ min, max, value, hardMax, height = 22, mode = "range" }: Props) {
  const hm = hardMax ?? Math.max(max * 1.3, value * 1.1, max + 20);
  const minPct = (min / hm) * 100;
  const maxPct = (max / hm) * 100;
  const valPct = Math.min(100, (value / hm) * 100);

  return (
    <div style={{ width: "100%" }}>
      <div className="progress" style={{ height }}>
        <div className="zones">
          <div className={mode === "ceiling" ? "zone-ok" : "zone-under"} style={{ width: `${minPct}%` }} />
          <div className={mode === "ceiling" ? "zone-under" : "zone-ok"} style={{ width: `${maxPct - minPct}%` }} />
          <div className="zone-over"  style={{ flex: 1 }} />
        </div>
        <div className="marker" style={{ left: `${valPct}%` }} />
      </div>
    </div>
  );
}
