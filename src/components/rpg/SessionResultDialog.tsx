import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  useReplaceSessionEvents,
  useSessionEvents,
  type SessionEventInput,
} from '@/hooks/useRpgSessionEvents';
import type { RpgSessionEventType } from '@/types/rpg';

interface PartyOption {
  character_id: string;
  name: string;
  player_id: string | null;
}

interface ConfirmedPlayer {
  player_id: string;
  name: string;
}

interface Props {
  roomId: string;
  campaignId: string;
  defaultTitle?: string;
  initialRecap?: string | null;
  initialDuration?: number | null;
  initialSessionNumber?: number | null;
  confirmedPlayers: ConfirmedPlayer[];
  onComplete?: () => void;
}

export const SessionResultDialog = ({
  roomId,
  campaignId,
  defaultTitle,
  initialRecap,
  initialDuration,
  initialSessionNumber,
  confirmedPlayers,
  onComplete,
}: Props) => {
  const { data: existingEvents = [] } = useSessionEvents(roomId);
  const replaceEvents = useReplaceSessionEvents();

  const [title, setTitle] = useState(defaultTitle || `Sessão ${initialSessionNumber ?? ''}`.trim());
  const [recap, setRecap] = useState(initialRecap ?? '');
  const [duration, setDuration] = useState<string>(
    initialDuration ? String(initialDuration) : '',
  );
  const [present, setPresent] = useState<Set<string>>(
    new Set(confirmedPlayers.map((p) => p.player_id)),
  );
  const [party, setParty] = useState<PartyOption[]>([]);
  const [events, setEvents] = useState<(SessionEventInput & { _key: string })[]>([]);
  const [saving, setSaving] = useState(false);

  // Carrega party da campanha (personagens vinculados)
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
        .select('id, name, player_id')
        .in('id', ids);
      setParty(
        (chars || []).map((c: any) => ({
          character_id: c.id,
          name: c.name,
          player_id: c.player_id,
        })),
      );
    };
    load();
  }, [campaignId]);

  // Hidrata eventos existentes uma vez
  useEffect(() => {
    if (existingEvents.length > 0 && events.length === 0) {
      setEvents(
        existingEvents.map((e, i) => ({
          _key: `existing-${e.id}-${i}`,
          event_type: e.event_type,
          character_id: e.character_id,
          description: e.description,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEvents.length]);

  const togglePresent = (id: string) => {
    setPresent((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const addEvent = () =>
    setEvents((es) => [
      ...es,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        event_type: 'milestone',
        character_id: null,
        description: '',
      },
    ]);

  const updateEvent = (key: string, patch: Partial<SessionEventInput>) =>
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
      // 1. Atualiza match_room (recap, título, duração, status finished, result_type rpg)
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

      // 2. Sincroniza presença: confirmed = present, waitlist = ausente
      // Estratégia: para cada confirmed atual, garantir tipo correto.
      // Simplificado: marca como confirmed quem está presente, waitlist quem não está.
      for (const p of confirmedPlayers) {
        const isPresent = present.has(p.player_id);
        await supabase
          .from('match_room_players')
          .update({ type: isPresent ? 'confirmed' : ('waitlist' as any) } as any)
          .eq('room_id', roomId)
          .eq('player_id', p.player_id);
      }

      // 3. Reescreve eventos
      const cleaned = events
        .filter((e) => e.event_type)
        .map((e) => ({
          event_type: e.event_type,
          character_id: e.character_id || null,
          description: (e.description || '').trim() || null,
        }));
      await replaceEvents.mutateAsync({ room_id: roomId, events: cleaned });

      // 4. Aplica status "dead" no rpg_campaign_characters dos personagens marcados em eventos de morte
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

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="space-y-1.5">
          <Label>Título da sessão *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: A descida ao Túmulo"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Duração (min)</Label>
          <Input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="180"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Recap da sessão</Label>
        <Textarea
          value={recap}
          onChange={(e) => setRecap(e.target.value)}
          rows={5}
          placeholder="Resuma o que aconteceu — alimenta a Crônica da campanha."
        />
      </div>

      {/* Presença */}
      {confirmedPlayers.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Presentes nesta sessão</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {present.size}/{confirmedPlayers.length}
            </span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-border p-3">
            {confirmedPlayers.map((p) => (
              <label
                key={p.player_id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={present.has(p.player_id)}
                  onCheckedChange={() => togglePresent(p.player_id)}
                />
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Eventos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Eventos em destaque
          </Label>
          <Button size="sm" variant="outline" className="gap-1" onClick={addEvent}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
            Nenhum evento registrado. Adicione mortes, level-ups, marcos…
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div
                key={e._key}
                className="rounded-lg border border-border bg-background/40 p-3 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={e.event_type}
                    onValueChange={(v) => updateEvent(e._key, { event_type: v as RpgSessionEventType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {EVENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={e.character_id ?? 'none'}
                    onValueChange={(v) =>
                      updateEvent(e._key, { character_id: v === 'none' ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Personagem (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem personagem —</SelectItem>
                      {party.map((p) => (
                        <SelectItem key={p.character_id} value={p.character_id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={e.description ?? ''}
                  onChange={(ev) => updateEvent(e._key, { description: ev.target.value })}
                  rows={2}
                  placeholder="Descreva o que aconteceu…"
                />
                <div className="flex items-center justify-between">
                  {e.event_type === 'death' && e.character_id && (
                    <Badge variant="destructive" className="text-[10px]">
                      O personagem será marcado como caído ao salvar.
                    </Badge>
                  )}
                  <span />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeEvent(e._key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={submit} disabled={saving} variant="gold">
          {saving ? 'Salvando…' : 'Registrar sessão'}
        </Button>
      </div>
    </div>
  );
};

export default SessionResultDialog;
