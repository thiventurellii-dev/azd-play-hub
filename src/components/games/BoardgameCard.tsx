import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Clock, ExternalLink, Video, MoreHorizontal, BarChart3, Pencil, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import GameForm, { type GameFormData } from "@/components/forms/GameForm";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { useAuth } from "@/contexts/AuthContext";
import { canEdit } from "@/utils/permissions";
import { EntitySheet } from "@/components/shared/EntitySheet";

interface SeasonLink {
  season_id: string;
  season_name: string;
  status: string;
}

interface BoardgameCardProps {
  game: GameFormData;
  seasons: SeasonLink[];
  avgDuration?: number;
  matchCount?: number;
  hasActiveSeason?: boolean;
  hasActiveTournament?: boolean;
  tags: string[];
  index: number;
  onUpdated: () => void;
}

const BoardgameCard = ({
  game,
  avgDuration,
  matchCount = 0,
  hasActiveSeason = false,
  hasActiveTournament = false,
  tags,
  index,
  onUpdated,
}: BoardgameCardProps) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const canEditGame = canEdit("boardgame", { role, userId: user?.id ?? null });
  const goToDetail = () => game.slug && navigate(`/jogos/${game.slug}`);

  const CATEGORY_TAGS = new Set(["estrategia", "familia", "social", "tematico"]);
  const normalizeTag = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibleTags = tags.filter((t) => !CATEGORY_TAGS.has(normalizeTag(t)));
  const categoryTag = tags.find((t) => CATEGORY_TAGS.has(normalizeTag(t)));
  const category = (game as any).category || categoryTag || null;
  const description = (game as any).description as string | null | undefined;
  const mechanics = visibleTags.slice(0, 4);
  const playerRange =
    game.min_players || game.max_players ? `${game.min_players ?? "?"}–${game.max_players ?? "?"}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <article
        onClick={goToDetail}
        className={`group relative isolate flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card transform-gpu [backface-visibility:hidden] [-webkit-mask-image:-webkit-radial-gradient(white,black)] transition-all duration-300 ring-1 hover:-translate-y-0.5 ${
          hasActiveTournament
            ? "ring-amber-400/40 shadow-[0_0_0_1px_hsl(45_100%_60%/0.15),0_8px_28px_-10px_hsl(45_100%_55%/0.35)] hover:ring-amber-400/60 hover:shadow-[0_0_0_1px_hsl(45_100%_60%/0.25),0_14px_40px_-10px_hsl(45_100%_55%/0.45)]"
            : hasActiveSeason
              ? "ring-violet-500/40 shadow-[0_0_0_1px_hsl(265_85%_65%/0.12),0_8px_28px_-10px_hsl(265_85%_60%/0.32)] hover:ring-violet-400/60 hover:shadow-[0_0_0_1px_hsl(265_85%_65%/0.22),0_14px_40px_-10px_hsl(265_85%_60%/0.42)]"
              : "ring-border/40 hover:ring-gold/30 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_36px_-12px_rgba(255,184,0,0.18)]"
        }`}
      >
        {/* COVER */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-secondary via-card to-background">
          {game.image_url ? (
            <img
              src={game.image_url}
              alt={game.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-bold text-gold/30">{game.name.charAt(0)}</span>
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-card" />
          {/* Subtle vignette */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

          {/* Top floating actions */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5 z-10">
            <div className="flex items-center gap-1.5">
              <div
                className="opacity-70 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <FavoriteButton entityType="game" entityId={game.id} size="sm" />
              </div>
              {hasActiveTournament ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-amber-400/40 shadow-[0_0_12px_-2px_hsl(45_100%_55%/0.5)]">
                  <Flag className="h-3 w-3" /> Torneio
                </span>
              ) : hasActiveSeason ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200 ring-1 ring-violet-400/40 shadow-[0_0_12px_-2px_hsl(265_85%_60%/0.5)]">
                  <Flag className="h-3 w-3" /> Season
                </span>
              ) : null}
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white/80 hover:text-white opacity-70 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={goToDetail}>
                    <BarChart3 className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                  </DropdownMenuItem>
                  {canEditGame && (
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Editar jogo
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Title overlay on cover bottom */}
          <div className="absolute inset-x-0 bottom-0 p-4 z-10">
            <h3 className="text-xl font-bold leading-tight text-white drop-shadow-md line-clamp-2">
              {game.name}
            </h3>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Category */}
          {category && (
            <p className="text-xs font-semibold uppercase tracking-wider text-gold -mt-1">{category}</p>
          )}

          {/* Mechanics chips */}
          {mechanics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mechanics.map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-foreground/80 ring-1 ring-border/40"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {description}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quick stats — players · matches · duration */}
          <div className="flex items-end justify-between rounded-lg bg-background/40 px-3 py-2.5 ring-1 ring-border/30">
            <StatBlock value={playerRange ?? "—"} label="Jogadores" icon={Users} />
            <div className="h-8 w-px bg-border/50" />
            <StatBlock value={`${matchCount}`} label="Partidas" icon={BarChart3} highlight />
            <div className="h-8 w-px bg-border/50" />
            <StatBlock value={avgDuration ? `${avgDuration}m` : "—"} label="Duração média" icon={Clock} />
          </div>

          {/* Active context */}
          {(hasActiveSeason || hasActiveTournament) && (
            <div className="flex flex-wrap gap-1.5">
              {hasActiveSeason && (
                <Badge
                  variant="outline"
                  className="border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-wider"
                >
                  Season Ativa
                </Badge>
              )}
              {hasActiveTournament && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-[10px] uppercase tracking-wider"
                >
                  Torneio Ativo
                </Badge>
              )}
            </div>
          )}

          {/* Action links */}
          {(game.rules_url || game.video_url) && (
            <div className="flex items-center gap-1 -mx-1 pt-1 border-t border-border/40">
              {game.rules_url && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <a
                    href={game.rules_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Regras
                  </a>
                </Button>
              )}
              {game.video_url && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <a
                    href={game.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Video className="h-3 w-3 mr-1" /> Vídeo
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

      </article>

      {/* Edit sheet (controlled by dropdown) — rendered outside <article> so clicks don't bubble to navigation */}
      {canEditGame && (
        <div onClick={(e) => e.stopPropagation()}>
          <EntitySheet
            open={editOpen}
            onOpenChange={setEditOpen}
            title="Editar Jogo"
            widthClass="sm:max-w-2xl"
          >
            <GameForm
              game={game}
              onSuccess={() => {
                setEditOpen(false);
                onUpdated();
              }}
            />
          </EntitySheet>
        </div>
      )}
    </motion.div>
  );
};

const StatBlock = ({
  icon: Icon,
  value,
  label,
  highlight = false,
}: {
  icon: any;
  value: string | number;
  label: string;
  highlight?: boolean;
}) => (
  <div className="flex flex-1 flex-col items-center gap-0.5 min-w-0 text-center">
    <span className={`text-sm font-bold leading-tight ${highlight ? "text-gold" : "text-foreground"}`}>
      {value}
    </span>
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </span>
  </div>
);

export default BoardgameCard;
