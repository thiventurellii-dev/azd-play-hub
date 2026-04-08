import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import EditBloodScriptDialog from "@/components/blood/EditBloodScriptDialog";
import { useState } from "react";

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

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-muted text-muted-foreground border-border",
};

const roleTypeLabels: Record<string, string> = {
  townsfolk: "Cidadão", outsider: "Forasteiro", minion: "Lacaio", demon: "Demônio",
};

interface BloodScriptCardProps {
  script: BloodScript;
  characters: BloodCharacter[];
  seasons: SeasonLink[];
  index: number;
  onUpdated: () => void;
}

const BloodScriptCard = ({ script, characters, seasons, index, onUpdated }: BloodScriptCardProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const goodChars = characters.filter((c) => c.team === "good");
  const evilChars = characters.filter((c) => c.team === "evil");
  const scriptSlug = script.slug || script.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className={`bg-card border-border hover:border-gold/20 transition-all ${expanded ? "" : "h-[280px] overflow-hidden"} flex flex-col relative group cursor-pointer`}>
        <CardContent className="py-5 space-y-3 flex-1 flex flex-col">
          <div className="flex items-start gap-4" onClick={() => navigate(`/scripts/${scriptSlug}`)}>
            {script.image_url ? (
              <img src={script.image_url} alt={script.name} className="h-20 w-20 rounded-lg object-cover flex-shrink-0" loading="lazy" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🩸</div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold">{script.name}</h3>
              {script.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{script.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {characters.length} personagens</span>
                <span>👼 {goodChars.length}</span>
                <span>😈 {evilChars.length}</span>
              </div>
            </div>
          </div>
          <div className="flex-1" />
          {seasons.length > 0 ? (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Seasons
              </p>
              <div className="flex gap-2 flex-wrap">
                {seasons.map((ss) => (
                  <Badge key={ss.season_id} className={`${statusColors[ss.status] || ""} text-xs`}>{ss.season_name}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground italic">Nenhuma season vinculada</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground self-start"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? "▲ Ocultar personagens" : "▼ Ver personagens"}
          </Button>
          {expanded && (
            <div className="border-t border-border pt-3 space-y-2">
              {goodChars.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">👼 Bem</p>
                  <div className="flex flex-wrap gap-1">
                    {goodChars.map((c) => (
                      <Badge key={c.id} variant="outline" className="text-xs">
                        {c.name} <span className="text-muted-foreground ml-1">({roleTypeLabels[c.role_type]})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {evilChars.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">😈 Mal</p>
                  <div className="flex flex-wrap gap-1">
                    {evilChars.map((c) => (
                      <Badge key={c.id} variant="outline" className="text-xs border-destructive/30">
                        {c.name} <span className="text-muted-foreground ml-1">({roleTypeLabels[c.role_type]})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <div className="absolute top-3 right-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
          <EntityEditButton entityType="blood_script" title="Editar Script">
            {(onClose) => {
              // We use the EditBloodScriptDialog's form content inline
              // For now, render a placeholder that opens the unified dialog
              return <ScriptEditInline script={script} onClose={onClose} onSaved={onUpdated} />;
            }}
          </EntityEditButton>
        </div>
      </Card>
    </motion.div>
  );
};

/** Inline wrapper that uses EditBloodScriptDialog logic but as a form */
const ScriptEditInline = ({ script, onClose, onSaved }: { script: BloodScript; onClose: () => void; onSaved: () => void }) => {
  // Since EditBloodScriptDialog is a standalone dialog, we'll just trigger the parent's unified dialog.
  // This is a temporary bridge - ideally we'd extract a BloodScriptForm.
  const [open, setOpen] = useState(true);
  return (
    <EditBloodScriptDialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) onClose(); }}
      script={{ ...script, victory_conditions: Array.isArray(script.victory_conditions) ? [...script.victory_conditions] : [] }}
      onSaved={() => { onSaved(); onClose(); }}
      showCharacters={true}
    />
  );
};

export default BloodScriptCard;
