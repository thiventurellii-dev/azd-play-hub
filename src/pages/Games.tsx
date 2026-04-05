import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Video, Users, Calendar, Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import troubleBrewingImg from "@/assets/trouble-brewing.jpg";
import badMoonRisingImg from "@/assets/bad-moon-rising.jpg";
import overTheRiverImg from "@/assets/over-the-river.png";

interface Game {
  id: string; name: string; image_url: string | null; rules_url: string | null;
  video_url: string | null; min_players: number | null; max_players: number | null;
  slug: string | null; factions: any;
}

interface SeasonLink { season_id: string; season_name: string; status: string; }
interface BloodScript { id: string; name: string; description: string | null; }
interface BloodCharacter { id: string; script_id: string; name: string; name_en: string; team: "good" | "evil"; role_type: string; }
interface GameTag { id: string; name: string; }

interface ScoringSubcategory { key: string; label: string; type: string; }
interface ScoringCategory { key: string; label: string; type: string; subcategories?: ScoringSubcategory[]; }

const statusLabels: Record<string, string> = { active: "Ativa", upcoming: "Em breve", finished: "Finalizada" };
const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-muted text-muted-foreground border-border",
};

const generateKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

const Games = () => {
  const { user, isAdmin } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [games, setGames] = useState<Game[]>([]);
  const [gameSeasons, setGameSeasons] = useState<Record<string, SeasonLink[]>>({});
  const [avgDurations, setAvgDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [bloodScripts, setBloodScripts] = useState<BloodScript[]>([]);
  const [bloodCharacters, setBloodCharacters] = useState<BloodCharacter[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [scriptSeasons, setScriptSeasons] = useState<Record<string, SeasonLink[]>>({});

  // Tags
  const [allTags, setAllTags] = useState<GameTag[]>([]);
  const [gameTagMap, setGameTagMap] = useState<Record<string, string[]>>({});
  const [gameTagIdMap, setGameTagIdMap] = useState<Record<string, string[]>>({}); // game_id -> tag_id[]
  const [tagFilter, setTagFilter] = useState('all');

  // Add game dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMinP, setNewMinP] = useState('');
  const [newMaxP, setNewMaxP] = useState('');

  // Edit game dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [editName, setEditName] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editRulesUrl, setEditRulesUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editMinP, setEditMinP] = useState('');
  const [editMaxP, setEditMaxP] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editFactions, setEditFactions] = useState('');
  const [editCategories, setEditCategories] = useState<ScoringCategory[]>([]);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');

  const fetchData = async () => {
    const [gamesRes, sgRes, matchesRes, scriptsRes, charsRes, sbsRes, tagsRes, tagLinksRes] = await Promise.all([
      supabase.from("games").select("*").order("name"),
      supabase.from("season_games").select("game_id, season_id"),
      supabase.from("matches").select("game_id, duration_minutes"),
      supabase.from("blood_scripts").select("*").order("name"),
      supabase.from("blood_characters").select("*").order("team, role_type, name"),
      supabase.from("season_blood_scripts").select("season_id, script_id"),
      supabase.from("game_tags").select("*").order("name"),
      supabase.from("game_tag_links").select("game_id, tag_id"),
    ]);

    const gamesData = (gamesRes.data || []) as Game[];
    setGames(gamesData);
    setBloodScripts((scriptsRes.data || []) as BloodScript[]);
    setBloodCharacters((charsRes.data || []) as BloodCharacter[]);
    setAllTags((tagsRes.data || []) as GameTag[]);

    // Build tag maps
    const tMap: Record<string, string[]> = {};
    const tIdMap: Record<string, string[]> = {};
    const tagNameMap: Record<string, string> = {};
    for (const t of (tagsRes.data || []) as GameTag[]) tagNameMap[t.id] = t.name;
    for (const tl of (tagLinksRes.data || []) as any[]) {
      if (!tMap[tl.game_id]) tMap[tl.game_id] = [];
      if (!tIdMap[tl.game_id]) tIdMap[tl.game_id] = [];
      const name = tagNameMap[tl.tag_id];
      if (name) tMap[tl.game_id].push(name);
      tIdMap[tl.game_id].push(tl.tag_id);
    }
    setGameTagMap(tMap);
    setGameTagIdMap(tIdMap);

    // Seasons
    const sgData = sgRes.data || [];
    if (sgData.length > 0) {
      const seasonIds = [...new Set(sgData.map((sg) => sg.season_id))];
      const { data: seasons } = await supabase.from("seasons").select("id, name, status").in("id", seasonIds);
      const seasonMap: Record<string, { name: string; status: string }> = {};
      for (const s of seasons || []) seasonMap[s.id] = { name: s.name, status: s.status };
      const map: Record<string, SeasonLink[]> = {};
      for (const sg of sgData) {
        const s = seasonMap[sg.season_id];
        if (!s) continue;
        if (!map[sg.game_id]) map[sg.game_id] = [];
        map[sg.game_id].push({ season_id: sg.season_id, season_name: s.name, status: s.status });
      }
      setGameSeasons(map);
    }

    const sbsData = (sbsRes.data || []) as any[];
    if (sbsData.length > 0) {
      const bsSeasonIds = [...new Set(sbsData.map((s: any) => s.season_id))];
      const { data: bsSeasons } = await supabase.from("seasons").select("id, name, status").in("id", bsSeasonIds);
      const bsSeasonMap: Record<string, { name: string; status: string }> = {};
      for (const s of bsSeasons || []) bsSeasonMap[s.id] = { name: s.name, status: s.status };
      const bsMap: Record<string, SeasonLink[]> = {};
      for (const sbs of sbsData) {
        const s = bsSeasonMap[sbs.season_id];
        if (!s) continue;
        if (!bsMap[sbs.script_id]) bsMap[sbs.script_id] = [];
        bsMap[sbs.script_id].push({ season_id: sbs.season_id, season_name: s.name, status: s.status });
      }
      setScriptSeasons(bsMap);
    }

    const matchesData = matchesRes.data || [];
    const durMap: Record<string, { total: number; count: number }> = {};
    for (const m of matchesData) {
      if (m.duration_minutes) {
        if (!durMap[m.game_id]) durMap[m.game_id] = { total: 0, count: 0 };
        durMap[m.game_id].total += m.duration_minutes;
        durMap[m.game_id].count += 1;
      }
    }
    const avgMap: Record<string, number> = {};
    for (const [gid, d] of Object.entries(durMap)) avgMap[gid] = Math.round(d.total / d.count);
    setAvgDurations(avgMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const scriptImages: Record<string, string> = {
    "trouble brewing": troubleBrewingImg,
    "bad moon rising": badMoonRisingImg,
    "over the river": overTheRiverImg,
  };
  const getScriptImage = (name: string) => scriptImages[name.toLowerCase()] || null;
  const roleTypeLabels: Record<string, string> = { townsfolk: "Cidadão", outsider: "Forasteiro", minion: "Lacaio", demon: "Demônio" };

  const filteredGames = useMemo(() => {
    if (tagFilter === 'all') return games;
    return games.filter(g => (gameTagMap[g.id] || []).includes(tagFilter));
  }, [games, tagFilter, gameTagMap]);

  const handleAddGame = async () => {
    if (!newName.trim()) return notify('error', 'Nome obrigatório');
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { error } = await supabase.from('games').insert({
      name: newName, slug, min_players: parseInt(newMinP) || null, max_players: parseInt(newMaxP) || null,
    });
    if (error) return notify('error', error.message);
    notify('success', 'Jogo adicionado!');
    setAddOpen(false); setNewName(''); setNewMinP(''); setNewMaxP('');
    fetchData();
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Jogo excluído!');
    fetchData();
  };

  const openEditGame = async (g: Game) => {
    setEditGame(g);
    setEditName(g.name);
    setEditImageUrl(g.image_url || '');
    setEditRulesUrl(g.rules_url || '');
    setEditVideoUrl(g.video_url || '');
    setEditMinP(g.min_players?.toString() || '');
    setEditMaxP(g.max_players?.toString() || '');
    setEditSlug(g.slug || '');
    setEditFactions(g.factions ? JSON.stringify(g.factions, null, 2) : '');
    setEditTagIds(gameTagIdMap[g.id] || []);

    // Load scoring schema
    const { data: schemaData } = await supabase.from('game_scoring_schemas').select('schema').eq('game_id', g.id).maybeSingle();
    setEditCategories((schemaData?.schema as any)?.categories || []);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editGame) return;
    let factions = null;
    if (editFactions.trim()) {
      try { factions = JSON.parse(editFactions); } catch { return notify('error', 'JSON de facções inválido'); }
    }
    const { error } = await supabase.from('games').update({
      name: editName, image_url: editImageUrl || null, rules_url: editRulesUrl || null,
      video_url: editVideoUrl || null, min_players: parseInt(editMinP) || null,
      max_players: parseInt(editMaxP) || null, slug: editSlug || null, factions,
    }).eq('id', editGame.id);
    if (error) return notify('error', error.message);

    // Save scoring schema
    const schemaPayload = { categories: editCategories };
    const { data: existing } = await supabase.from('game_scoring_schemas').select('id').eq('game_id', editGame.id).maybeSingle();
    if (existing) {
      await supabase.from('game_scoring_schemas').update({ schema: schemaPayload as any }).eq('id', existing.id);
    } else if (editCategories.length > 0) {
      await supabase.from('game_scoring_schemas').insert({ game_id: editGame.id, schema: schemaPayload as any });
    }

    // Save tags
    await supabase.from('game_tag_links').delete().eq('game_id', editGame.id);
    if (editTagIds.length > 0) {
      await supabase.from('game_tag_links').insert(editTagIds.map(tid => ({ game_id: editGame.id, tag_id: tid })));
    }

    notify('success', 'Jogo atualizado!');
    setEditOpen(false);
    fetchData();
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const { data, error } = await supabase.from('game_tags').insert({ name: newTagName.trim() }).select().single();
    if (error) return notify('error', error.message);
    setAllTags(prev => [...prev, data as GameTag].sort((a, b) => a.name.localeCompare(b.name)));
    setEditTagIds(prev => [...prev, data.id]);
    setNewTagName('');
  };

  const addCategory = () => setEditCategories([...editCategories, { key: '', label: '', type: 'number' }]);
  const removeCategory = (i: number) => setEditCategories(editCategories.filter((_, idx) => idx !== i));
  const updateCategory = (i: number, label: string) => {
    const cats = [...editCategories];
    cats[i] = { ...cats[i], label, key: generateKey(label) };
    setEditCategories(cats);
  };
  const addSubcategory = (catIdx: number) => {
    const cats = [...editCategories];
    const sub = cats[catIdx].subcategories || [];
    cats[catIdx] = { ...cats[catIdx], type: 'group', subcategories: [...sub, { key: '', label: '', type: 'number' }] };
    setEditCategories(cats);
  };
  const removeSubcategory = (catIdx: number, subIdx: number) => {
    const cats = [...editCategories];
    cats[catIdx].subcategories = cats[catIdx].subcategories?.filter((_, i) => i !== subIdx);
    setEditCategories(cats);
  };
  const updateSubcategory = (catIdx: number, subIdx: number, label: string) => {
    const cats = [...editCategories];
    if (cats[catIdx].subcategories) {
      cats[catIdx].subcategories![subIdx] = { ...cats[catIdx].subcategories![subIdx], label, key: generateKey(label) };
    }
    setEditCategories(cats);
  };

  const renderBoardgames = () => (
    <>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filtrar por tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {allTags.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
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
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">Nenhum jogo encontrado.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredGames.map((g, i) => {
            const seasons = gameSeasons[g.id] || [];
            const avgDur = avgDurations[g.id];
            const gameTags = gameTagMap[g.id] || [];
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full flex flex-col relative group">
                  <CardContent className="py-5 space-y-4 flex-1 flex flex-col cursor-pointer"
                    onClick={() => g.slug ? navigate(`/jogos/${g.slug}`) : setSelectedGame(g)}>
                    <div className="flex items-start gap-4">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold text-2xl flex-shrink-0">{g.name.charAt(0)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold">{g.name}</h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {(g.min_players || g.max_players) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" /> {g.min_players || "?"}–{g.max_players || "?"}</p>
                          )}
                          {avgDur && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" /> ~{avgDur} min</p>
                          )}
                        </div>
                        {gameTags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {gameTags.map(t => <Badge key={t} variant="outline" className="text-[10px] py-0">{t}</Badge>)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1" />
                    {seasons.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" /> Seasons</p>
                        <div className="flex gap-2 flex-wrap">
                          {seasons.map(s => <Badge key={s.season_id} className={`${statusColors[s.status] || "bg-muted text-muted-foreground border-border"} text-xs`}>{s.season_name}</Badge>)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  {isAdmin && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditGame(g); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDeleteGame(g.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );

  const renderBloodScripts = () =>
    bloodScripts.length === 0 ? (
      <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum script cadastrado.</CardContent></Card>
    ) : (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {bloodScripts.map((s, i) => {
          const chars = bloodCharacters.filter(c => c.script_id === s.id);
          const goodChars = chars.filter(c => c.team === "good");
          const evilChars = chars.filter(c => c.team === "evil");
          const isExpanded = expandedScript === s.id;
          const seasons = scriptSeasons[s.id] || [];
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer h-full flex flex-col"
                onClick={() => setExpandedScript(isExpanded ? null : s.id)}>
                <CardContent className="py-5 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-start gap-4">
                    {getScriptImage(s.name) ? (
                      <img src={getScriptImage(s.name)!} alt={s.name} className="h-20 w-20 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🩸</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold">{s.name}</h3>
                      {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {chars.length} personagens</span>
                        <span>👼 {goodChars.length}</span>
                        <span>😈 {evilChars.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1" />
                  {seasons.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" /> Seasons</p>
                      <div className="flex gap-2 flex-wrap">
                        {seasons.map(ss => <Badge key={ss.season_id} className={`${statusColors[ss.status] || ""} text-xs`}>{ss.season_name}</Badge>)}
                      </div>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="border-t border-border pt-3 space-y-2">
                      {goodChars.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">👼 Bem</p>
                          <div className="flex flex-wrap gap-1">
                            {goodChars.map(c => <Badge key={c.id} variant="outline" className="text-xs">{c.name} <span className="text-muted-foreground ml-1">({roleTypeLabels[c.role_type]})</span></Badge>)}
                          </div>
                        </div>
                      )}
                      {evilChars.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">😈 Mal</p>
                          <div className="flex flex-wrap gap-1">
                            {evilChars.map(c => <Badge key={c.id} variant="outline" className="text-xs border-destructive/30">{c.name} <span className="text-muted-foreground ml-1">({roleTypeLabels[c.role_type]})</span></Badge>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );

  return (
    <div className="container py-10">
      <div className="mb-2"><h1 className="text-3xl font-bold">Jogos</h1></div>
      <p className="text-muted-foreground mb-8">Coleção de jogos da comunidade AzD</p>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>
      ) : (
        <Tabs defaultValue="boardgame" className="space-y-6">
          <TabsList>
            <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
            <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
          </TabsList>
          <TabsContent value="boardgame">{renderBoardgames()}</TabsContent>
          <TabsContent value="blood">{renderBloodScripts()}</TabsContent>
        </Tabs>
      )}

      {/* Detail Dialog (for games without slug) */}
      <Dialog open={!!selectedGame} onOpenChange={(open) => !open && setSelectedGame(null)}>
        {selectedGame && (
          <DialogContent>
            <DialogHeader><DialogTitle>{selectedGame.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {selectedGame.image_url && <img src={selectedGame.image_url} alt={selectedGame.name} className="w-full h-48 object-cover rounded-lg" />}
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                {(selectedGame.min_players || selectedGame.max_players) && (
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {selectedGame.min_players || "?"}–{selectedGame.max_players || "?"} jogadores</span>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                {selectedGame.rules_url && (
                  <a href={selectedGame.rules_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1.5 px-3"><ExternalLink className="h-3.5 w-3.5" /> Regras</Badge>
                  </a>
                )}
                {selectedGame.video_url && (
                  <a href={selectedGame.video_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1.5 px-3"><Video className="h-3.5 w-3.5" /> Vídeo</Badge>
                  </a>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Game Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Jogo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do jogo" /></div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2"><Label>Mín. Jogadores</Label><Input type="number" value={newMinP} onChange={e => setNewMinP(e.target.value)} /></div>
              <div className="space-y-2"><Label>Máx. Jogadores</Label><Input type="number" value={newMaxP} onChange={e => setNewMaxP(e.target.value)} /></div>
            </div>
            <Button variant="gold" onClick={handleAddGame}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Game Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Jogo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Nome</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={editSlug} onChange={e => setEditSlug(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>URL da Imagem</Label><Input value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>URL das Regras</Label><Input value={editRulesUrl} onChange={e => setEditRulesUrl(e.target.value)} /></div>
              <div className="space-y-2"><Label>URL do Vídeo</Label><Input value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Mín. Jogadores</Label><Input type="number" value={editMinP} onChange={e => setEditMinP(e.target.value)} /></div>
              <div className="space-y-2"><Label>Máx. Jogadores</Label><Input type="number" value={editMaxP} onChange={e => setEditMaxP(e.target.value)} /></div>
            </div>

            {/* Factions JSON */}
            <div className="space-y-2">
              <Label>Facções (JSON)</Label>
              <Textarea value={editFactions} onChange={e => setEditFactions(e.target.value)} placeholder='["Facção A", "Facção B"]' rows={3} className="font-mono text-xs" />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(t => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={editTagIds.includes(t.id)} onCheckedChange={(checked) => {
                      setEditTagIds(prev => checked ? [...prev, t.id] : prev.filter(id => id !== t.id));
                    }} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nova tag..." className="flex-1 h-8" />
                <Button variant="outline" size="sm" onClick={handleAddTag} disabled={!newTagName.trim()}>
                  <Plus className="h-3 w-3 mr-1" /> Criar
                </Button>
              </div>
            </div>

            {/* Scoring Schema */}
            <div className="space-y-2">
              <Label>Schema de Pontuação</Label>
              {editCategories.map((cat, ci) => (
                <div key={ci} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={cat.label} onChange={e => updateCategory(ci, e.target.value)} placeholder="Nome da categoria" className="flex-1 h-8" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCategory(ci)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                  {(cat.subcategories || []).map((sub, si) => (
                    <div key={si} className="flex items-center gap-2 ml-4">
                      <Input value={sub.label} onChange={e => updateSubcategory(ci, si, e.target.value)} placeholder="Subcategoria" className="flex-1 h-7 text-xs" />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubcategory(ci, si)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-4 text-xs" onClick={() => addSubcategory(ci)}>
                    <Plus className="h-3 w-3 mr-1" /> Subcategoria
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCategory}>
                <Plus className="h-3 w-3 mr-1" /> Categoria
              </Button>
            </div>

            <Button variant="gold" onClick={handleEditSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Games;
