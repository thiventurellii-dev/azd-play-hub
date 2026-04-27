import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

interface RoomLite {
  scheduled_at: string;
  game?: { id: string } | null;
}

interface Props {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  rooms: RoomLite[];
  gameFilter?: string; // game id or 'all'
}

const CalendarCarousel = ({ selectedDate, onSelect, rooms, gameFilter = "all" }: Props) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = useMemo(() => dayStart(new Date()), []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + weekOffset * 7 - 3 + i);
      return d;
    });
  }, [weekOffset, today]);

  const roomsByDay = useMemo(() => {
    const map = new Map<string, { total: number; matchingGame: number }>();
    rooms.forEach(r => {
      const d = dayStart(new Date(r.scheduled_at)).toDateString();
      const cur = map.get(d) ?? { total: 0, matchingGame: 0 };
      cur.total += 1;
      if (gameFilter !== "all" && r.game?.id === gameFilter) cur.matchingGame += 1;
      map.set(d, cur);
    });
    return map;
  }, [rooms, gameFilter]);

  return (
    <div className="relative mb-6 sm:mb-8">
      <button
        type="button"
        onClick={() => setWeekOffset(v => v - 1)}
        className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
        aria-label="Semana anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 sm:px-8">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const stats = roomsByDay.get(day.toDateString()) ?? { total: 0, matchingGame: 0 };
          const hasGame = stats.matchingGame > 0;
          const isPast = day < today && !isToday;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 sm:gap-1 rounded-lg px-1 py-2 sm:py-3 transition-all overflow-hidden",
                isSelected
                  ? "border-2 border-gold bg-secondary"
                  : "border border-border bg-surface hover:border-muted-foreground/50",
                hasGame && !isSelected && "border-gold/30",
                isPast && "opacity-55"
              )}
            >
              {hasGame && !isSelected && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(135deg, hsla(43,100%,50%,0.06) 0%, transparent 60%)" }}
                />
              )}

              <span className={cn(
                "text-[9px] sm:text-[10px] font-bold tracking-wider uppercase",
                isSelected ? "text-gold" : "text-muted-foreground"
              )}>
                {WEEKDAYS_SHORT[day.getDay()]}
              </span>
              <span className={cn(
                "font-extrabold leading-none tabular-nums",
                isSelected ? "text-2xl sm:text-3xl text-foreground" : "text-lg sm:text-2xl",
                isToday && !isSelected ? "text-foreground" : !isSelected ? "text-muted-foreground" : ""
              )}>
                {day.getDate()}
              </span>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase",
                isSelected ? "text-foreground" : "text-muted-foreground/70"
              )}>
                {MONTHS_SHORT[day.getMonth()]}
              </span>
              {isToday && (
                <span className="text-[8px] sm:text-[9px] font-bold bg-gold text-gold-foreground px-1.5 py-px rounded-full tracking-wider mt-0.5">
                  HOJE
                </span>
              )}
              <div className={cn(
                "flex items-center gap-1 mt-1 text-[10px] sm:text-[11px]",
                isSelected ? "text-foreground" : "text-muted-foreground/70"
              )}>
                {stats.total > 0 ? (
                  <>
                    <Users className="h-2.5 w-2.5" />
                    <span className="hidden sm:inline">{stats.total} sala{stats.total !== 1 ? "s" : ""}</span>
                    <span className="sm:hidden">{stats.total}</span>
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
              {hasGame && (
                <div className="w-1 h-1 rounded-full bg-gold mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setWeekOffset(v => v + 1)}
        className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
        aria-label="Próxima semana"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Mobile nav arrows below */}
      <div className="flex sm:hidden justify-between items-center mt-3">
        <button
          type="button"
          onClick={() => setWeekOffset(v => v - 1)}
          className="h-8 px-3 flex items-center gap-1 rounded-full bg-surface border border-border text-xs text-muted-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>
        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={() => { setWeekOffset(0); onSelect(today); }}
            className="text-xs text-gold font-semibold"
          >
            Hoje
          </button>
        )}
        <button
          type="button"
          onClick={() => setWeekOffset(v => v + 1)}
          className="h-8 px-3 flex items-center gap-1 rounded-full bg-surface border border-border text-xs text-muted-foreground"
        >
          Próxima <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CalendarCarousel;
