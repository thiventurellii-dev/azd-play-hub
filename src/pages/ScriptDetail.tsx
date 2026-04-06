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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Clock, Skull, Shield, Pencil, Plus, Trash2, Timer, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { recalculateSeasonRatings } from "@/lib/bloodRatings";

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
  victory_conditions?: string[];
}

interface MatchPlayer {
  match_id: string;
  player_id: string;
  character_id: string;
  team: "good" | "evil";
}

const roleTypeLabels: Record<string, string> = {
  townsfolk: "Aldeões",
  outsider: "Forasteiros",
  minion: "Lacaios",
  demon: "Demônios",
};

const roleOrder = ["townsfolk", "outsider", "minion", "demon"] as const;

const getCharIconUrl = (char: BloodCharacter) => {
  if (char.icon_url) return char.icon_url;
  const normalized = char.name_en.toLowerCase().replace(/ /g, "_");
  return `https://raw.githubusercontent.com/Covre912/botc_imagens/main/${normalized}.png`;
};

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const ScriptDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAuth();
  const { notify } = useNotification();

  const [script, setScript] = useState<BloodScript | null>(null);
  const [scriptImageUrl, setScriptImageUrl] = useState<string | null>(null);
  const [characters, setCharacters] = useState<BloodCharacter[]>([]);
  const [matches, setMatches] = useState<BloodMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedChars, setExpandedChars] = useState<Record<string, boolean>>({});

  // Edit script dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editVictoryConditions, setEditVictoryConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState("");

  // Edit match dialog
  const [editMatchOpen, setEditMatchOpen] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [emWinningTeam, setEmWinningTeam] = useState<'good' | 'evil'>('good');
  const [emDuration, setEmDuration] = useState('');
  const [emStoryteller, setEmStoryteller] = useState('');
  const [emPlayers, setEmPlayers] = useState<{ player_id: string; character_id: string; team: 'good' | 'evil' }[]>([]);
  const [emVictoryConditions, setEmVictoryConditions] = useState<string[]>([]);
  const [emSaving, setEmSaving] = useState(false);
  const [allPlayers, setAllPlayers] = useState<{ id: string; name: string; nickname?: string }[]>([]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data: scriptsData } = await supabase
        .from("blood_scripts")
        .select("*")
        .order("name");

      const allScripts = (scriptsData || []) as any[];
      const found = allScripts.find(
        (s: any) => s.slug === slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === slug
      );

      if (!found) { setLoading(false); return; }

      const scriptData: BloodScript = {
        id: found.id,
        name: found.name,
        description: found.description,
        slug: found.slug,
        victory_conditions: Array.isArray(found.victory_conditions) ? found.victory_conditions : [],
      };
      setScript(scriptData);
      setScriptImageUrl(found.image_url || null);

      const [charsRes, matchesRes, playersRes] = await Promise.all([
        supabase.from("blood_characters").select("*").eq("script_id", found.id).order("team, role_type, name"),
        supabase.from("blood_matches").select("*").eq("script_id", found.id).order("played_at", { ascending: false }),
        supabase.from("profiles").select("id, name, nickname").order("name"),
      ]);

      setCharacters((charsRes.data || []) as BloodCharacter[]);
      setAllPlayers((playersRes.data || []) as any[]);
      const matchesData = (matchesRes.data || []) as BloodMatch[];
      setMatches(matchesData);

      if (matchesData.length > 0) {
        const matchIds = matchesData.map((m) => m.id);
        const { data: mpData } = await supabase.from("blood_match_players").select("*").in("match_id", matchIds);
        setMatchPlayers((mpData || []) as MatchPlayer[]);

        const playerIds = new Set<string>();
        for (const mp of mpData || []) playerIds.add(mp.player_id);
        for (const m of matchesData) playerIds.add(m.storyteller_player_id);

        if (playerIds.size > 0) {
          const { data: profilesData } = await supabase.from("profiles").select("id, nickname, name").in("id", [...playerIds]);
          const pMap: Record<string, string> = {};
          for (const p of profilesData || []) pMap[p.id] = p.nickname || p.name;
          setProfiles(pMap);
        }
      }
      setLoading(false);
    };
    load();
  }, [slug]);

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

  const characterStats = useMemo(() => {
    const charMap: Record<string, { played: number; wins: number; topPlayers: Record<string, number> }> = {};
    for (const mp of matchPlayers) {
      if (!charMap[mp.character_id]) charMap[mp.character_id] = { played: 0, wins: 0, topPlayers: {} };
      charMap[mp.character_id].played++;
      charMap[mp.character_id].topPlayers[mp.player_id] = (charMap[mp.character_id].topPlayers[mp.player_id] || 0) + 1;
      const match = matches.find((m) => m.id === mp.match_id);
      if (match && match.winning_team === mp.team) charMap[mp.character_id].wins++;
    }
    return charMap;
  }, [matchPlayers, matches]);

  const demonPlayers = useMemo(() => {
    const demonCharIds = new Set(characters.filter((c) => c.role_type === "demon").map((c) => c.id));
    const playerCounts: Record<string, number> = {};
    for (const mp of matchPlayers) {
      if (demonCharIds.has(mp.character_id)) playerCounts[mp.player_id] = (playerCounts[mp.player_id] || 0) + 1;
    }
    return Object.entries(playerCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id, count]) => ({ id, name: profiles[id] || "?", count }));
  }, [characters, matchPlayers, profiles]);

  const victoryConditionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      const vcs = Array.isArray(m.victory_conditions) ? m.victory_conditions : [];
      for (const vc of vcs) {
        counts[vc] = (counts[vc] || 0) + 1;
      }
    }
    return counts;
  }, [matches]);

  // Edit script handlers
  const openEdit = () => {
    if (!script) return;
    setEditName(script.name);
    setEditDesc(script.description || "");
    setEditVictoryConditions([...script.victory_conditions]);
    setEditImageUrl(scriptImageUrl || "");
    setNewCondition("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!script) return;
    const updateData: any = {
      name: editName,
      description: editDesc || null,
      victory_conditions: editVictoryConditions,
    };
    if (editImageUrl !== (scriptImageUrl || "")) {
      updateData.image_url = editImageUrl || null;
    }
    const { error } = await supabase.from("blood_scripts").update(updateData).eq("id", script.id);
    if (error) return notify("error", error.message);
    notify("success", "Script atualizado!");
    setScript({ ...script, name: editName, description: editDesc || null, victory_conditions: editVictoryConditions });
    setScriptImageUrl(editImageUrl || null);
    setEditOpen(false);
  };

  // Edit match handlers
  const openEditMatch = (m: BloodMatch) => {
    setEditingMatchId(m.id);
    setEmWinningTeam(m.winning_team);
    setEmDuration(m.duration_minutes?.toString() || '');
    setEmStoryteller(m.storyteller_player_id);
    const mps = matchPlayers.filter(mp => mp.match_id === m.id);
    setEmPlayers(mps.map(mp => ({ player_id: mp.player_id, character_id: mp.character_id, team: mp.team })));
    setEmVictoryConditions(Array.isArray(m.victory_conditions) ? [...m.victory_conditions] : []);
    setEditMatchOpen(true);
  };

  const handleMatchSave = async () => {
    if (!editingMatchId || !script) return;
    setEmSaving(true);
    try {
      const match = matches.find(m => m.id === editingMatchId);
      if (!match) throw new Error("Partida não encontrada");

      const { error: matchError } = await supabase.from("blood_matches").update({
        winning_team: emWinningTeam as any,
        duration_minutes: parseInt(emDuration) || null,
        storyteller_player_id: emStoryteller,
        victory_conditions: emVictoryConditions,
      } as any).eq("id", editingMatchId);
      if (matchError) throw matchError;

      // Delete old players and re-insert
      await supabase.from("blood_match_players").delete().eq("match_id", editingMatchId);
      if (emPlayers.length > 0) {
        const { error: pError } = await supabase.from("blood_match_players").insert(
          emPlayers.map(p => ({ match_id: editingMatchId, player_id: p.player_id, character_id: p.character_id, team: p.team as any }))
        );
        if (pError) throw pError;
      }

      await recalculateSeasonRatings(match.season_id);
      notify("success", "Partida atualizada!");
      setEditMatchOpen(false);
      // Refresh data
      window.location.reload();
    } catch (err: any) {
      notify("error", err.message || "Erro ao salvar");
    } finally {
      setEmSaving(false);
    }
  };

  const toggleCharExpanded = (charId: string) => {
    setExpandedChars(prev => ({ ...prev, [charId]: !prev[charId] }));
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
        <Link to="/games"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button></Link>
      </div>
    );
  }

  const evilChars = characters.filter(c => c.team === 'evil');
  const goodChars = characters.filter(c => c.team === 'good');

  return (
    <div className="container py-8 space-y-8">
      {/* Back */}
      <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Voltar aos Jogos
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        {scriptImageUrl && (
          <div className="flex justify-center">
            <img src={scriptImageUrl} alt={script.name} className="h-48 w-auto max-w-full rounded-xl object-contain" />
          </div>
        )}
        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold">{script.name}</h1>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {script.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">{script.description}</p>
          )}
        </div>

        {stats && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4 text-foreground" />
                <span className="text-foreground font-medium">{Math.floor(stats.totalTime / 60)}h{String(stats.totalTime % 60).padStart(2, '0')}m</span>
                Tempo Total
              </span>
              <Separator orientation="vertical" className="h-5" />
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Timer className="h-4 w-4 text-foreground" />
                <span className="text-foreground font-medium">~{stats.avgTime}min</span>
                Média por Partida
              </span>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-foreground" />
                <span className="text-blue-400 font-bold">{stats.goodPct}%</span>
                <span className="text-muted-foreground">Bem ({stats.goodWins})</span>
              </span>
              <Separator orientation="vertical" className="h-5" />
              <span className="flex items-center gap-1.5">
                <Skull className="h-4 w-4 text-foreground" />
                <span className="text-red-400 font-bold">{stats.evilPct}%</span>
                <span className="text-muted-foreground">Mal ({stats.evilWins})</span>
              </span>
            </div>
          </div>
        )}

        {script.victory_conditions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 max-w-2xl mx-auto pt-2">
            {script.victory_conditions.map((vc, i) => (
              <div key={i} className="text-center">
                <p className="text-sm font-medium">{vc}</p>
                <p className="text-xs text-muted-foreground">{victoryConditionCounts[vc] || 0} vezes</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

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
                    ? Object.entries(cStats.topPlayers).sort(([, a], [, b]) => b - a).slice(0, 3)
                    : [];
                  const winPct = cStats && cStats.played > 0 ? Math.round((cStats.wins / cStats.played) * 100) : 0;
                  const iconUrl = getCharIconUrl(char);
                  const isExpanded = expandedChars[char.id] || false;

                  return (
                    <Card key={char.id} className={`bg-card ${cardBorder} transition-colors`}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${isGood ? "bg-blue-950/60" : "bg-red-950/60"}`}>
                            <img
                              src={iconUrl}
                              alt={char.name}
                              className="h-10 w-10 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                            <span
                              className={`text-sm font-bold hidden items-center justify-center ${isGood ? "text-blue-400" : "text-red-400"}`}
                              style={{ display: "none" }}
                            >
                              {getInitials(char.name_en)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${isGood ? "text-blue-300" : "text-red-300"}`}>{char.name}</p>
                            <p className="text-xs text-muted-foreground">{char.name_en}</p>
                          </div>
                          {/* Stats in top-right */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-foreground">
                              {cStats ? `${cStats.played}x` : "0x"}
                            </span>
                            {cStats && cStats.played > 0 && (
                              <span className={`text-xs font-semibold ${winPct <= 20 ? 'text-red-400' : winPct <= 50 ? 'text-yellow-400' : 'text-green-400'}`}>{winPct}%</span>
                            )}
                          </div>
                        </div>
                        {char.description && (
                          <p className="text-xs text-muted-foreground italic leading-relaxed">{char.description}</p>
                        )}
                        {/* Collapsible Top Players */}
                        {topPlayers.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleCharExpanded(char.id)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
                            >
                              <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              Mais Jogado Por
                            </button>
                            {isExpanded && (
                              <div className="space-y-1 mt-1.5">
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
                        <span className="text-sm text-muted-foreground">{new Date(m.played_at).toLocaleDateString("pt-BR")}</span>
                        {m.duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration_minutes}min</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Narrador: <span className="text-foreground">{profiles[m.storyteller_player_id] || "?"}</span></span>
                        <span>· {mPlayers.length} jogadores</span>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditMatch(m)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Script Dialog */}
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
              <Label>URL da Imagem do Header</Label>
              <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.png" />
              <p className="text-xs text-muted-foreground">Imagem centralizada no topo da página do script</p>
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

      {/* Edit Match Dialog */}
      <Dialog open={editMatchOpen} onOpenChange={setEditMatchOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Partida</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Time Vencedor</Label>
                <Select value={emWinningTeam} onValueChange={(v) => setEmWinningTeam(v as 'good' | 'evil')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">🛡️ Bem</SelectItem>
                    <SelectItem value="evil">💀 Mal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={emDuration} onChange={(e) => setEmDuration(e.target.value)} placeholder="90" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Narrador</Label>
              <Select value={emStoryteller} onValueChange={setEmStoryteller}>
                <SelectTrigger><SelectValue placeholder="Selecione o narrador" /></SelectTrigger>
                <SelectContent>
                  {allPlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nickname || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Evil players */}
            <div className="space-y-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2">
                <Skull className="h-4 w-4 text-red-400" />
                <Label className="text-red-400 font-semibold">Time Maligno</Label>
              </div>
              {emPlayers.filter(p => p.team === 'evil').map((ep, i) => {
                const idx = emPlayers.findIndex(p => p === ep);
                return (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                    <Select value={ep.player_id} onValueChange={v => { const u = [...emPlayers]; u[idx] = { ...u[idx], player_id: v }; setEmPlayers(u); }}>
                      <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                      <SelectContent>
                        {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.nickname || p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={ep.character_id} onValueChange={v => { const u = [...emPlayers]; u[idx] = { ...u[idx], character_id: v }; setEmPlayers(u); }}>
                      <SelectTrigger><SelectValue placeholder="Personagem" /></SelectTrigger>
                      <SelectContent>
                        {evilChars.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.role_type})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => setEmPlayers(emPlayers.filter((_, j) => j !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => setEmPlayers([...emPlayers, { player_id: '', character_id: '', team: 'evil' }])}>
                <Plus className="h-4 w-4 mr-1" /> Maligno
              </Button>
            </div>

            {/* Good players */}
            <div className="space-y-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <Label className="text-blue-400 font-semibold">Time Benigno</Label>
              </div>
              {emPlayers.filter(p => p.team === 'good').map((ep, i) => {
                const idx = emPlayers.findIndex(p => p === ep);
                return (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                    <Select value={ep.player_id} onValueChange={v => { const u = [...emPlayers]; u[idx] = { ...u[idx], player_id: v }; setEmPlayers(u); }}>
                      <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                      <SelectContent>
                        {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.nickname || p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={ep.character_id} onValueChange={v => { const u = [...emPlayers]; u[idx] = { ...u[idx], character_id: v }; setEmPlayers(u); }}>
                      <SelectTrigger><SelectValue placeholder="Personagem" /></SelectTrigger>
                      <SelectContent>
                        {goodChars.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.role_type})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => setEmPlayers(emPlayers.filter((_, j) => j !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => setEmPlayers([...emPlayers, { player_id: '', character_id: '', team: 'good' }])}>
                <Plus className="h-4 w-4 mr-1" /> Benigno
              </Button>
            </div>

            {/* Victory Conditions */}
            {script.victory_conditions.length > 0 && (
              <div className="space-y-2 p-3 rounded-lg border border-gold/20 bg-gold/5">
                <Label className="text-gold">Condições de Vitória Especiais</Label>
                <div className="space-y-2">
                  {script.victory_conditions.map((vc: string, i: number) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={emVictoryConditions.includes(vc)}
                        onCheckedChange={(checked) => {
                          setEmVictoryConditions(prev =>
                            checked ? [...prev, vc] : prev.filter(v => v !== vc)
                          );
                        }}
                      />
                      <span className="text-sm">{vc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button variant="gold" onClick={handleMatchSave} disabled={emSaving} className="w-full">
              {emSaving ? 'Salvando...' : 'Salvar Partida'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptDetail;
