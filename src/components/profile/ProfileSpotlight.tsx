import { Link } from "react-router-dom";
import { Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonContext } from "@/hooks/usePlayerProfileData";
import type { ProfileRpgCampaign } from "@/hooks/useProfileRpgData";

interface Props {
  activeSeason: SeasonContext | null;
  masteringCampaign: ProfileRpgCampaign | null;
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dayMonth} · ${time}`;
};

export const ProfileSpotlight = ({ activeSeason, masteringCampaign }: Props) => {
  if (!activeSeason && !masteringCampaign) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1">
        Em destaque agora
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {activeSeason && <SeasonCard s={activeSeason} />}
        {masteringCampaign && <MasterCard c={masteringCampaign} />}
      </div>
    </div>
  );
};

const SeasonCard = ({ s }: { s: SeasonContext }) => {
  const daysLeft = s.end_date
    ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const range = s.max_mmr - s.min_mmr;
  const progress = range > 0 ? Math.round(((s.current_mmr - s.min_mmr) / range) * 100) : 50;

  return (
    <Link
      to={`/seasons/${s.id}`}
      className={cn(
        "group rounded-xl border bg-card p-4 transition-colors",
        "border-border hover:border-domain-board/50",
      )}
    >
      <div className="flex items-center gap-2 text-domain-board text-[11px] font-semibold uppercase tracking-wider">
        <Trophy className="h-3.5 w-3.5" /> Season ativa
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{s.name}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-domain-board tabular-nums">#{s.position}</span>
        <span className="text-sm text-muted-foreground">de {s.total} jogadores</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">MMR {Math.round(s.current_mmr)}</span>
        {daysLeft != null && daysLeft > 0 && (
          <span className="text-muted-foreground">termina em {daysLeft} dias</span>
        )}
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-700 via-domain-board to-amber-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
};

const MasterCard = ({ c }: { c: ProfileRpgCampaign }) => {
  return (
    <Link
      to={c.slug ? `/rpg/campanhas/${c.slug}` : "#"}
      className="group rounded-xl border border-border bg-card p-4 hover:border-domain-rpg/50 transition-colors"
    >
      <div className="flex items-center gap-2 text-domain-rpg text-[11px] font-semibold uppercase tracking-wider">
        <Sparkles className="h-3.5 w-3.5" /> Mestrando
      </div>
      {c.adventure_name && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{c.adventure_name}</p>
      )}
      <p className="mt-2 text-lg font-bold leading-snug line-clamp-1">{c.name}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {c.party_count} aventureiro{c.party_count === 1 ? "" : "s"} · {c.session_count}{" "}
          sessõe{c.session_count === 1 ? "" : "s"}
        </span>
        {c.next_session_at && (
          <span className="text-domain-rpg font-medium tabular-nums">
            {formatDateTime(c.next_session_at)}
          </span>
        )}
      </div>
    </Link>
  );
};

export default ProfileSpotlight;
