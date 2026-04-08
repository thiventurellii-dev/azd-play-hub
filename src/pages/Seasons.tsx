import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronRight, Gamepad2, Trophy, Plus, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { useSeasonsData, type SeasonItem } from "@/hooks/useSeasonsData";
import { useQueryClient } from "@tanstack/react-query";

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-muted text-muted-foreground border-border",
};
const statusLabels: Record<string, string> = { active: "Ativa", upcoming: "Em breve", finished: "Finalizada" };
const formatDate = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

const Seasons = () => {
  const { isAdmin } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSeasonsData();

  const seasons = data?.seasons || [];
  const seasonGames = data?.seasonGames || {};
  const seasonScripts = data?.seasonScripts || {};

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formType, setFormType] = useState<'boardgame' | 'blood'>('boardgame');
  const [formGameId, setFormGameId] = useState('');
  const [formScriptId, setFormScriptId] = useState('');
  const [allGames, setAllGames] = useState<{ id: string; name: string }[]>([]);
  const [allScripts, setAllScripts] = useState<{ id: string; name: string }[]>([]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["seasons-page-data"] });

  useEffect(() => {
    supabase.from('games').select('id, name').order('name').then(({ data }) => setAllGames(data || []));
    supabase.from('blood_scripts').select('id, name').order('name').then(({ data }) => setAllScripts((data || []) as any[]));
  }, []);

  const openCreate = () => { setEditId(null); setFormName(''); setFormDesc(''); setFormStart(''); setFormEnd(''); setFormType('boardgame'); setFormGameId(''); setFormScriptId(''); setDialogOpen(true); };
  const openEdit = async (s: SeasonItem) => {
    setEditId(s.id); setFormName(s.name); setFormDesc(s.description || ''); setFormStart(s.start_date); setFormEnd(s.end_date); setFormType(s.type);
    const { data: sg } = await supabase.from('season_games').select('game_id').eq('season_id', s.id).limit(1);
    setFormGameId(sg?.[0]?.game_id || '');
    const { data: sbs } = await supabase.from('season_blood_scripts').select('script_id').eq('season_id', s.id).limit(1);
    setFormScriptId((sbs as any)?.[0]?.script_id || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formStart || !formEnd) return notify('error', 'Preencha nome e datas');
    let seasonId = editId;
    if (editId) {
      const { error } = await supabase.from('seasons').update({ name: formName, description: formDesc || null, start_date: formStart, end_date: formEnd, type: formType as any }).eq('id', editId);
      if (error) return notify('error', error.message);
      notify('success', 'Season atualizada!');
    } else {
      const { data, error } = await supabase.from('seasons').insert({ name: formName, description: formDesc || null, start_date: formStart, end_date: formEnd, type: formType as any }).select().single();
      if (error) return notify('error', error.message);
      seasonId = data.id;
      notify('success', 'Season criada!');
    }
    if (seasonId && formType === 'boardgame' && formGameId) {
      await supabase.from('season_games').delete().eq('season_id', seasonId);
      await supabase.from('season_games').insert({ season_id: seasonId, game_id: formGameId });
    }
    if (seasonId && formType === 'blood' && formScriptId) {
      await supabase.from('season_blood_scripts').delete().eq('season_id', seasonId);
      await supabase.from('season_blood_scripts').insert({ season_id: seasonId, script_id: formScriptId } as any);
    }
    setDialogOpen(false);
    invalidate();
  };

  const boardgameSeasons = seasons.filter(s => s.type === "boardgame");
  const bloodSeasons = seasons.filter(s => s.type === "blood");

  const renderPrize = (s: SeasonItem) => {
    const isBlood = s.type === "blood";
    if (isBlood) {
      const total = s.prize_1st * 3 + s.prize_4th_6th * 3 + s.prize_7th_10th * 3;
      if (total <= 0) return null;
      return (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-gold"><Trophy className="h-3.5 w-3.5 flex-shrink-0" /><span className="font-semibold">R$ {total} em premiação</span></div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {s.prize_1st > 0 && <span>🥇 1º-3º R$ {s.prize_1st} cada</span>}
            {s.prize_4th_6th > 0 && <span>🥈 4º-6º R$ {s.prize_4th_6th} cada</span>}
            {s.prize_7th_10th > 0 && <span>🥉 7º-10º R$ {s.prize_7th_10th} cada</span>}
          </div>
        </div>
      );
    }
    const total = s.prize_1st + s.prize_2nd + s.prize_3rd;
    if (total <= 0) return null;
    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-gold"><Trophy className="h-3.5 w-3.5 flex-shrink-0" /><span className="font-semibold">R$ {total} em premiação</span></div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {s.prize_1st > 0 && <span>🥇 R$ {s.prize_1st}</span>}
          {s.prize_2nd > 0 && <span>🥈 R$ {s.prize_2nd}</span>}
          {s.prize_3rd > 0 && <span>🥉 R$ {s.prize_3rd}</span>}
        </div>
      </div>
    );
  };

  const renderSeasonCard = (s: SeasonItem, i: number) => {
    const games = seasonGames[s.id] || [];
    const scripts = seasonScripts[s.id] || [];
    return (
      <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
        <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full flex flex-col relative group">
          <Link to={`/seasons/${s.id}`} className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{s.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-3">
              <div>
                {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
                {s.type === "boardgame" && games.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2"><Gamepad2 className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{games.join(", ")}</span></div>
                )}
                {s.type === "blood" && scripts.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2"><span className="flex-shrink-0">🩸</span><span className="truncate">{scripts.join(", ")}</span></div>
                )}
                {renderPrize(s)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /><span>{formatDate(s.start_date)} — {formatDate(s.end_date)}</span>
              </div>
            </CardContent>
          </Link>
          {isAdmin && (
            <Button variant="ghost" size="icon" className="absolute bottom-3 right-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(s); }}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </Card>
      </motion.div>
    );
  };

  const renderSeasonList = (list: SeasonItem[]) =>
    list.length === 0 ? (
      <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma season criada ainda.</CardContent></Card>
    ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{list.map((s, i) => renderSeasonCard(s, i))}</div>
    );

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-bold">Seasons</h1>
        {isAdmin && (
          <Button variant="gold" size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Criar Season</Button>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Temporadas de competição da comunidade</p>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>
      ) : (
        <Tabs defaultValue="boardgame" className="space-y-6">
          <TabsList>
            <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
            <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
          </TabsList>
          <TabsContent value="boardgame">{renderSeasonList(boardgameSeasons)}</TabsContent>
          <TabsContent value="blood">{renderSeasonList(bloodSeasons)}</TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Editar Season' : 'Criar Season'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={v => { setFormType(v as any); if (v !== 'boardgame') setFormGameId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boardgame">Boardgame</SelectItem>
                  <SelectItem value="blood">Blood on the Clocktower</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formType === 'boardgame' && (
              <div className="space-y-2">
                <Label>Jogo</Label>
                <Select value={formGameId} onValueChange={setFormGameId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o jogo" /></SelectTrigger>
                  <SelectContent>
                    {allGames.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formType === 'blood' && (
              <div className="space-y-2">
                <Label>Script</Label>
                <Select value={formScriptId} onValueChange={setFormScriptId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o script" /></SelectTrigger>
                  <SelectContent>
                    {allScripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2"><Label>Início *</Label><div className="relative"><Input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} className="pr-10" /><CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" /></div></div>
              <div className="space-y-2"><Label>Fim *</Label><div className="relative"><Input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="pr-10" /><CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" /></div></div>
            </div>
            <Button variant="gold" onClick={handleSave}>{editId ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Seasons;
