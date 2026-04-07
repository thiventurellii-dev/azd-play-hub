import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, ExternalLink, Video, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import GameForm, { type GameFormData } from "@/components/forms/GameForm";

interface SeasonLink {
  season_id: string;
  season_name: string;
  status: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-muted text-muted-foreground border-border",
};

interface BoardgameCardProps {
  game: GameFormData;
  seasons: SeasonLink[];
  avgDuration?: number;
  tags: string[];
  index: number;
  onUpdated: () => void;
}

const BoardgameCard = ({ game, seasons, avgDuration, tags, index, onUpdated }: BoardgameCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full flex flex-col relative group">
        <CardContent
          className="py-5 space-y-4 flex-1 flex flex-col cursor-pointer"
          onClick={() => (game.slug ? navigate(`/jogos/${game.slug}`) : undefined)}
        >
          <div className="flex items-start gap-4">
            {game.image_url ? (
              <img src={game.image_url} alt={game.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold text-2xl flex-shrink-0">
                {game.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold">{game.name}</h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {(game.min_players || game.max_players) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" /> {game.min_players || "?"}–{game.max_players || "?"}
                  </p>
                )}
                {avgDuration && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" /> ~{avgDuration} min
                  </p>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] py-0">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {(game.rules_url || game.video_url) && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {game.rules_url && (
                    <a href={game.rules_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1 py-0.5 px-2 text-[10px]">
                        <ExternalLink className="h-3 w-3" /> Regras
                      </Badge>
                    </a>
                  )}
                  {game.video_url && (
                    <a href={game.video_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1 py-0.5 px-2 text-[10px]">
                        <Video className="h-3 w-3" /> Vídeo
                      </Badge>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1" />
          {seasons.length > 0 ? (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Seasons
              </p>
              <div className="flex gap-2 flex-wrap">
                {seasons.map((s) => (
                  <Badge key={s.season_id} className={`${statusColors[s.status] || "bg-muted text-muted-foreground border-border"} text-xs`}>
                    {s.season_name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground italic">Nenhuma season vinculada</p>
            </div>
          )}
        </CardContent>
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
          <EntityEditButton entityType="boardgame" title="Editar Jogo" widthClass="sm:max-w-2xl">
            {(onClose) => <GameForm game={game} onSuccess={() => { onClose(); onUpdated(); }} />}
          </EntityEditButton>
        </div>
      </Card>
    </motion.div>
  );
};

export default BoardgameCard;
