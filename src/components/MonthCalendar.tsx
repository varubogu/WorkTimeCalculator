import type { DayData, Translations } from "../types";
import { fmtH } from "../utils";

interface Placeholder { placeholder: true; key: string }
type Cell = Placeholder | (DayData & { key: string });

interface Props {
  year: number;
  month: number;
  data: DayData[];
  t: Translations;
  showHolidayTint?: boolean;
  onDayClick?: (day: DayData) => void;
}

function isPlaceholder(c: Cell): c is Placeholder {
  return (c as Placeholder).placeholder === true;
}

export default function MonthCalendar({ year, month, data, t, showHolidayTint = true, onDayClick }: Props) {
  const firstDOW = new Date(year, month, 1).getDay();

  const cells: Cell[] = [
    ...Array.from({ length: firstDOW }, (_, i) => ({ placeholder: true as const, key: `l${i}` })),
    ...data.map(x => ({ ...x, key: `d${x.d}` })),
  ];
  while (cells.length % 7 !== 0) {
    cells.push({ placeholder: true, key: `t${cells.length}` });
  }

  return (
    <div className="cal">
      {t.dow.map((d, i) => <div key={`dow${i}`} className="dow">{d}</div>)}
      {cells.map(c => {
        if (isPlaceholder(c)) return <div key={c.key} className="day off" />;

        const cls = ["day"];
        if (c.isToday) cls.push("today");
        if (c.kind === "vac")  cls.push("vac");
        else if (c.kind === "wknd") cls.push("wknd");
        else if (c.isHoliday && showHolidayTint) cls.push("holiday");
        else if (!c.isWorking) cls.push("weekend");
        if ((c.kind === "off" || c.kind === "holi") && !c.entry.start) cls.push("off");

        return (
          <div key={c.key} className={cls.join(" ")} onClick={() => onDayClick?.(c)}>
            <div className="num">{c.d}</div>
            {c.hrs > 0 && <div className="hrs">{fmtH(c.hrs)}</div>}
            <div className="mini-icons">
              {c.kind === "ot"   && <span className="icon-chip ot" />}
              {c.kind === "vac"  && <span className="icon-chip vac" />}
              {c.kind === "wknd" && <span className="icon-chip wknd" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
