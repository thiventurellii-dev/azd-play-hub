import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Sword, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { useQueryClient } from "@tanstack/react-query";
import BoardgameCard from "@/components/games/BoardgameCard";
import GamesSummaryPanel from "@/components/games/GamesSummaryPanel";
import BloodScriptCard from "@/components/games/BloodScriptCard";
import RpgSystemCard from "@/components/games/RpgSystemCard";
import RpgAdventureCard from "@/components/games/RpgAdventureCard";
import RpgSystemForm from "@/components/forms/RpgSystemForm";
import RpgAdventureForm from "@/components/forms/RpgAdventureForm";
import { useGamesData } from "@/hooks/useGamesData";

const Games = () => {
  const { user, isAdmin } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGamesData();

  const games = data?.games || [];
  const gameSeasons = data?.gameSeasons || {};
  const avgDurations = data?.avgDurations || {};
  const matchCounts = data?.matchCounts || {};
  const totalPlaytime = data?.totalPlaytime || 0;
  const activeSeasonGameIds = data?.activeSeasonGameIds || new Set<string>();
  const bloodScripts = data?.bloodScripts || [];
  const bloodCharacters = data?.bloodCharacters || [];
  const scriptSeasons = data?.scriptSeasons || {};
  const rpgSystems = data?.rpgSystems || [];
  const rpgAdventures = data?.rpgAdventures || [];
  const allTags = data?.allTags || [];
  const gameTagMap = data?.gameTagMap || {};

  const [tagFilter, setTagFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMinP, setNewMinP] = useState("");
  const [newMaxP, setNewMaxP] = useState("");
  const [addScriptOpen, setAddScriptOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptDesc, setNewScriptDesc] = useState("");
  const [newScriptImageUrl, setNewScriptImageUrl] = useState("");
  const [newScriptSlug, setNewScriptSlug] = useState("");
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [addAdventureOpen, setAddAdventureOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["games-page-data"] });

  const filteredGames = useMemo(() => {
    if (tagFilter === "all") return games;
    return games.filter((g: any) => (gameTagMap[g.id] || []).includes(tagFilter));
  }, [games, tagFilter, gameTagMap]);

  // Blood KPIs
  const activeScriptsCount = useMemo(
    () => bloodScripts.filter((s: any) => (scriptSeasons[s.id] || []).some((l) => l.status === "active")).length,
    [bloodScripts, scriptSeasons]
  );

  // RPG KPIs
  const activeSystemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const adv of rpgAdventures) {
      // adventures with active linked content could be flagged later; for now: systems with any adventure
      if (adv.system_id) ids.add(adv.system_id);
    }
    return ids;
  }, [rpgAdventures]);

  const handleAddGame = async () => {
    if (!newName.trim()) return notify("error", "Nome obrigatório");
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("games").insert({
      name: newName, slug, min_players: parseInt(newMinP) || null, max_players: parseInt(newMaxP) || null,
    });
    if (error) return notify("error", error.message);
    notify("success", "Jogo adicionado!");
    setAddOpen(false); setNewName(""); setNewMinP(""); setNewMaxP("");
    invalidate();
  };

  const handleAddScript = async () => {
    if (!newScriptName.trim()) return notify("error", "Nome obrigatório");
    const slug = newScriptSlug.trim() || newScriptName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("blood_scripts").insert({
      name: newScriptName, description: newScriptDesc || null,
      image_url: newScriptImageUrl || null, slug,
    } as any);
    if (error) return notify("error", error.message);
    notify("success", "Script adicionado!");
    setAddScriptOpen(false);
    setNewScriptName(""); setNewScriptDesc(""); setNewScriptImageUrl(""); setNewScriptSlug("");
    invalidate();
  };

  return (
    <div className="container py-10">
      <div className="mb-2"><h1 className="text-2xl md:text-3xl font-bold">Jogos</h1></div>
      <p className="text-muted-foreground mb-8">Coleção de jogos da comunidade AzD</p>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>
      ) : (
        <Tabs defaultValue="boardgame" className="space-y-6">
          <div className="flex justify-center">
            <TabsList>
              <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
              <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
              <TabsTrigger value="rpg">⚔️ RPG</TabsTrigger>
            </TabsList>
          </div>

          {/* Boardgames */}
          <TabsContent value="boardgame">
            <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filtrar por tag" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as tags</SelectItem>
                      {allTags.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {user && (
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Jogo
                  </Button>
                )}
              </div>
              <GamesSummaryPanel
                totalGames={games.length}
                activeCount={activeSeasonGameIds.size}
                totalMatches={Object.values(matchCounts).reduce((a: number, b: number) => a + b, 0)}
                totalPlaytimeMin={totalPlaytime}
                totalLabel="jogos"
                activeTooltip="Jogos com Season ou Torneio ativo no momento."
              />
            </div>
            {filteredGames.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum jogo encontrado.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredGames.map((g: any, i: number) => (
                  <BoardgameCard
                    key={g.id}
                    game={g}
                    seasons={gameSeasons[g.id] || []}
                    avgDuration={avgDurations[g.id]}
                    matchCount={matchCounts[g.id] || 0}
                    hasActiveSeason={activeSeasonGameIds.has(g.id)}
                    tags={gameTagMap[g.id] || []}
                    index={i}
                    onUpdated={invalidate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Blood Scripts */}
          <TabsContent value="blood">
            <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setAddScriptOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Script
                  </Button>
                )}
              </div>
              <GamesSummaryPanel
                totalGames={bloodScripts.length}
                activeCount={activeScriptsCount}
                totalMatches={bloodCharacters.length}
                totalPlaytimeMin={0}
                totalLabel="scripts"
                activeTooltip="Scripts com Season ou Torneio ativo no momento."
              />
            </div>
            {bloodScripts.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum script cadastrado.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bloodScripts.map((s: any, i: number) => (
                  <BloodScriptCard
                    key={s.id}
                    script={s}
                    characters={bloodCharacters.filter((c: any) => c.script_id === s.id)}
                    seasons={scriptSeasons[s.id] || []}
                    index={i}
                    onUpdated={invalidate}
                  />
                ))}
              </div>
            )}
            <Dialog open={addScriptOpen} onOpenChange={setAddScriptOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Script</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome *</Label><Input value={newScriptName} onChange={(e) => setNewScriptName(e.target.value)} /></div>
                  <div><Label>Descrição</Label><Input value={newScriptDesc} onChange={(e) => setNewScriptDesc(e.target.value)} /></div>
                  <div><Label>URL da Imagem</Label><Input value={newScriptImageUrl} onChange={(e) => setNewScriptImageUrl(e.target.value)} /></div>
                  <div><Label>Slug</Label><Input value={newScriptSlug} onChange={(e) => setNewScriptSlug(e.target.value)} placeholder="ex: trouble-brewing" /></div>
                  <Button variant="gold" className="w-full" onClick={handleAddScript}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* RPG */}
          <TabsContent value="rpg">
            <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setAddSystemOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Sistema
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAddAdventureOpen(true)} disabled={rpgSystems.length === 0}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Aventura
                    </Button>
                  </>
                )}
              </div>
              <GamesSummaryPanel
                totalGames={rpgSystems.length}
                activeCount={activeSystemIds.size}
                totalMatches={rpgAdventures.length}
                totalPlaytimeMin={0}
                totalLabel="sistemas"
                activeTooltip="Sistemas com Aventura, Season ou Torneio ativo."
              />
            </div>

            {rpgSystems.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Sword className="h-12 w-12 mx-auto mb-4 text-purple-400 opacity-50" />
                  <p>Nenhum sistema de RPG cadastrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold mb-4">Sistemas</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {rpgSystems.map((sys: any, i: number) => {
                      const adventuresCount = rpgAdventures.filter((a: any) => a.system_id === sys.id).length;
                      return (
                        <RpgSystemCard key={sys.id} system={sys} adventuresCount={adventuresCount} index={i} onUpdated={invalidate} />
                      );
                    })}
                  </div>
                </div>

                {rpgAdventures.length > 0 && (
                  <div>
                    <Separator className="bg-gradient-to-r from-transparent via-purple-500/30 to-transparent mb-6" />
                    <h2 className="text-lg font-bold mb-4">Aventuras</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {rpgAdventures.map((adv: any, i: number) => {
                        const system = rpgSystems.find((s: any) => s.id === adv.system_id);
                        return (
                          <RpgAdventureCard key={adv.id} adventure={adv} system={system} systems={rpgSystems} index={i} onUpdated={invalidate} />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Dialog open={addSystemOpen} onOpenChange={setAddSystemOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Sistema de RPG</DialogTitle></DialogHeader>
                <RpgSystemForm onSuccess={() => { setAddSystemOpen(false); invalidate(); }} />
              </DialogContent>
            </Dialog>
            <Dialog open={addAdventureOpen} onOpenChange={setAddAdventureOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Aventura</DialogTitle></DialogHeader>
                <RpgAdventureForm systems={rpgSystems} onSuccess={() => { setAddAdventureOpen(false); invalidate(); }} />
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Game Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Jogo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do jogo" /></div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2"><Label>Mín. Jogadores</Label><Input type="number" value={newMinP} onChange={(e) => setNewMinP(e.target.value)} /></div>
              <div className="space-y-2"><Label>Máx. Jogadores</Label><Input type="number" value={newMaxP} onChange={(e) => setNewMaxP(e.target.value)} /></div>
            </div>
            <Button variant="gold" onClick={handleAddGame}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Games;
