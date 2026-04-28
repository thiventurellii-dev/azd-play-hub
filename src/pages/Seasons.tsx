import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Info, ChevronDown, Trophy } from "lucide-react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { useSeasonsData, type SeasonItem } from "@/hooks/useSeasonsData";
import { useUserSeasonParticipation } from "@/hooks/useUserSeasonParticipation";
import { useQueryClient } from "@tanstack/react-query";
import { SeasonsTimeline } from "@/components/seasons/SeasonsTimeline";
import { SeasonCardLarge } from "@/components/seasons/SeasonCardLarge";
import { SeasonRowFinished } from "@/components/seasons/SeasonRowFinished";

const Seasons = () => {
  const { isAdmin } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSeasonsData();
  const { data: participatedIds } = useUserSeasonParticipation();

  const seasons = data?.seasons || [];
  const seasonGames = data?.seasonGames || {};
  const seasonScripts = data?.seasonScripts || {};

  const [closedOpen, setClosedOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCover, setFormCover] = useState('');
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

  const openCreate = () => {
    setEditId(null); setFormName(''); setFormDesc(''); setFormCover('');
    setFormStart(''); setFormEnd(''); setFormType('boardgame'); setFormGameId(''); setFormScriptId('');
    setDialogOpen(true);
  };
  const openEdit = async (s: SeasonItem) => {
    setEditId(s.id); setFormName(s.name); setFormDesc(s.description || ''); setFormCover(s.cover_url || '');
    setFormStart(s.start_date); setFormEnd(s.end_date); setFormType(s.type);
    const { data: sg } = await supabase.from('season_games').select('game_id').eq('season_id', s.id).limit(1);
    setFormGameId(sg?.[0]?.game_id || '');
    const { data: sbs } = await supabase.from('season_blood_scripts').select('script_id').eq('season_id', s.id).limit(1);
    setFormScriptId((sbs as any)?.[0]?.script_id || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formStart || !formEnd) return notify('error', 'Preencha nome e datas');
    const payload: any = {
      name: formName,
      description: formDesc || null,
      cover_url: formCover || null,
      start_date: formStart,
      end_date: formEnd,
      type: formType,
    };
    let seasonId = editId;
    if (editId) {
      const { error } = await supabase.from('seasons').update(payload).eq('id', editId);
      if (error) return notify('error', error.message);
      notify('success', 'Season atualizada!');
    } else {
      const { data, error } = await supabase.from('seasons').insert(payload).select().single();
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

  const participated = useMemo(() => participatedIds || new Set<string>(), [participatedIds]);

  const openSeasons = useMemo(() => seasons.filter(s => s.status !== "finished"), [seasons]);
  const finishedSeasons = useMemo(() => {
    return seasons.filter(s => s.status === "finished").sort((a, b) => b.end_date.localeCompare(a.end_date));
  }, [seasons]);

  const linkedNames = (s: SeasonItem) =>
    s.type === "blood" ? (seasonScripts[s.id] || []) : (seasonGames[s.id] || []);

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Seasons</h1>
            <p className="text-sm text-muted-foreground">Competições oficiais da comunidade</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={howOpen} onOpenChange={setHowOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Entenda como funciona">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Como funcionam as Seasons</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Cada Season é uma temporada oficial com início, fim e premiação. Você ganha MMR a cada partida ranqueada e disputa o pódio até a data final.</p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong className="text-foreground">Boardgame:</strong> ranking por MMR (ELO).</li>
                  <li><strong className="text-foreground">Blood on the Clocktower:</strong> ranking por pontos (vitórias do Mal valem 2, do Bem 1).</li>
                  <li>O critério de desempate é maior win rate, depois MMR.</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <Button variant="gold" size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Criar Season
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <>
        <div className="space-y-6">
          {/* Timeline */}
          <SeasonsTimeline seasons={seasons} participatedIds={participated} />

          {/* Active grid */}
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-lg font-semibold">Seasons em destaque</h2>
              <span className="text-sm text-muted-foreground">({openSeasons.length})</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Participe das temporadas em andamento e dispute o ranking!</p>
            {openSeasons.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma season aberta.</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {openSeasons.map((s, i) => (
                  <SeasonCardLarge
                    key={s.id}
                    season={s}
                    index={i}
                    linkedNames={linkedNames(s)}
                    isAdmin={isAdmin}
                    onEdit={() => openEdit(s)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Finished collapsible */}
          <Collapsible open={closedOpen} onOpenChange={setClosedOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:border-gold/30 transition-colors">
                <div className="text-left">
                  <p className="font-semibold">Seasons Encerradas</p>
                  <p className="text-xs text-muted-foreground">{finishedSeasons.length} temporadas anteriores · clique para {closedOpen ? "ocultar" : "ver"}</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${closedOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-3">
              {finishedSeasons.length === 0 ? (
                <Card className="bg-card border-border"><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhuma season encerrada ainda.</CardContent></Card>
              ) : (
                finishedSeasons.map((s) => (
                  <SeasonRowFinished key={s.id} season={s} linkedNames={linkedNames(s)} />
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
        </>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar Season' : 'Criar Season'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Imagem de capa (URL)</Label>
              <Input value={formCover} onChange={e => setFormCover(e.target.value)} placeholder="https://... (opcional — usa imagem do jogo se vazio)" />
            </div>
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
              <div className="space-y-2"><Label>Início *</Label><DatePickerField value={formStart} onChange={setFormStart} placeholder="Data de início" /></div>
              <div className="space-y-2"><Label>Fim *</Label><DatePickerField value={formEnd} onChange={setFormEnd} placeholder="Data de fim" /></div>
            </div>
            <Button variant="gold" onClick={handleSave} className="w-full">{editId ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Seasons;
