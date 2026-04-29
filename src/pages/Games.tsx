import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Video, Users, Plus, Sword } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { useQueryClient } from "@tanstack/react-query";
import BoardgameCard from "@/components/games/BoardgameCard";
import BloodScriptCard from "@/components/games/BloodScriptCard";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import RpgSystemForm from "@/components/forms/RpgSystemForm";
import RpgAdventureForm from "@/components/forms/RpgAdventureForm";
import { useGamesData } from "@/hooks/useGamesData";
import { Link } from "react-router-dom";
import { slugify } from "@/lib/slugify";

const Games = () => {
  const { user, isAdmin } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGamesData();

  const games = data?.games || [];
  const gameSeasons = data?.gameSeasons || {};
  const avgDurations = data?.avgDurations || {};
  const bloodScripts = data?.bloodScripts || [];
  const bloodCharacters = data?.bloodCharacters || [];
  const scriptSeasons = data?.scriptSeasons || {};
  const rpgSystems = data?.rpgSystems || [];
  const rpgAdventures = data?.rpgAdventures || [];
  const allTags = data?.allTags || [];
  const gameTagMap = data?.gameTagMap || {};

  const [tagFilter, setTagFilter] = useState("all");

  // Add dialogs
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
          <TabsList>
            <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
            <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
            <TabsTrigger value="rpg">⚔️ RPG</TabsTrigger>
          </TabsList>

          {/* Boardgames */}
          <TabsContent value="boardgame">
            <div className="flex flex-wrap gap-3 mb-4 items-center">
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
            {filteredGames.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum jogo encontrado.</CardContent></Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredGames.map((g: any, i: number) => (
                  <BoardgameCard key={g.id} game={g} seasons={gameSeasons[g.id] || []} avgDuration={avgDurations[g.id]} tags={gameTagMap[g.id] || []} index={i} onUpdated={invalidate} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Blood Scripts */}
          <TabsContent value="blood">
            {isAdmin && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setAddScriptOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Script
                </Button>
              </div>
            )}
            {bloodScripts.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum script cadastrado.</CardContent></Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {bloodScripts.map((s: any, i: number) => (
                  <BloodScriptCard key={s.id} script={s} characters={bloodCharacters.filter((c: any) => c.script_id === s.id)} seasons={scriptSeasons[s.id] || []} index={i} onUpdated={invalidate} />
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
            {isAdmin && (
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setAddSystemOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Sistema
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddAdventureOpen(true)} disabled={rpgSystems.length === 0}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Aventura
                </Button>
              </div>
            )}
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
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {rpgSystems.map((sys: any, i: number) => {
                      const adventures = rpgAdventures.filter((a: any) => a.system_id === sys.id);
                      return (
                        <motion.div key={sys.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <Card className="bg-card border-border hover:border-purple-500/20 transition-all flex flex-col relative group">
                            <CardContent className="py-5 space-y-3 flex-1 flex flex-col">
                              <div className="flex items-start gap-4">
                                {sys.image_url ? (
                                  <img src={sys.image_url} alt={sys.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                                ) : (
                                  <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🎭</div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold">{sys.name}</h3>
                                  {sys.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sys.description}</p>}
                                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {adventures.length} aventura(s)</span>
                                  </div>
                                </div>
                              </div>
                              {(sys.rules_url || sys.video_url) && (
                                <div className="flex gap-2 flex-wrap">
                                  {sys.rules_url && (
                                    <a href={sys.rules_url} target="_blank" rel="noopener noreferrer">
                                      <Badge variant="outline" className="cursor-pointer hover:border-purple-500/50 gap-1 py-0.5 px-2 text-[10px]"><ExternalLink className="h-3 w-3" /> Regras</Badge>
                                    </a>
                                  )}
                                  {sys.video_url && (
                                    <a href={sys.video_url} target="_blank" rel="noopener noreferrer">
                                      <Badge variant="outline" className="cursor-pointer hover:border-purple-500/50 gap-1 py-0.5 px-2 text-[10px]"><Video className="h-3 w-3" /> Vídeo</Badge>
                                    </a>
                                  )}
                                </div>
                              )}
                            </CardContent>
                            <div className="absolute top-3 right-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                              <EntityEditButton entityType="rpg" title="Editar Sistema">
                                {(onClose) => <RpgSystemForm system={sys} onSuccess={() => { onClose(); invalidate(); }} />}
                              </EntityEditButton>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {rpgAdventures.length > 0 && (
                  <div>
                    <Separator className="bg-gradient-to-r from-transparent via-purple-500/30 to-transparent mb-6" />
                    <h2 className="text-lg font-bold mb-4">Aventuras</h2>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {rpgAdventures.map((adv: any, i: number) => {
                        const system = rpgSystems.find((s: any) => s.id === adv.system_id);
                        const advSlug = adv.slug || slugify(adv.name) || adv.id;
                        return (
                          <motion.div key={adv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <Card className="bg-card border-border hover:border-gold/30 transition-colors relative group overflow-hidden">
                              <Link to={`/aventuras/${advSlug}`} className="block">
                                <CardContent className="py-4">
                                  <div className="flex items-start gap-3">
                                    {adv.image_url ? (
                                      <img src={adv.image_url} alt={adv.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">📜</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold group-hover:text-gold transition-colors">{adv.name}</p>
                                      {adv.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{adv.description}</p>}
                                      <div className="flex gap-2 mt-2 flex-wrap">
                                        {system && <Badge variant="outline" className="text-[10px] border-gold/30 text-gold/90">🎭 {system.name}</Badge>}
                                        <Badge variant="outline" className={`text-[10px] ${adv.tag === "homebrew" ? "border-orange-500/30 text-orange-400" : "border-emerald-500/30 text-emerald-400"}`}>
                                          {adv.tag === "homebrew" ? "🏠 Homebrew" : "📖 Oficial"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Link>
                              <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                                <EntityEditButton entityType="rpg" title="Editar Aventura">
                                  {(onClose) => <RpgAdventureForm adventure={adv} systems={rpgSystems} onSuccess={() => { onClose(); invalidate(); }} />}
                                </EntityEditButton>
                              </div>
                            </Card>
                          </motion.div>
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
