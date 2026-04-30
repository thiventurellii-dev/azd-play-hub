import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonItem } from "@/hooks/useSeasonsData";

interface Props {
  seasons: SeasonItem[];
  participatedIds: Set<string>;
}

const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Curated palette: gold, soft purple, green, desaturated blue
// Each entry: [r, g, b] for rgba composition (gradients + glow)
const SEASON_PALETTE: Array<[number, number, number]> = [
  [245, 180, 0],   // #F5B400 amarelo
  [139, 92, 246],  // #8B5CF6 roxo suave
  [34, 197, 94],   // #22C55E verde
  [59, 130, 246],  // #3B82F6 azul dessaturado
];
const FINISHED_RGB: [number, number, number] = [107, 114, 128]; // #6B7280 cinza neutro

const colorFor = (s: SeasonItem, idx: number): [number, number, number] => {
  if (s.status === "finished") return FINISHED_RGB;
  return SEASON_PALETTE[idx % SEASON_PALETTE.length];
};

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

const NAME_COL_PX = 200;

export const SeasonsTimeline = ({ seasons, participatedIds }: Props) => {
  // Anchor controls horizontal pan; fixed quarter view (~12 months window)
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));

  const { rangeStart, rangeEnd, monthMarks, quarterMarks, totalMs } = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth() - 3, 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 12);

    // Month marks
    const months: { date: Date; label: string }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor < end) {
      months.push({ date: new Date(cursor), label: MONTHS_PT[cursor.getMonth()] });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Quarter marks (group of 3 months)
    const quarters: { startDate: Date; endDate: Date; label: string; year: number }[] = [];
    const qCursor = new Date(start);
    while (qCursor < end) {
      const qStart = new Date(qCursor);
      const qNum = Math.floor(qStart.getMonth() / 3) + 1;
      const qMonthStart = (qNum - 1) * 3;
      const qDate = new Date(qStart.getFullYear(), qMonthStart, 1);
      const qEnd = new Date(qStart.getFullYear(), qMonthStart + 3, 1);
      quarters.push({
        startDate: qDate,
        endDate: qEnd,
        label: `Q${qNum}`,
        year: qDate.getFullYear(),
      });
      qCursor.setMonth(qCursor.getMonth() + 3);
      qCursor.setDate(1);
    }

    return {
      rangeStart: start,
      rangeEnd: end,
      monthMarks: months,
      quarterMarks: quarters,
      totalMs: end.getTime() - start.getTime(),
    };
  }, [anchor]);

  const today = startOfDay(new Date());
  const todayPct = ((today.getTime() - rangeStart.getTime()) / totalMs) * 100;
  const todayInRange = todayPct >= 0 && todayPct <= 100;

  // Detect year transitions inside the visible range (for the year row)
  const yearGroups = useMemo(() => {
    const groups: { year: number; startPct: number; endPct: number }[] = [];
    let curYear = rangeStart.getFullYear();
    let curStart = 0;
    const cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const y = cursor.getFullYear();
      if (y !== curYear) {
        const transition = new Date(y, 0, 1);
        const pct = ((transition.getTime() - rangeStart.getTime()) / totalMs) * 100;
        groups.push({ year: curYear, startPct: curStart, endPct: pct });
        curYear = y;
        curStart = pct;
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    groups.push({ year: curYear, startPct: curStart, endPct: 100 });
    return groups;
  }, [rangeStart, rangeEnd, totalMs]);

  // Sort seasons by start date for stable color assignment
  const indexedSeasons = useMemo(
    () => [...seasons].sort((a, b) => a.start_date.localeCompare(b.start_date)).map((s, i) => ({ s, idx: i })),
    [seasons]
  );

  const visibleSeasons = useMemo(() => {
    return indexedSeasons.filter(({ s }) => {
      const sStart = new Date(s.start_date + "T00:00:00").getTime();
      const sEnd = new Date(s.end_date + "T23:59:59").getTime();
      return sEnd >= rangeStart.getTime() && sStart <= rangeEnd.getTime();
    });
  }, [indexedSeasons, rangeStart, rangeEnd]);

  const navigate = (dir: -1 | 1) => {
    const next = new Date(anchor);
    next.setMonth(next.getMonth() + dir * 3);
    setAnchor(next);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Calendário das Seasons</h2>
            <p className="text-xs text-muted-foreground">Visualize a duração e o status das temporadas</p>
          </div>
          <div className="inline-flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px] flex">
            {/* Left fixed column: names */}
            <div className="flex-shrink-0" style={{ width: NAME_COL_PX }}>
              {/* Header spacers matching year + quarter + month rows */}
              <div className="h-6 border-b border-border/40" />
              <div className="h-7 border-b border-border/40" />
              <div className="h-7 border-b border-border" />
              {visibleSeasons.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground pr-3">
                  Nenhuma season neste período.
                </div>
              ) : (
                visibleSeasons.map(({ s }) => {
                  const icon = s.type === "blood" ? "🩸" : "🎲";
                  return (
                    <div
                      key={s.id}
                      className="h-11 flex items-center gap-1.5 pl-1 pr-3 border-b border-border/30 last:border-b-0"
                    >
                      <span className="text-sm">{icon}</span>
                      <Link
                        to={`/seasons/${s.id}`}
                        className="text-xs truncate hover:text-gold transition-colors"
                      >
                        {s.name}
                      </Link>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right scrollable area: header + bars */}
            <div className="relative flex-1 border-l border-border">
              {/* Year row */}
              <div className="relative h-6 border-b border-border/40">
                {yearGroups.map((g, i) => {
                  const width = g.endPct - g.startPct;
                  if (width <= 0) return null;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex items-center pl-2 text-[11px] font-semibold text-muted-foreground"
                      style={{ left: `${g.startPct}%`, width: `${width}%` }}
                    >
                      {g.year}
                    </div>
                  );
                })}
              </div>

              {/* Quarter row */}
              <div className="relative h-7 border-b border-border/40">
                {quarterMarks.map((q, i) => {
                  const startPct = ((q.startDate.getTime() - rangeStart.getTime()) / totalMs) * 100;
                  const endPct = ((q.endDate.getTime() - rangeStart.getTime()) / totalMs) * 100;
                  const clampedStart = Math.max(0, startPct);
                  const clampedEnd = Math.min(100, endPct);
                  const width = clampedEnd - clampedStart;
                  if (width <= 0) return null;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex items-center pl-2 border-l border-border/40"
                      style={{ left: `${clampedStart}%`, width: `${width}%` }}
                    >
                      <span className="text-xs font-bold text-foreground leading-tight">{q.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Month axis */}
              <div className="relative h-7 border-b border-border">
                {monthMarks.map((m, i) => {
                  const pct = ((m.date.getTime() - rangeStart.getTime()) / totalMs) * 100;
                  if (pct < 0 || pct > 100) return null;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-border/40 pl-1 flex items-center"
                      style={{ left: `${pct}%` }}
                    >
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Bars area with today line */}
              <div className="relative">
                {todayInRange && (
                  <div
                    className="absolute -top-7 bottom-0 border-l-2 border-dashed border-gold pointer-events-none z-10"
                    style={{ left: `${todayPct}%` }}
                  >
                    <div className="absolute -top-2 -translate-x-1/2 left-0 px-1.5 py-0.5 rounded bg-gold text-[10px] font-bold text-black">
                      Hoje
                    </div>
                  </div>
                )}

                {visibleSeasons.length === 0 ? (
                  <div className="py-10" />
                ) : (
                  visibleSeasons.map(({ s, idx }) => {
                    const sStart = new Date(s.start_date + "T00:00:00").getTime();
                    const sEnd = new Date(s.end_date + "T23:59:59").getTime();
                    const startPct = Math.max(0, ((sStart - rangeStart.getTime()) / totalMs) * 100);
                    const endPct = Math.min(100, ((sEnd - rangeStart.getTime()) / totalMs) * 100);
                    const widthPct = Math.max(1, endPct - startPct);
                    const participates = participatedIds.has(s.id);
                    const rgb = colorFor(s, idx);
                    const isFuture = new Date(s.start_date) > today;

                    const barStyle: React.CSSProperties = {
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                    };

                    if (participates) {
                      // Participating: full gradient + glow (same treatment for active and finished)
                      barStyle.background = `linear-gradient(90deg, ${rgba(rgb, 0.2)} 0%, ${rgba(rgb, 0.6)} 40%, ${rgba(rgb, 1)} 100%)`;
                      if (!isFuture) {
                        barStyle.boxShadow = `0 0 12px ${rgba(rgb, 0.35)}, 0 0 24px ${rgba(rgb, 0.2)}`;
                      }
                    } else {
                      // Not participating: faded flat color, no glow
                      barStyle.background = rgba(rgb, 0.25);
                      barStyle.border = `1px solid ${rgba(rgb, 0.5)}`;
                    }

                    return (
                      <div
                        key={s.id}
                        className="relative h-11 flex items-center border-b border-border/30 last:border-b-0"
                      >
                        <Link
                          to={`/seasons/${s.id}`}
                          className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full transition-all hover:brightness-110"
                          style={barStyle}
                          title={`${s.name} — ${s.start_date} → ${s.end_date}`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
