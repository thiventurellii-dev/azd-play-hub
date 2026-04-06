import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Clock, Skull, Shield, Users, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";

import troubleBrewingImg from "@/assets/trouble-brewing.jpg";
import badMoonRisingImg from "@/assets/bad-moon-rising.jpg";
import overTheRiverImg from "@/assets/over-the-river.png";

interface BloodScript {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  victory_conditions: string[];
}

interface BloodCharacter {
  id: string;
  script_id: string;
  name: string;
  name_en: string;
  team: "good" | "evil";
  role_type: "townsfolk" | "outsider" | "minion" | "demon";
  description: string | null;
  icon_url: string | null;
}

interface BloodMatch {
  id: string;
  played_at: string;
  duration_minutes: number | null;
  winning_team: "good" | "evil";
  storyteller_player_id: string;
  season_id: string;
}

interface MatchPlayer {
  match_id: string;
  player_id: string;
  character_id: string;
  team: "good" | "evil";
}

const scriptImages: Record<string, string> = {
  "trouble brewing": troubleBrewingImg,
  "bad moon rising": badMoonRisingImg,
  "over the river": overTheRiverImg,
};

const roleTypeLabels: Record<string, string> = {
  townsfolk: "Aldeões",
  outsider: "Forasteiros",
  minion: "Lacaios",
  demon: "Demônios",
};

const roleOrder = ["townsfolk", "outsider", "minion", "demon"] as const;

const ScriptDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAuth();
  const { notify } = useNotification();

  const [script, setScript] = useState<BloodScript | null>(null);
  const [characters, setCharacters] = useState<BloodCharacter[]>([]);
  const [matches, setMatches] = useState<BloodMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVictoryConditions, setEditVictoryConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState("");

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      // Find script by slug (or by id-based slug)
      const { data: scriptsData } = await supabase
        .from("blood_scripts")
        .select("*")
        .order("name");

      const allScripts = (scriptsData || []) as any[];
      const found = allScripts.find(
        (s: any) => s.slug === slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === slug
      );

      if (!found) {
        setLoading(false);
        return;
      }

      const scriptData: BloodScript = {
        id: found.id,
        name: found.name,
        description: found.description,
        slug: found.slug,
        victory_conditions: Array.isArray(found.victory_conditions) ? found.victory_conditions : [],
      };
      setScript(scriptData);

      // Fetch characters, matches, match_players, profiles in parallel
      const [charsRes, matchesRes] = await Promise.all([
        supabase.from("blood_characters").select("*").eq("script_id", found.id).order("team, role_type, name"),
        supabase.from("blood_matches").select("*").eq("script_id", found.id).order("played_at", { ascending: false }),
      ]);

      const charsData = (charsRes.data || []) as BloodCharacter[];
      setCharacters(charsData);

      const matchesData = (matchesRes.data || []) as BloodMatch[];
      setMatches(matchesData);

      if (matchesData.length > 0) {
        const matchIds = matchesData.map((m) => m.id);
        const { data: mpData } = await supabase
          .from("blood_match_players")
          .select("*")
          .in("match_id", matchIds);
        setMatchPlayers((mpData || []) as MatchPlayer[]);

        // Collect all player IDs
        const playerIds = new Set<string>();
        for (const mp of mpData || []) playerIds.add(mp.player_id);
        for (const m of matchesData) playerIds.add(m.storyteller_player_id);

        if (playerIds.size > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, nickname, name")
            .in("id", [...playerIds]);
          const pMap: Record<string, string> = {};
          for (const p of profilesData || []) pMap[p.id] = p.nickname || p.name;
          setProfiles(pMap);
        }
      }

      setLoading(false);
    };
    load();
  }, [slug]);

  // Stats
  const stats = useMemo(() => {
    if (matches.length === 0) return null;
    const totalTime = matches.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
    const matchesWithDuration = matches.filter((m) => m.duration_minutes);
    const avgTime = matchesWithDuration.length > 0 ? Math.round(totalTime / matchesWithDuration.length) : 0;
    const goodWins = matches.filter((m) => m.winning_team === "good").length;
    const evilWins = matches.filter((m) => m.winning_team === "evil").length;
    const goodPct = Math.round((goodWins / matches.length) * 100);
    const evilPct = 100 - goodPct;
    return { totalTime, avgTime, goodWins, evilWins, goodPct, evilPct, total: matches.length };
  }, [matches]);

  // Character stats
  const characterStats = useMemo(() => {
    const charMap: Record<string, { played: number; wins: number; topPlayers: Record<string, number> }> = {};
    for (const mp of matchPlayers) {
      if (!charMap[mp.character_id]) charMap[mp.character_id] = { played: 0, wins: 0, topPlayers: {} };
      charMap[mp.character_id].played++;
      charMap[mp.character_id].topPlayers[mp.player_id] = (charMap[mp.character_id].topPlayers[mp.player_id] || 0) + 1;
      // Check if this player's team won
      const match = matches.find((m) => m.id === mp.match_id);
      if (match && match.winning_team === mp.team) {
        charMap[mp.character_id].wins++;
      }
    }
    return charMap;
  }, [matchPlayers, matches]);

  // Aggregators
  const demonPlayers = useMemo(() => {
    const demonCharIds = new Set(characters.filter((c) => c.role_type === "demon").map((c) => c.id));
    const playerCounts: Record<string, number> = {};
    for (const mp of matchPlayers) {
      if (demonCharIds.has(mp.character_id)) {
        playerCounts[mp.player_id] = (playerCounts[mp.player_id] || 0) + 1;
      }
    }
    return Object.entries(playerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, name: profiles[id] || "?", count }));
  }, [characters, matchPlayers, profiles]);

  // Edit handlers
  const openEdit = () => {
    if (!script) return;
    setEditName(script.name);
    setEditDesc(script.description || "");
    setEditVictoryConditions([...script.victory_conditions]);
    setNewCondition("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!script) return;
    const { error } = await supabase
      .from("blood_scripts")
      .update({
        name: editName,
        description: editDesc || null,
        victory_conditions: editVictoryConditions as any,
      })
      .eq("id", script.id);
    if (error) return notify("error", error.message);
    notify("success", "Script atualizado!");
    setScript({ ...script, name: editName, description: editDesc || null, victory_conditions: editVictoryConditions });
    setEditOpen(false);
  };

  const getCharIcon = (char: BloodCharacter) => {
    if (char.icon_url) return char.icon_url;
    // Fallback: try BotC wiki-style URL
    const nameEncoded = char.name_en.replace(/ /g, "_");
    return `https://wiki.bloodontheclocktower.com/images/${nameEncoded}_Icon.png`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Script não encontrado</h1>
        <Link to="/games">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
        </Link>
      </div>
    );
  }

  const heroImg = scriptImages[script.name.toLowerCase()] || null;

  return (
    <div className="container py-8 space-y-8">
      {/* Back + Header */}
      <div>
        <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar aos Jogos
        </Link>

        <div className="relative rounded-xl overflow-hidden">
          {heroImg && (
            <div className="absolute inset-0">
              <img src={heroImg} alt={script.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
            </div>
          )}
          <div className="relative p-8 md:p-12">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{script.name}</h1>
                {script.description && <p className="text-muted-foreground max-w-2xl">{script.description}</p>}
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
            </div>

            {/* Victory Conditions */}
            {script.victory_conditions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Condições de Vitória Especiais</p>
                <div className="flex flex-wrap gap-2">
                  {script.victory_conditions.map((vc, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-gold/30 text-gold">{vc}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{Math.floor(stats.totalTime / 60)}h{stats.totalTime % 60}m</p>
              <p className="text-xs text-muted-foreground">Tempo Total</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">~{stats.avgTime}min</p>
              <p className="text-xs text-muted-foreground">Média por Partida</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border border-blue-500/20">
            <CardContent className="py-4 text-center">
              <Shield className="h-5 w-5 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold text-blue-400">{stats.goodPct}%</p>
              <p className="text-xs text-muted-foreground">Vitórias do Bem ({stats.goodWins})</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border border-red-500/20">
            <CardContent className="py-4 text-center">
              <Skull className="h-5 w-5 mx-auto mb-1 text-red-400" />
              <p className="text-2xl font-bold text-red-400">{stats.evilPct}%</p>
              <p className="text-xs text-muted-foreground">Vitórias do Mal ({stats.evilWins})</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Character Grid */}
      <div className="space-y-8">
        <h2 className="text-xl font-bold">Personagens</h2>
        {roleOrder.map((roleType) => {
          const roleChars = characters.filter((c) => c.role_type === roleType);
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
                {roleChars.map((char) => {
                  const cStats = characterStats[char.id];
                  const topPlayers = cStats
                    ? Object.entries(cStats.topPlayers)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                    : [];
                  const winPct = cStats && cStats.played > 0 ? Math.round((cStats.wins / cStats.played) * 100) : 0;

                  return (
                    <Card key={char.id} className={`bg-card ${cardBorder} transition-colors`}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={getCharIcon(char)}
                            alt={char.name}
                            className="h-12 w-12 rounded-lg object-contain flex-shrink-0 bg-secondary/50"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement("div");
                                fallback.className = `h-12 w-12 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isGood ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`;
                                fallback.textContent = getInitials(char.name_en);
                                parent.insertBefore(fallback, target);
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${isGood ? "text-blue-300" : "text-red-300"}`}>{char.name}</p>
                            <p className="text-xs text-muted-foreground">{char.name_en}</p>
                          </div>
                        </div>
                        {char.description && (
                          <p className="text-xs text-muted-foreground italic leading-relaxed">{char.description}</p>
                        )}
                        <Separator className="opacity-30" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {cStats ? `${cStats.played}x jogado` : "Nunca jogado"}
                          </span>
                          {cStats && cStats.played > 0 && (
                            <Badge variant="outline" className={`text-[10px] ${winPct >= 50 ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}`}>
                              {winPct}% vitória
                            </Badge>
                          )}
                        </div>
                        {topPlayers.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Jogadores</p>
                            {topPlayers.map(([pid, count]) => (
                              <div key={pid} className="flex items-center justify-between text-xs">
                                <Link to={`/perfil/${profiles[pid] || pid}`} className="hover:text-foreground text-muted-foreground transition-colors">
                                  {profiles[pid] || "?"}
                                </Link>
                                <span className="text-muted-foreground">{count}x</span>
                              </div>
                            ))}
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

      {/* Aggregators */}
      {demonPlayers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">🔥 Demônios Cruéis</h2>
          <p className="text-sm text-muted-foreground">Jogadores que mais encarnaram demônios neste script</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {demonPlayers.map((dp, i) => (
              <Card key={dp.id} className="bg-card border-red-500/10">
                <CardContent className="py-3 flex items-center gap-3">
                  <span className="text-2xl font-bold text-red-400/50">{i + 1}</span>
                  <div className="flex-1">
                    <Link to={`/perfil/${dp.name}`} className="font-medium hover:text-red-300 transition-colors">{dp.name}</Link>
                  </div>
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
            {matches.slice(0, 20).map((m) => {
              const mPlayers = matchPlayers.filter((mp) => mp.match_id === m.id);
              return (
                <Card key={m.id} className="bg-card border-border">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Badge className={m.winning_team === "good" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                          {m.winning_team === "good" ? "👼 Bem" : "😈 Mal"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(m.played_at).toLocaleDateString("pt-BR")}
                        </span>
                        {m.duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {m.duration_minutes}min
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Narrador: <span className="text-foreground">{profiles[m.storyteller_player_id] || "?"}</span></span>
                        <span>· {mPlayers.length} jogadores</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Script</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Condições de Vitória Especiais</Label>
              <div className="space-y-2">
                {editVictoryConditions.map((vc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={vc} onChange={(e) => {
                      const updated = [...editVictoryConditions];
                      updated[i] = e.target.value;
                      setEditVictoryConditions(updated);
                    }} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditVictoryConditions(editVictoryConditions.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="Ex: Vitória pelo Prefeito" />
                  <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => {
                    if (newCondition.trim()) {
                      setEditVictoryConditions([...editVictoryConditions, newCondition.trim()]);
                      setNewCondition("");
                    }
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>
            <Button variant="gold" onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptDetail;
