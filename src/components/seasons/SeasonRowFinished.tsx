import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, User } from "lucide-react";
import type { SeasonItem } from "@/hooks/useSeasonsData";

interface Props {
  season: SeasonItem;
  linkedNames: string[];
}

const formatDate = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

export const SeasonRowFinished = ({ season: s, linkedNames }: Props) => {
  const totalPrize = s.type === "blood"
    ? s.prize_1st * 3 + s.prize_4th_6th * 3 + s.prize_7th_10th * 3
    : s.prize_1st + s.prize_2nd + s.prize_3rd;
  const icon = s.type === "blood" ? "🩸" : "🎲";
  const championInitial = s.champion_name?.charAt(0).toUpperCase() || "?";

  return (
    <Link
      to={`/seasons/${s.id}`}
      className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_auto] items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:border-gold/30 transition-colors"
    >
      <div className="h-10 w-10 rounded-md bg-secondary/60 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold truncate">{s.name}</p>
          <Badge variant="outline" className="text-[10px]">Finalizada</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate md:hidden">
          {linkedNames.join(", ") || "—"} · {formatDate(s.start_date)} — {formatDate(s.end_date)}
        </p>
      </div>

      <p className="hidden md:block text-sm text-muted-foreground truncate">{linkedNames.join(", ") || "—"}</p>
      <p className="hidden md:block text-sm text-muted-foreground">{formatDate(s.start_date)} — {formatDate(s.end_date)}</p>

      <div className="hidden md:flex items-center gap-2 text-sm min-w-0">
        <span className="text-muted-foreground flex-shrink-0">Campeão</span>
        {s.champion_name ? (
          <>
            <Avatar className="h-6 w-6 flex-shrink-0">
              {s.champion_avatar_url && <AvatarImage src={s.champion_avatar_url} alt={s.champion_name} />}
              <AvatarFallback className="text-[10px] bg-secondary">{championInitial}</AvatarFallback>
            </Avatar>
            <span className="text-gold font-medium truncate">{s.champion_name}</span>
          </>
        ) : (
          <>
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">—</span>
          </>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gold justify-self-end whitespace-nowrap">
        <Trophy className="h-3.5 w-3.5" />
        {totalPrize > 0 ? `R$ ${totalPrize}` : "—"}
      </div>
    </Link>
  );
};
