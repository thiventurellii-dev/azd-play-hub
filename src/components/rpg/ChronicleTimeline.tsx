import { Link } from 'react-router-dom';
import {
  Skull,
  TrendingUp,
  Star,
  Swords,
  Users,
  CalendarDays,
  Award,
  BookOpen,
} from 'lucide-react';
import type { RpgSessionEvent } from '@/types/rpg';

interface SessionLite {
  id: string;
  title: string;
  session_number: number | null;
  session_recap: string | null;
  scheduled_at: string;
  status: string;
}

interface Props {
  sessions: SessionLite[];
  events: RpgSessionEvent[];
}

const eventIcon: Record<string, any> = {
  death: Skull,
  level_up: TrendingUp,
  milestone: Star,
  legendary_item: Award,
  important_npc: Users,
  betrayal: Swords,
  achievement: Award,
};

const eventColor: Record<string, string> = {
  death: 'text-destructive',
  level_up: 'text-emerald-400',
  milestone: 'text-gold',
  legendary_item: 'text-purple-400',
  important_npc: 'text-blue-400',
  betrayal: 'text-orange-400',
  achievement: 'text-gold',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const ChronicleTimeline = ({ sessions, events }: Props) => {
  if (sessions.length === 0 && events.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          A crônica desta campanha ainda está em branco.
        </p>
      </div>
    );
  }

  // Junta sessões + eventos numa lista única ordenada
  type Item =
    | { kind: 'session'; date: string; data: SessionLite }
    | { kind: 'event'; date: string; data: RpgSessionEvent };

  const items: Item[] = [
    ...sessions.map<Item>((s) => ({ kind: 'session', date: s.scheduled_at, data: s })),
    ...events.map<Item>((e) => ({ kind: 'event', date: e.created_at, data: e })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-border">
      {items.map((item, i) => {
        if (item.kind === 'session') {
          const s = item.data;
          return (
            <div key={`s-${s.id}`} className="relative">
              <div className="absolute -left-[18px] top-2 h-3 w-3 rounded-full bg-gold ring-4 ring-background" />
              <Link
                to={`/partidas?room=${s.id}`}
                className="block rounded-lg border border-border bg-card p-3 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-gold" />
                  <span className="text-[11px] uppercase tracking-wide text-gold font-semibold">
                    Sessão {s.session_number ?? '?'} • {s.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {formatDate(s.scheduled_at)}
                  </span>
                </div>
                <p className="text-sm font-medium">{s.title}</p>
                {s.session_recap && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {s.session_recap}
                  </p>
                )}
              </Link>
            </div>
          );
        }
        const e = item.data;
        const Icon = eventIcon[e.event_type] || Star;
        const color = eventColor[e.event_type] || 'text-muted-foreground';
        return (
          <div key={`e-${e.id}-${i}`} className="relative">
            <div
              className={`absolute -left-[18px] top-2 h-3 w-3 rounded-full bg-secondary ring-4 ring-background border ${color.replace(
                'text-',
                'border-',
              )}`}
            />
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span
                  className={`text-[11px] uppercase tracking-wide font-semibold ${color}`}
                >
                  {e.event_type.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {formatDate(e.created_at)}
                </span>
              </div>
              <p className="text-sm">{e.description ?? '—'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChronicleTimeline;
