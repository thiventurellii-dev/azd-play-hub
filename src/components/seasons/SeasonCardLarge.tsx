import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Users, Pencil, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { SeasonItem } from "@/hooks/useSeasonsData";
import { colorForIndex, rgba } from "@/lib/seasonColors";

const statusLabels: Record<string, string> = { active: "Ativa", upcoming: "Em breve", finished: "Finalizada" };
const formatDate = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

interface Props {
  season: SeasonItem;
  index: number;
  colorIndex: number;
  linkedNames: string[];
  isAdmin: boolean;
  onEdit: () => void;
}

export const SeasonCardLarge = ({ season: s, index, colorIndex, linkedNames, isAdmin, onEdit }: Props) => {
  const totalPrize = s.type === "blood"
    ? s.prize_1st * 3 + s.prize_4th_6th * 3 + s.prize_7th_10th * 3
    : s.prize_1st + s.prize_2nd + s.prize_3rd;

  const fallbackEmoji = s.type === "blood" ? "🩸" : "🎲";
  const rgb = colorForIndex(colorIndex);
  const badgeStyle: React.CSSProperties = {
    backgroundColor: rgba(rgb, 0.2),
    color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    borderColor: rgba(rgb, 0.4),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="bg-card border-border hover:border-gold/30 transition-colors h-full overflow-hidden group relative">
        <Link to={`/seasons/${s.id}`} className="flex h-full">
          {/* Cover */}
          <div className="relative w-32 sm:w-36 flex-shrink-0 bg-secondary/50 overflow-hidden">
            {s.effective_cover_url ? (
              <img
                src={s.effective_cover_url}
                alt={s.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl">{fallbackEmoji}</div>
            )}
          </div>

          {/* Body */}
          <CardContent className="flex-1 py-4 pr-3 pl-4 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate">{s.name}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
              </div>
            </div>

            {linkedNames.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">{linkedNames.join(", ")}</p>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(s.start_date)} — {formatDate(s.end_date)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Premiação total</p>
                <p className="text-sm font-bold text-gold flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" /> {totalPrize > 0 ? `R$ ${totalPrize}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Participantes</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" /> {s.participants_count}
                </p>
              </div>
            </div>
          </CardContent>
        </Link>

        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur z-10"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </Card>
    </motion.div>
  );
};
