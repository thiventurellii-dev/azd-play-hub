import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Skull, Shield, Timer, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import BloodScriptForm from "@/components/forms/BloodScriptForm";
import BloodMatchEditDialog from "@/components/games/BloodMatchEditDialog";
import { useScriptDetail } from "@/hooks/useScriptDetail";
import { useQueryClient } from "@tanstack/react-query";

const roleTypeLabels: Record<string, string> = { townsfolk: "Aldeões", outsider: "Forasteiros", minion: "Lacaios", demon: "Demônios" };
const roleOrder = ["townsfolk", "outsider", "minion", "demon"] as const;

const getCharIconUrl = (char: any) => {
  if (char.icon_url) return char.icon_url;
  return `https://raw.githubusercontent.com/Covre912/botc_imagens/main/${char.name_en.toLowerCase().replace(/ /g, "_")}.png`;
};
const getInitials = (name: string) => name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

const ScriptDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useScriptDetail(slug);

  const [expandedChars, setExpandedChars] = useState<Record<string, boolean>>({});
  const [editMatchOpen, setEditMatchOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<any>(null);
  const [editMatchPlayers, setEditMatchPlayers] = useState<any[]>([]);

  const script = data?.script;
  const characters = data?.characters || [];
  const matches = data?.matches || [];
  const matchPlayers = data?.matchPlayers || [];
  const profiles = data?.profiles || {};
  const allPlayers = data?.allPlayers || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["script-detail", slug] });

  const stats = useMemo(() => {
    if (matches.length === 0) return null;
    const totalTime = matches.reduce((sum: number, m: any) => sum + (m.duration_minutes || 0), 0);
    const matchesWithDuration = matches.filter((m: any) => m.duration_minutes);
    const avgTime = matchesWithDuration.length > 0 ? Math.round(totalTime / matchesWithDuration.length) : 0;
    const goodWins = matches.filter((m: any) => m.winning_team === "good").length;
    const evilWins = matches.filter((m: any) => m.winning_team === "evil").length;
    const goodPct = Math.round((goodWins / matches.length) * 100);
    return { totalTime, avgTime, goodWins, evilWins, goodPct, evilPct: 100 - goodPct, total: matches.length };
  }, [matches]);

  const characterStats = useMemo(() => {
    const charMap: Record<string, { played: number; wins: number; topPlayers: Record<string, number> }> = {};
    for (const mp of matchPlayers) {
      if (!charMap[mp.character_id]) charMap[mp.character_id] = { played: 0, wins: 0, topPlayers: {} };
      charMap[mp.character_id].played++;
      charMap[mp.character_id].topPlayers[mp.player_id] = (charMap[mp.character_id].topPlayers[mp.player_id] || 0) + 1;
      const match = matches.find((m: any) => m.id === mp.match_id);
      if (match && match.winning_team === mp.team) charMap[mp.character_id].wins++;
    }
    return charMap;
  }, [matchPlayers, matches]);

  const demonPlayers = useMemo(() => {
    const demonCharIds = new Set(characters.filter((c: any) => c.role_type === "demon").map((c: any) => c.id));
    const playerCounts: Record<string, number> = {};
    for (const mp of matchPlayers) { if (demonCharIds.has(mp.character_id)) playerCounts[mp.player_id] = (playerCounts[mp.player_id] || 0) + 1; }
    return Object.entries(playerCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id, count]) => ({ id, name: profiles[id] || "?", count }));
  }, [characters, matchPlayers, profiles]);

  const victoryConditionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) { for (const vc of Array.isArray(m.victory_conditions) ? m.victory_conditions : []) counts[vc] = (counts[vc] || 0) + 1; }
    return counts;
  }, [matches]);

  const openEditMatch = (m: any) => {
    setEditMatch(m);
    setEditMatchPlayers(matchPlayers.filter((mp: any) => mp.match_id === m.id).map((mp: any) => ({ player_id: mp.player_id, character_id: mp.character_id, team: mp.team, match_id: mp.match_id })));
    setEditMatchOpen(true);
  };

  if (isLoading) return <div className="container py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  if (!script) return <div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Script não encontrado</h1><Link to="/games"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button></Link></div>;

  return (
    <div className="container py-8 space-y-8">
      <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Voltar aos Jogos</Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        {script.image_url && <div className="flex justify-center"><img src={script.image_url} alt={script.name} className="h-48 w-auto max-w-full rounded-xl object-contain" /></div>}
        <div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{script.name}</h1>
            <FavoriteButton entityType="blood_script" entityId={script.id} size="md" />
            <EntityEditButton entityType="blood_script" title="Editar Script">
              {(onClose) => (
                <BloodScriptForm
                  script={{ ...script, image_url: script.image_url, victory_conditions: script.victory_conditions }}
                  onSuccess={() => { onClose(); invalidate(); }}
                />
              )}
            </EntityEditButton>
          </div>
          {script.description && <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">{script.description}</p>}
        </div>

        {stats && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4 text-foreground" /><span className="text-foreground font-medium">{Math.floor(stats.totalTime / 60)}h{String(stats.totalTime % 60).padStart(2, "0")}m</span> Tempo Total</span>
              <Separator orientation="vertical" className="h-5" />
              <span className="flex items-center gap-1.5 text-muted-foreground"><Timer className="h-4 w-4 text-foreground" /><span className="text-foreground font-medium">~{stats.avgTime}min</span> Média por Partida</span>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-foreground" /><span className="text-blue-400 font-bold">{stats.goodPct}%</span><span className="text-muted-foreground">Bem ({stats.goodWins})</span></span>
              <Separator orientation="vertical" className="h-5" />
              <span className="flex items-center gap-1.5"><Skull className="h-4 w-4 text-foreground" /><span className="text-red-400 font-bold">{stats.evilPct}%</span><span className="text-muted-foreground">Mal ({stats.evilWins})</span></span>
            </div>
          </div>
        )}

        {script.victory_conditions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 max-w-2xl mx-auto pt-2">
            {script.victory_conditions.map((vc: string, i: number) => (<div key={i} className="text-center"><p className="text-sm font-medium">{vc}</p><p className="text-xs text-muted-foreground">{victoryConditionCounts[vc] || 0} vezes</p></div>))}
          </div>
        )}
      </motion.div>

      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Characters */}
      <div className="space-y-8">
        <h2 className="text-xl font-bold">Personagens</h2>
        {roleOrder.map((roleType) => {
          const roleChars = characters.filter((c: any) => c.role_type === roleType);
          if (roleChars.length === 0) return null;
          const isGood = roleType === "townsfolk" || roleType === "outsider";
          const headerColor = isGood ? "text-blue-400 border-blue-500/30" : "text-red-400 border-red-500/30";
          const cardBorder = isGood ? "border-blue-500/10 hover:border-blue-500/30" : "border-red-500/10 hover:border-red-500/30";
          return (
            <motion.div key={roleType} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${headerColor}`}>
                <span className="text-lg">{isGood ? "👼" : "😈"}</span>
                <h3 className="text-lg font-bold">{roleTypeLabels[roleType]}</h3>
                <Badge variant="outline" className={`ml-auto ${headerColor}`}>{roleChars.length}</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roleChars.map((char: any) => {
                  const cStats = characterStats[char.id];
                  const topPlayers = cStats ? Object.entries(cStats.topPlayers).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 3) : [];
                  const winPct = cStats && cStats.played > 0 ? Math.round((cStats.wins / cStats.played) * 100) : 0;
                  const iconUrl = getCharIconUrl(char);
                  const isExpanded = expandedChars[char.id] || false;
                  return (
                    <Card key={char.id} className={`bg-card ${cardBorder} transition-colors`}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${isGood ? "bg-blue-950/60" : "bg-red-950/60"}`}>
                            <img src={iconUrl} alt={char.name} className="h-10 w-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if (fb) fb.style.display = "flex"; }} />
                            <span className={`text-sm font-bold hidden items-center justify-center ${isGood ? "text-blue-400" : "text-red-400"}`} style={{ display: "none" }}>{getInitials(char.name_en)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${isGood ? "text-blue-300" : "text-red-300"}`}>{char.name}</p>
                            <p className="text-xs text-muted-foreground">{char.name_en}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-foreground">{cStats ? `${cStats.played}x` : "0x"}</span>
                            {cStats && cStats.played > 0 && <span className={`text-xs font-semibold ${winPct <= 20 ? "text-red-400" : winPct <= 50 ? "text-yellow-400" : "text-green-400"}`}>{winPct}%</span>}
                          </div>
                        </div>
                        {char.description && <p className="text-xs text-muted-foreground italic leading-relaxed">{char.description}</p>}
                        {topPlayers.length > 0 && (
                          <div>
                            <button onClick={() => setExpandedChars((prev) => ({ ...prev, [char.id]: !prev[char.id] }))} className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
                              <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} /> Mais Jogado Por
                            </button>
                            {isExpanded && (
                              <div className="space-y-1 mt-1.5">
                                {topPlayers.map(([pid, count]) => (
                                  <div key={pid} className="flex items-center justify-between text-xs">
                                    <Link to={`/perfil/${profiles[pid] || pid}`} className="hover:text-foreground text-muted-foreground transition-colors">{profiles[pid] || "?"}</Link>
                                    <span className="text-muted-foreground">{count as number}x</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Demon Players */}
      {demonPlayers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">🔥 Demônios Cruéis</h2>
          <p className="text-sm text-muted-foreground">Jogadores que mais encarnaram demônios neste script</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {demonPlayers.map((dp, i) => (
              <Card key={dp.id} className="bg-card border-red-500/10">
                <CardContent className="py-3 flex items-center gap-3">
                  <span className="text-2xl font-bold text-red-400/50">{i + 1}</span>
                  <div className="flex-1"><Link to={`/perfil/${dp.name}`} className="font-medium hover:text-red-300 transition-colors">{dp.name}</Link></div>
                  <Badge variant="outline" className="border-red-500/30 text-red-400">{dp.count}x</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Match History */}
      {matches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Histórico de Partidas</h2>
          <div className="space-y-2">
            {matches.slice(0, 20).map((m: any) => {
              const mPlayers = matchPlayers.filter((mp: any) => mp.match_id === m.id);
              return (
                <Card key={m.id} className="bg-card border-border">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Badge className={m.winning_team === "good" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                          {m.winning_team === "good" ? "👼 Bem" : "😈 Mal"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{new Date(m.played_at).toLocaleDateString("pt-BR")}</span>
                        {m.duration_minutes && <span className="text-xs text-muted-foreground">{m.duration_minutes}min</span>}
                        <span className="text-xs text-muted-foreground">Narrador: {profiles[m.storyteller_player_id] || "?"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{mPlayers.length} jogadores</span>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMatch(m)}>
                            <span className="text-xs">✏️</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mPlayers.map((mp: any) => {
                        const char = characters.find((c: any) => c.id === mp.character_id);
                        return (
                          <Badge key={mp.player_id} variant="outline" className={`text-[10px] ${mp.team === "good" ? "border-blue-500/20 text-blue-300" : "border-red-500/20 text-red-300"}`}>
                            {profiles[mp.player_id] || "?"} ({char?.name || "?"})
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {editMatch && (
        <BloodMatchEditDialog
          open={editMatchOpen}
          onOpenChange={setEditMatchOpen}
          match={editMatch}
          matchPlayers={editMatchPlayers}
          allPlayers={allPlayers}
          goodChars={characters.filter((c) => c.team === "good")}
          evilChars={characters.filter((c) => c.team === "evil")}
          victoryConditionOptions={script?.victory_conditions || []}
          onSaved={invalidate}
        />
      )}
    </div>
  );
};

export default ScriptDetail;
