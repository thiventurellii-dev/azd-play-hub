import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Skull,
  TrendingUp,
  Flag,
  Sparkles,
  UserSquare2,
  Drama,
  Trophy,
  Handshake,
  HeartCrack,
  Eye,
  Compass,
  ShieldX,
  Scale,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  useReplaceSessionEvents,
  useSessionEvents,
} from '@/hooks/useRpgSessionEvents';
import type { RpgSessionEventType } from '@/types/rpg';

// ----------------------------- Theme por tipo de evento -----------------------------

type EventTheme = {
  label: string;
  Icon: typeof Skull;
  /** Cor da barra lateral / borda esquerda do card */
  bar: string;
  /** Classe do badge de tipo (texto + bg) */
  badge: string;
  /** Classe do chip "Tipos disponíveis" */
  chip: string;
};

const EVENT_THEME: Record<RpgSessionEventType, EventTheme> = {
  death: {
    label: 'Morte',
    Icon: Skull,
    bar: 'border-l-rose-500',
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    chip: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10',
  },
  level_up: {
    label: 'Level up',
    Icon: TrendingUp,
    bar: 'border-l-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    chip: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10',
  },
  milestone: {
    label: 'Marco',
    Icon: Flag,
    bar: 'border-l-violet-500',
    badge: 'bg-violet-500/15 text-violet-300 border border-violet-500/30',
    chip: 'border-violet-500/40 text-violet-300 hover:bg-violet-500/10',
  },
  legendary_item: {
    label: 'Item lendário',
    Icon: Sparkles,
    bar: 'border-l-amber-500',
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    chip: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10',
  },
  important_npc: {
    label: 'NPC importante',
    Icon: UserSquare2,
    bar: 'border-l-sky-500',
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    chip: 'border-sky-500/40 text-sky-300 hover:bg-sky-500/10',
  },
  betrayal: {
    label: 'Traição',
    Icon: Drama,
    bar: 'border-l-fuchsia-500',
    badge: 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30',
    chip: 'border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/10',
  },
  achievement: {
    label: 'Momento heróico',
    Icon: Trophy,
    bar: 'border-l-cyan-500',
    badge: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    chip: 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10',
  },
  alliance: {
    label: 'Aliança',
    Icon: Handshake,
    bar: 'border-l-teal-500',
    badge: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
    chip: 'border-teal-500/40 text-teal-300 hover:bg-teal-500/10',
  },
  rivalry: {
    label: 'Rivalidade',
    Icon: HeartCrack,
    bar: 'border-l-red-500',
    badge: 'bg-red-500/15 text-red-300 border border-red-500/30',
    chip: 'border-red-500/40 text-red-300 hover:bg-red-500/10',
  },
  revelation: {
    label: 'Revelação',
    Icon: Eye,
    bar: 'border-l-indigo-500',
    badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    chip: 'border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10',
  },
  discovery: {
    label: 'Descoberta',
    Icon: Compass,
    bar: 'border-l-lime-500',
    badge: 'bg-lime-500/15 text-lime-300 border border-lime-500/30',
    chip: 'border-lime-500/40 text-lime-300 hover:bg-lime-500/10',
  },
  defeat: {
    label: 'Derrota',
    Icon: ShieldX,
    bar: 'border-l-zinc-500',
    badge: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
    chip: 'border-zinc-500/40 text-zinc-300 hover:bg-zinc-500/10',
  },
  moral_dilemma: {
    label: 'Dilema moral',
    Icon: Scale,
    bar: 'border-l-orange-500',
    badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
    chip: 'border-orange-500/40 text-orange-300 hover:bg-orange-500/10',
  },
};

// ----------------------------- Tipos de props -----------------------------

interface PartyOption {
  character_id: string;
  name: string;
  player_id: string | null;
  portrait_url: string | null;
}

interface ConfirmedPlayer {
  player_id: string;
  name: string;
}

interface PlayerInfo extends ConfirmedPlayer {
  avatar_url: string | null;
  character_name: string | null;
}

interface EventDraft {
  _key: string;
  event_type: RpgSessionEventType;
  /** id do personagem da party (quando target = personagem) */
  character_id: string | null;
  /** nome livre quando target = NPC */
  npc_name: string | null;
  description: string;
  /** Para UI: 'character' | 'npc' | 'none' — derivado mas mantido pra UX */
  target_kind: 'character' | 'npc' | 'none';
}

interface Props {
  roomId: string;
  campaignId: string;
  defaultTitle?: string;
  initialRecap?: string | null;
  initialDuration?: number | null;
  initialSessionNumber?: number | null;
  confirmedPlayers: ConfirmedPlayer[];
  campaignName?: string | null;
  scheduledAt?: string | null;
  onComplete?: () => void;
  onCancel?: () => void;
}

// ----------------------------- Helpers -----------------------------

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';

const parseRecapToCharIds = (description: string, party: PartyOption[]): string | null => {
  // Tenta achar um personagem pelo nome dentro da descrição (não usado, fallback)
  for (const p of party) {
    if (description.toLowerCase().includes(p.name.toLowerCase())) return p.character_id;
  }
  return null;
};

// ----------------------------- Componente -----------------------------

export const SessionResultDialog = ({
  roomId,
  campaignId,
  defaultTitle,
  initialRecap,
  initialDuration,
  initialSessionNumber,
  confirmedPlayers,
  campaignName,
  scheduledAt,
  onComplete,
  onCancel,
}: Props) => {
  const { data: existingEvents = [] } = useSessionEvents(roomId);
  const replaceEvents = useReplaceSessionEvents();

  const [title, setTitle] = useState(
    defaultTitle ||
      (initialSessionNumber ? `Sessão ${initialSessionNumber}` : 'Sessão sem título'),
  );
  const [recap, setRecap] = useState(initialRecap ?? '');
  const [duration, setDuration] = useState<string>(
    initialDuration ? String(initialDuration) : '',
  );
  const [present, setPresent] = useState<Set<string>>(
    new Set(confirmedPlayers.map((p) => p.player_id)),
  );
  const [party, setParty] = useState<PartyOption[]>([]);
  const [playersInfo, setPlayersInfo] = useState<PlayerInfo[]>(
    confirmedPlayers.map((p) => ({ ...p, avatar_url: null, character_name: null })),
  );
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [xpOpen, setXpOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolvedCampaignName, setResolvedCampaignName] = useState<string | null>(
    campaignName ?? null,
  );

  // Resolve nome da campanha se não veio via prop
  useEffect(() => {
    if (campaignName) {
      setResolvedCampaignName(campaignName);
      return;
    }
    if (!campaignId) return;
    supabase
      .from('rpg_campaigns')
      .select('name')
      .eq('id', campaignId)
      .maybeSingle()
      .then(({ data }) => setResolvedCampaignName((data as any)?.name ?? null));
  }, [campaignId, campaignName]);

  // Carrega party (personagens) da campanha
  useEffect(() => {
    const load = async () => {
      const { data: links } = await supabase
        .from('rpg_campaign_characters')
        .select('character_id')
        .eq('campaign_id', campaignId);
      const ids = (links || []).map((l: any) => l.character_id);
      if (ids.length === 0) {
        setParty([]);
        return;
      }
      const { data: chars } = await supabase
        .from('rpg_characters')
        .select('id, name, player_id, portrait_url')
        .in('id', ids);
      setParty(
        (chars || []).map((c: any) => ({
          character_id: c.id,
          name: c.name,
          player_id: c.player_id,
          portrait_url: c.portrait_url ?? null,
        })),
      );
    };
    load();
  }, [campaignId]);

  // Hidrata avatares dos jogadores confirmados + nome do personagem na campanha
  useEffect(() => {
    const load = async () => {
      const ids = confirmedPlayers.map((p) => p.player_id);
      if (ids.length === 0) {
        setPlayersInfo([]);
        return;
      }
      const { data: profiles } = await supabase.rpc('get_public_profiles', { p_ids: ids });
      const pmap = new Map<string, any>(
        (profiles || []).map((p: any) => [p.id, p]),
      );
      const charByPlayer = new Map<string, string>();
      for (const c of party) {
        if (c.player_id) charByPlayer.set(c.player_id, c.name);
      }
      setPlayersInfo(
        confirmedPlayers.map((p) => ({
          ...p,
          avatar_url: pmap.get(p.player_id)?.avatar_url ?? null,
          character_name: charByPlayer.get(p.player_id) ?? null,
        })),
      );
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedPlayers.length, party.length]);

  // Hidrata eventos existentes
  useEffect(() => {
    if (existingEvents.length > 0 && events.length === 0) {
      setEvents(
        existingEvents.map((e, i) => ({
          _key: `existing-${e.id}-${i}`,
          event_type: e.event_type,
          character_id: e.character_id,
          npc_name: null,
          description: e.description ?? '',
          target_kind: e.character_id ? 'character' : 'none',
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEvents.length]);

  const togglePresent = (id: string) =>
    setPresent((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const addEventOfType = (type: RpgSessionEventType) =>
    setEvents((es) => [
      ...es,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        event_type: type,
        character_id: null,
        npc_name: null,
        description: '',
        target_kind: type === 'important_npc' ? 'npc' : 'character',
      },
    ]);

  const updateEvent = (key: string, patch: Partial<EventDraft>) =>
    setEvents((es) => es.map((e) => (e._key === key ? { ...e, ...patch } : e)));

  const removeEvent = (key: string) =>
    setEvents((es) => es.filter((e) => e._key !== key));

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Dê um título à sessão');
      return;
    }
    setSaving(true);
    try {
      // 1. Atualiza match_room
      const patch: any = {
        session_title: title.trim(),
        session_recap: recap.trim() || null,
        result_type: 'rpg',
        status: 'finished',
      };
      if (duration) patch.duration_minutes = parseInt(duration);

      const { error: roomErr } = await supabase
        .from('match_rooms')
        .update(patch)
        .eq('id', roomId);
      if (roomErr) throw roomErr;

      // 2. Sincroniza presença
      for (const p of confirmedPlayers) {
        const isPresent = present.has(p.player_id);
        await supabase
          .from('match_room_players')
          .update({ type: isPresent ? 'confirmed' : ('waitlist' as any) } as any)
          .eq('room_id', roomId)
          .eq('player_id', p.player_id);
      }

      // 3. Persiste eventos. NPC vira prefixo na descrição (sem mudar schema).
      const cleaned = events
        .filter((e) => e.event_type)
        .map((e) => {
          let description = (e.description || '').trim() || null;
          if (e.target_kind === 'npc' && e.npc_name?.trim()) {
            const npc = e.npc_name.trim();
            description = description ? `${npc} — ${description}` : npc;
          }
          return {
            event_type: e.event_type,
            character_id: e.target_kind === 'character' ? e.character_id : null,
            description,
          };
        });
      await replaceEvents.mutateAsync({ room_id: roomId, events: cleaned });

      // 4. Personagens com evento de morte ficam "dead" na campanha
      const deadCharIds = cleaned
        .filter((e) => e.event_type === 'death' && e.character_id)
        .map((e) => e.character_id) as string[];
      if (deadCharIds.length > 0) {
        await supabase
          .from('rpg_campaign_characters')
          .update({
            status: 'dead' as any,
            exited_at: new Date().toISOString(),
            exit_room_id: roomId,
          } as any)
          .eq('campaign_id', campaignId)
          .in('character_id', deadCharIds);
      }

      toast.success('Sessão registrada!');
      onComplete?.();
    } catch (e: any) {
      toast.error('Erro ao registrar sessão: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (resolvedCampaignName) parts.push(resolvedCampaignName);
    if (scheduledAt) {
      try {
        parts.push(
          new Date(scheduledAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
        );
      } catch {
        /* noop */
      }
    }
    return parts.join(' · ');
  }, [resolvedCampaignName, scheduledAt]);

  const presentCount = present.size;
  const totalConfirmed = confirmedPlayers.length;

  // Tipos disponíveis pra criar evento rápido
  const quickTypes: RpgSessionEventType[] = EVENT_TYPES;

  // Header customizado (substitui o DialogHeader padrão visualmente)
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-1 -mt-2">
        <h2 className="text-lg font-bold tracking-tight">Inserir resultado da sessão</h2>
        {headerSubtitle && (
          <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
        )}
      </div>

      {/* Título + Duração */}
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Título da sessão
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Sessão 8 · O Encontro com Strahd"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Duração
          </Label>
          <Input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="min"
          />
        </div>
      </div>

      {/* Presença */}
      {confirmedPlayers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Presença
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {playersInfo.map((p) => {
              const isPresent = present.has(p.player_id);
              return (
                <label
                  key={p.player_id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                    isPresent
                      ? 'border-border bg-card'
                      : 'border-border/40 bg-card/40 opacity-70',
                  )}
                >
                  <Checkbox
                    checked={isPresent}
                    onCheckedChange={() => togglePresent(p.player_id)}
                  />
                  <Avatar className="h-8 w-8">
                    {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.name} /> : null}
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    {p.character_name && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {p.character_name}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {presentCount} de {totalConfirmed} confirmados durante a sala
          </p>
        </div>
      )}

      {/* Recap */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Recap
          </Label>
          <span className="text-[10px] text-muted-foreground">Markdown leve suportado</span>
        </div>
        <Textarea
          value={recap}
          onChange={(e) => setRecap(e.target.value)}
          rows={5}
          placeholder="Resuma o que aconteceu — alimenta a Crônica da campanha."
          className="resize-y"
        />
      </div>

      {/* Eventos em destaque */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Eventos em destaque
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Aparecem na crônica e nos perfis dos personagens
            </p>
          </div>
        </div>

        {/* Lista de eventos */}
        {events.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
            Nenhum evento registrado. Use os tipos abaixo para adicionar.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => {
              const theme = EVENT_THEME[e.event_type];
              const TypeIcon = theme.Icon;
              const character =
                e.character_id ? party.find((p) => p.character_id === e.character_id) : null;

              return (
                <div
                  key={e._key}
                  className={cn(
                    'rounded-lg border border-border bg-card/60 border-l-[3px] p-3 space-y-2',
                    theme.bar,
                  )}
                >
                  {/* Linha 1: tipo + alvo + remover */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                        theme.badge,
                      )}
                    >
                      <TypeIcon className="h-3 w-3" />
                      {theme.label}
                    </span>

                    {/* Target picker */}
                    <div className="flex items-center gap-1">
                      {/* Personagem */}
                      <select
                        value={
                          e.target_kind === 'character'
                            ? e.character_id ?? ''
                            : e.target_kind === 'npc'
                              ? '__npc__'
                              : '__none__'
                        }
                        onChange={(ev) => {
                          const v = ev.target.value;
                          if (v === '__none__') {
                            updateEvent(e._key, {
                              target_kind: 'none',
                              character_id: null,
                              npc_name: null,
                            });
                          } else if (v === '__npc__') {
                            updateEvent(e._key, {
                              target_kind: 'npc',
                              character_id: null,
                            });
                          } else {
                            updateEvent(e._key, {
                              target_kind: 'character',
                              character_id: v,
                              npc_name: null,
                            });
                          }
                        }}
                        className="h-7 text-xs rounded-md bg-background border border-border px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="__none__">— Sem alvo —</option>
                        {party.length > 0 && (
                          <optgroup label="Party">
                            {party.map((p) => (
                              <option key={p.character_id} value={p.character_id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="__npc__">NPC…</option>
                      </select>

                      {e.target_kind === 'npc' && (
                        <Input
                          value={e.npc_name ?? ''}
                          onChange={(ev) => updateEvent(e._key, { npc_name: ev.target.value })}
                          placeholder="Nome do NPC"
                          className="h-7 text-xs w-44"
                        />
                      )}

                      {e.target_kind === 'character' && character && (
                        <span className="inline-flex items-center gap-1.5 pl-1">
                          <Avatar className="h-5 w-5">
                            {character.portrait_url ? (
                              <AvatarImage src={character.portrait_url} alt={character.name} />
                            ) : null}
                            <AvatarFallback className="text-[9px] bg-muted">
                              {initials(character.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{character.name}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEvent(e._key)}
                      className="ml-auto text-muted-foreground/60 hover:text-destructive transition-colors"
                      title="Remover evento"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Linha 2: descrição */}
                  <Textarea
                    value={e.description}
                    onChange={(ev) => updateEvent(e._key, { description: ev.target.value })}
                    rows={2}
                    placeholder="Descreva o que aconteceu…"
                    className="resize-none text-sm bg-background/40 border-border/60"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Tipos disponíveis (chips) */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-muted-foreground">Tipos disponíveis:</span>
          {quickTypes.map((t) => {
            const theme = EVENT_THEME[t];
            const Icon = theme.Icon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => addEventOfType(t)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  theme.chip,
                )}
              >
                <Icon className="h-3 w-3" />
                {theme.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* XP e loot (placeholder colapsável) */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setXpOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            {xpOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            XP e loot (opcional)
          </span>
          <span className="text-[11px]">3 campos</span>
        </button>
        {xpOpen && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-muted-foreground">
            <div className="rounded-md border border-dashed border-border p-3 text-center text-xs">
              XP por jogador (em breve)
            </div>
            <div className="rounded-md border border-dashed border-border p-3 text-center text-xs">
              Loot principal (em breve)
            </div>
            <div className="rounded-md border border-dashed border-border p-3 text-center text-xs">
              Tesouro coletivo (em breve)
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[11px] text-muted-foreground">
          Salvar finaliza a sala e cria a Sessão{initialSessionNumber ? ` ${initialSessionNumber}` : ''} na crônica
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button onClick={submit} disabled={saving} variant="gold">
            {saving ? 'Salvando…' : 'Salvar resultado'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionResultDialog;
