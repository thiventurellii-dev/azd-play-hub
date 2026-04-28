import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonItem } from "@/hooks/useSeasonsData";

type View = "week" | "month" | "quarter";

interface Props {
  seasons: SeasonItem[];
  participatedIds: Set<string>;
}

const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const getRangeDays = (view: View) => {
  if (view === "week") return 7;
  if (view === "month") return 31;
  return 365; // quarter view shows ~1 year span like the mock
};

const statusColor = (status: string): string => {
  switch (status) {
    case "active": return "bg-gold";
    case "upcoming": return "bg-purple-500";
    case "finished": return "bg-muted-foreground";
    default: return "bg-blue-500";
  }
};
const statusLabel = (status: string): string => {
  switch (status) {
    case "active": return "Ativa";
    case "upcoming": return "Em breve";
    case "finished": return "Encerrada";
    default: return "";
  }
};

export const SeasonsTimeline = ({ seasons, participatedIds }: Props) => {
  const [view, setView] = useState<View>("quarter");
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));

  const { rangeStart, rangeEnd, monthMarks, totalMs } = useMemo(() => {
    const days = getRangeDays(view);
    const start = new Date(anchor);
    if (view === "quarter") {
      // Center on anchor: ~3 months back, ~9 months forward
      start.setMonth(start.getMonth() - 3);
      start.setDate(1);
    } else if (view === "month") {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(start.getDate() - 1);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    // Build month tick marks
    const marks: { date: Date; label: string }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor < end) {
      marks.push({ date: new Date(cursor), label: MONTHS_PT[cursor.getMonth()] });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return {
      rangeStart: start,
      rangeEnd: end,
      monthMarks: marks,
      totalMs: end.getTime() - start.getTime(),
    };
  }, [view, anchor]);

  const today = startOfDay(new Date());
  const todayPct = ((today.getTime() - rangeStart.getTime()) / totalMs) * 100;
  const todayInRange = todayPct >= 0 && todayPct <= 100;

  // Filter seasons that intersect the range
  const visibleSeasons = useMemo(() => {
    return seasons
      .filter((s) => {
        const sStart = new Date(s.start_date + "T00:00:00").getTime();
        const sEnd = new Date(s.end_date + "T23:59:59").getTime();
        return sEnd >= rangeStart.getTime() && sStart <= rangeEnd.getTime();
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [seasons, rangeStart, rangeEnd]);

  const navigate = (dir: -1 | 1) => {
    const next = new Date(anchor);
    if (view === "week") next.setDate(next.getDate() + dir * 7);
    else if (view === "month") next.setMonth(next.getMonth() + dir);
    else next.setMonth(next.getMonth() + dir * 3);
    setAnchor(next);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Calendário das Seasons</h2>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Visualize a duração e o status das temporadas</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
              {(["week", "month", "quarter"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 text-xs rounded transition-colors",
                    view === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v === "week" ? "Semana" : v === "month" ? "Mês" : "Trimestre"}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setAnchor(startOfDay(new Date()))}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Month axis */}
            <div className="relative h-10 border-b border-border">
              {monthMarks.map((m, i) => {
                const pct = ((m.date.getTime() - rangeStart.getTime()) / totalMs) * 100;
                if (pct < 0 || pct > 100) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-border/60 pl-1 pr-1"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Bars */}
            <div className="relative">
              {todayInRange && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-gold pointer-events-none z-10"
                  style={{ left: `${todayPct}%` }}
                >
                  <div className="absolute -top-2 -translate-x-1/2 left-0 px-1.5 py-0.5 rounded bg-gold text-[10px] font-bold text-black">
                    Hoje
                  </div>
                </div>
              )}

              {visibleSeasons.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma season neste período.
                </div>
              ) : (
                visibleSeasons.map((s) => {
                  const sStart = new Date(s.start_date + "T00:00:00").getTime();
                  const sEnd = new Date(s.end_date + "T23:59:59").getTime();
                  const startPct = Math.max(0, ((sStart - rangeStart.getTime()) / totalMs) * 100);
                  const endPct = Math.min(100, ((sEnd - rangeStart.getTime()) / totalMs) * 100);
                  const widthPct = Math.max(1, endPct - startPct);
                  const participates = participatedIds.has(s.id);
                  const colorClass = participates ? statusColor(s.status) : "bg-muted-foreground/40";
                  const icon = s.type === "blood" ? "🩸" : "🎲";

                  return (
                    <div key={s.id} className="relative h-10 flex items-center border-b border-border/40 last:border-b-0">
                      <div className="absolute left-0 top-0 bottom-0 w-44 pl-1 flex items-center gap-1.5 bg-card z-[5]">
                        <span className="text-sm">{icon}</span>
                        <Link
                          to={`/seasons/${s.id}`}
                          className="text-xs truncate hover:text-gold transition-colors"
                        >
                          {s.name}
                        </Link>
                      </div>
                      <div className="ml-44 relative h-full w-full">
                        <Link
                          to={`/seasons/${s.id}`}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-4 rounded-full transition-opacity hover:opacity-80",
                            colorClass
                          )}
                          style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                          title={`${s.name} — ${s.start_date} → ${s.end_date}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-2 border-t border-border">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> Ativa</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Em breve</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Encerrada</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Não participa</div>
        </div>
      </CardContent>
    </Card>
  );
};
