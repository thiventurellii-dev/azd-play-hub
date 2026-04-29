import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Calendar, MoreHorizontal, BarChart3, Pencil, Heart, Skull, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import EditBloodScriptDialog from "@/components/blood/EditBloodScriptDialog";
import { FavoriteButton } from "@/components/shared/FavoriteButton";

interface BloodScript {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  victory_conditions: any;
  image_url: string | null;
}
interface BloodCharacter {
  id: string;
  script_id: string;
  name: string;
  name_en: string;
  team: "good" | "evil";
  role_type: string;
}
interface SeasonLink { season_id: string; season_name: string; status: string; }

interface BloodScriptCardProps {
  script: BloodScript;
  characters: BloodCharacter[];
  seasons: SeasonLink[];
  index: number;
  onUpdated: () => void;
}

const BloodScriptCard = ({ script, characters, seasons, index, onUpdated }: BloodScriptCardProps) => {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const goodChars = characters.filter((c) => c.team === "good");
  const evilChars = characters.filter((c) => c.team === "evil");
  const scriptSlug = script.slug || script.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const goToDetail = () => navigate(`/scripts/${scriptSlug}`);
  const hasActiveSeason = seasons.some((s) => s.status === "active");
  const hasActiveTournament = false; // placeholder for future tournament model
  const activeSeason = seasons.find((s) => s.status === "active");

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <article
        onClick={goToDetail}
        style={
          hasActiveTournament
            ? { boxShadow: "0 0 0 1px hsl(45 100% 60% / 0.35), 0 10px 32px -10px hsl(45 100% 55% / 0.45)" }
            : hasActiveSeason
              ? { boxShadow: "0 0 0 1px hsl(265 85% 65% / 0.32), 0 10px 32px -10px hsl(265 85% 60% / 0.45)" }
              : undefined
        }
        className={cn(
          "group relative isolate flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card transform-gpu [backface-visibility:hidden] transition-all duration-300 ring-1 hover:-translate-y-0.5",
          hasActiveTournament
            ? "ring-amber-400/50 hover:ring-amber-400/70"
            : hasActiveSeason
              ? "ring-violet-500/50 hover:ring-violet-400/70"
              : "ring-border/40 hover:ring-destructive/30 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_36px_-12px_rgba(220,38,38,0.18)]",
        )}
      >
        {/* COVER */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-secondary via-card to-background">
          {script.image_url ? (
            <img
              src={script.image_url}
              alt={script.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">🩸</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-card" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5 z-10">
            <div className="flex items-center gap-1.5">
              <div className="opacity-70 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <FavoriteButton entityType="blood_script" entityId={script.id} size="sm" />
              </div>
              {hasActiveTournament ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-amber-400/40 shadow-[0_0_12px_-2px_hsl(45_100%_55%/0.5)]">
                  <Flag className="h-3 w-3" /> Torneio
                </span>
              ) : hasActiveSeason ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeSeason) navigate(`/seasons/${activeSeason.season_id}`);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200 ring-1 ring-violet-400/40 shadow-[0_0_12px_-2px_hsl(265_85%_60%/0.5)] hover:bg-violet-500/30 hover:ring-violet-400/60 transition-colors"
                  title={activeSeason?.season_name ? `Ver ${activeSeason.season_name}` : "Ver Season"}
                >
                  <Flag className="h-3 w-3" /> Season
                </button>
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
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar script
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 z-10">
            <h3 className="text-xl font-bold leading-tight text-white drop-shadow-md line-clamp-2">{script.name}</h3>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {script.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{script.description}</p>
          )}

          <div className="flex-1" />

          {/* Quick stats — personagens · bons · maus */}
          <div className="flex items-end justify-between rounded-lg bg-background/40 px-3 py-2.5 ring-1 ring-border/30">
            <StatBlock value={characters.length} label="Personagens" icon={Users} highlight />
            <div className="h-8 w-px bg-border/50" />
            <StatBlock value={goodChars.length} label="Bons" icon={Heart} />
            <div className="h-8 w-px bg-border/50" />
            <StatBlock value={evilChars.length} label="Maus" icon={Skull} />
          </div>

          {/* Seasons */}
          {seasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hasActiveSeason && (
                <Badge variant="outline" className="border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-wider">
                  <Calendar className="h-3 w-3 mr-1" /> Season Ativa
                </Badge>
              )}
              {seasons.slice(0, 2).map((ss) => (
                <Badge key={ss.season_id} variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
                  {ss.season_name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <EditBloodScriptDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          script={{ ...script, victory_conditions: Array.isArray(script.victory_conditions) ? [...script.victory_conditions] : [] }}
          onSaved={() => { onUpdated(); setEditOpen(false); }}
          showCharacters={true}
        />
      </article>
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

export default BloodScriptCard;
