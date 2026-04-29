import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ExternalLink, Video, MoreHorizontal, Pencil, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { EntitySheet } from "@/components/shared/EntitySheet";
import RpgSystemForm from "@/components/forms/RpgSystemForm";
import { useAuth } from "@/contexts/AuthContext";
import { canEdit } from "@/utils/permissions";

interface Props {
  system: any;
  adventuresCount: number;
  index: number;
  onUpdated: () => void;
}

const RpgSystemCard = ({ system, adventuresCount, index, onUpdated }: Props) => {
  const { user, role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const canEditSys = canEdit("rpg", { role, userId: user?.id ?? null });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card transition-all duration-300 ring-1 ring-border/40 hover:ring-purple-500/30 hover:-translate-y-0.5 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_36px_-12px_rgba(168,85,247,0.18)]">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-secondary via-card to-background">
          {system.image_url ? (
            <img src={system.image_url} alt={system.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">🎭</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-card" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

          {canEditSys && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white/80 hover:text-white opacity-70 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4 z-10">
            <h3 className="text-xl font-bold leading-tight text-white drop-shadow-md line-clamp-2">{system.name}</h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          {system.description && <p className="text-xs text-muted-foreground line-clamp-2">{system.description}</p>}

          <div className="flex-1" />

          <div className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2 ring-1 ring-border/30">
            <Stat icon={BookOpen} value={adventuresCount} label="aventuras" />
            <div className="h-6 w-px bg-border/50" />
            <Stat icon={Users} value="RPG" />
          </div>

          {(system.rules_url || system.video_url) && (
            <div className="flex items-center gap-1 -mx-1 pt-1 border-t border-border/40">
              {system.rules_url && (
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <a href={system.rules_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Regras
                  </a>
                </Button>
              )}
              {system.video_url && (
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <a href={system.video_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Video className="h-3 w-3 mr-1" /> Vídeo
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {canEditSys && (
          <EntitySheet open={editOpen} onOpenChange={setEditOpen} title="Editar Sistema" widthClass="sm:max-w-2xl">
            <RpgSystemForm system={system} onSuccess={() => { setEditOpen(false); onUpdated(); }} />
          </EntitySheet>
        )}
      </article>
    </motion.div>
  );
};

const Stat = ({ icon: Icon, value, label }: { icon?: any; value: string | number; label?: string }) => (
  <div className="flex items-center gap-1.5 min-w-0">
    {Icon && <Icon className="h-3.5 w-3.5 text-gold/60 shrink-0" />}
    <span className="text-xs font-semibold text-foreground">{value}</span>
    {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
  </div>
);

export default RpgSystemCard;
