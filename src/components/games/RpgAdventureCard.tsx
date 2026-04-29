import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { EntitySheet } from "@/components/shared/EntitySheet";
import RpgAdventureForm from "@/components/forms/RpgAdventureForm";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { useAuth } from "@/contexts/AuthContext";
import { canEdit } from "@/utils/permissions";
import { slugify } from "@/lib/slugify";

interface Props {
  adventure: any;
  system?: any;
  systems: any[];
  index: number;
  onUpdated: () => void;
}

const RpgAdventureCard = ({ adventure, system, systems, index, onUpdated }: Props) => {
  const { user, role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const canEditAdv = canEdit("rpg", { role, userId: user?.id ?? null });
  const advSlug = adventure.slug || slugify(adventure.name) || adventure.id;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card transition-all duration-300 ring-1 ring-border/40 hover:ring-gold/30 hover:-translate-y-0.5 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_36px_-12px_rgba(255,184,0,0.18)]">
        <Link to={`/aventuras/${advSlug}`} className="block">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-secondary via-card to-background">
            {adventure.image_url ? (
              <img src={adventure.image_url} alt={adventure.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl">📜</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-card" />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5 z-10">
              <div className="opacity-70 transition-opacity group-hover:opacity-100" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <FavoriteButton entityType="rpg_adventure" entityId={adventure.id} size="sm" />
              </div>
              {canEditAdv && (
                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white/80 hover:text-white opacity-70 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link to={`/aventuras/${advSlug}`}>
                          <BarChart3 className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar aventura
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 z-10">
              <h3 className="text-lg font-bold leading-tight text-white drop-shadow-md line-clamp-2">{adventure.name}</h3>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            {adventure.tagline || adventure.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{adventure.tagline || adventure.description}</p>
            ) : null}

            <div className="flex-1" />

            <div className="flex flex-wrap gap-1.5">
              {system && <Badge variant="outline" className="text-[10px] border-gold/30 text-gold/90">🎭 {system.name}</Badge>}
              <Badge variant="outline" className={`text-[10px] ${adventure.tag === "homebrew" ? "border-orange-500/30 text-orange-400" : "border-emerald-500/30 text-emerald-400"}`}>
                {adventure.tag === "homebrew" ? "🏠 Homebrew" : "📖 Oficial"}
              </Badge>
            </div>
          </div>
        </Link>

        {canEditAdv && (
          <EntitySheet open={editOpen} onOpenChange={setEditOpen} title="Editar Aventura" widthClass="sm:max-w-2xl">
            <RpgAdventureForm adventure={adventure} systems={systems} onSuccess={() => { setEditOpen(false); onUpdated(); }} />
          </EntitySheet>
        )}
      </article>
    </motion.div>
  );
};

export default RpgAdventureCard;
