import { useEffect, useRef, useState } from "react";
import type { MonthData, Translations } from "../types";
import { sumHours } from "../utils";

interface Point {
  i: number;
  m: number;
  tot: number;
  x: number;
  y: number;
}

interface Props {
  monthsData: MonthData[];
  year: number;
  targetMin: number;
  targetMax: number;
  currentMonthIdx: number;
  onPickMonth: (m: number) => void;
  height?: number;
  t: Translations;
}

export default function YearTimelineChart({
  monthsData, year, targetMin, targetMax,
  currentMonthIdx, onPickMonth, t,
  height = 260,
}: Props) {
  const [hover, setHover] = useState<Point | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(300, e.contentRect.width));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const H = height;
  const padL = 44, padR = 16, padT = 18, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxTot = Math.max(targetMax * 1.2, ...monthsData.map(m => sumHours(m.data)));
  const maxY   = Math.ceil(maxTot / 20) * 20;
  const yTicks: number[] = [];
  for (let v = 0; v <= maxY; v += 40) yTicks.push(v);

  const xAt = (i: number) => padL + (i / 11) * innerW;
  const yAt = (hrs: number) => padT + innerH - (hrs / maxY) * innerH;

  const bandTop    = yAt(targetMax);
  const bandBottom = yAt(targetMin);

  const points: Point[] = monthsData.map((m, i) => ({
    i, m: m.m,
    tot: sumHours(m.data),
    x: xAt(i),
    y: yAt(sumHours(m.data)),
  }));

  const toPath = (arr: Point[]) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    let best: Point | null = null;
    let bestD = Infinity;
    for (const p of points) {
      const d = Math.abs(p.x - mx);
      if (d < bestD) { bestD = d; best = p; }
    }
    setHover(best && bestD < innerW / 11 ? best : null);
  };

  const statusOf = (tot: number) =>
    tot < targetMin ? "under" : tot > targetMax ? "over" : "ok";

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg
        width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", cursor: "pointer", fontFamily: "JetBrains Mono,monospace" }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      >
        {/* target band */}
        <rect x={padL} y={bandTop} width={innerW} height={bandBottom - bandTop}
          fill="rgba(107,142,90,0.18)" stroke="var(--accent-ok)"
          strokeWidth="1.2" strokeDasharray="4 4" />
        <text x={padL + 4} y={bandTop - 3}     fontSize="10" fill="var(--accent-ok)">{targetMax}h</text>
        <text x={padL + 4} y={bandBottom + 12}  fontSize="10" fill="var(--accent-ok)">{targetMin}h</text>

        {/* Y axis */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={padL} y1={yAt(v)} x2={padL + innerW} y2={yAt(v)}
              stroke="var(--ruled)" strokeWidth="0.8" strokeDasharray="2 3" />
            <text x={padL - 6} y={yAt(v) + 3} fontSize="9" textAnchor="end" fill="var(--ink-2)">{v}</text>
          </g>
        ))}

        {/* X axis labels */}
        {points.map(p => (
          <text key={p.m} x={p.x} y={H - 8} fontSize="11" textAnchor="middle"
            fill={p.m === currentMonthIdx ? "var(--ink)" : "var(--ink-2)"}
            fontWeight={p.m === currentMonthIdx ? 700 : 400}>
            {t.monthsShort[p.m]}
          </text>
        ))}

        {/* Line */}
        {points.length > 1 && (
          <path d={toPath(points)} fill="none" stroke="var(--ink)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Current month marker */}
        {points[currentMonthIdx] && (
          <line
            x1={points[currentMonthIdx].x} y1={padT - 4}
            x2={points[currentMonthIdx].x} y2={padT + innerH}
            stroke="var(--accent-sel)" strokeWidth="1.2" strokeDasharray="2 3" />
        )}

        {/* Points */}
        {points.map(p => {
          const st = statusOf(p.tot);
          const fill = st === "ok" ? "var(--accent-ok)" : st === "over" ? "var(--accent-bad)" : "var(--accent-warn)";
          const big  = p.m === currentMonthIdx || hover?.m === p.m;
          return (
            <g key={p.m} onClick={() => onPickMonth(p.m)} style={{ cursor: "pointer" }}>
              <circle cx={p.x} cy={p.y} r={big ? 7 : 5} fill={fill} stroke={fill} strokeWidth="2" />
              {big && (
                <text x={p.x} y={p.y - 11} fontSize="10" textAnchor="middle" fill="var(--ink)">
                  {p.tot}h
                </text>
              )}
              <rect x={p.x - innerW / 22} y={padT} width={innerW / 11} height={innerH} fill="transparent" />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hover && (() => {
        const mData = monthsData[hover.i].data;
        const ot  = mData.filter(d => d.kind === "ot").reduce((s, d) => s + d.hrs, 0);
        const vac = mData.filter(d => d.kind === "vac").length;
        const st  = statusOf(hover.tot);
        const stColor = st === "ok" ? "var(--accent-ok)" : st === "over" ? "var(--accent-bad)" : "var(--accent-warn)";
        const stLabel = st === "ok" ? t.inRange : st === "over" ? t.excess : t.shortage;
        const left = Math.min(W - 185, Math.max(4, hover.x + 10));
        const top  = Math.max(4, hover.y - 80);
        return (
          <div style={{
            position: "absolute", left, top, width: 175,
            background: "var(--paper)", border: "1.8px solid var(--ink)",
            borderRadius: "4px 10px 4px 8px", padding: "6px 8px",
            boxShadow: "2px 3px 0 rgba(0,0,0,0.12)",
            pointerEvents: "none", zIndex: 5,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="caveat" style={{ fontSize: 18, lineHeight: 1 }}>{t.months[hover.m]} {year}</span>
              <span className="mono" style={{ fontSize: 9, color: stColor }}>{stLabel}</span>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-2)", marginTop: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t.totalHours}</span>
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>{hover.tot}h</span>
              </div>
              {ot > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t.overtime}</span><span>+{Math.round(ot * 10) / 10}h</span>
                </div>
              )}
              {vac > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t.vacation}</span><span>{vac}d</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t.target}</span><span>{targetMin}–{targetMax}h</span>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 3 }}>
              {t.click} →
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="legend" style={{ marginTop: 6 }}>
        <span>
          <span style={{ display: "inline-block", width: 22, height: 2, background: "var(--ink)" }} />
          {t.actualHours}
        </span>
        <span><span className="icon-chip" style={{ background: "var(--accent-ok)" }} /> {t.inRange}</span>
        <span><span className="icon-chip" style={{ background: "var(--accent-bad)" }} /> {t.excess}</span>
        <span><span className="icon-chip" style={{ background: "var(--accent-warn)" }} /> {t.shortage}</span>
      </div>
    </div>
  );
}
