import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseExternal';
import type { RpgSessionEvent, RpgSessionEventType } from '@/types/rpg';

export const useSessionEvents = (roomId?: string) => {
  return useQuery({
    queryKey: ['rpg-session-events', roomId],
    enabled: !!roomId,
    queryFn: async (): Promise<RpgSessionEvent[]> => {
      if (!roomId) return [];
      const { data, error } = await supabase
        .from('rpg_session_events')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as RpgSessionEvent[];
    },
  });
};

export interface SessionEventInput {
  event_type: RpgSessionEventType;
  character_id?: string | null;
  description?: string | null;
}

export const useReplaceSessionEvents = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { room_id: string; events: SessionEventInput[] }) => {
      // Apaga e reinsere — fluxo simples para um form de resultado
      await supabase.from('rpg_session_events').delete().eq('room_id', input.room_id);
      if (input.events.length === 0) return;
      const rows = input.events.map((e) => ({
        room_id: input.room_id,
        event_type: e.event_type,
        character_id: e.character_id ?? null,
        description: e.description ?? null,
      }));
      const { error } = await supabase.from('rpg_session_events').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['rpg-session-events', vars.room_id] });
      qc.invalidateQueries({ queryKey: ['rpg-campaign'] });
    },
  });
};

export const EVENT_TYPE_LABELS: Record<RpgSessionEventType, string> = {
  death: 'Morte',
  level_up: 'Subiu de nível',
  milestone: 'Marco',
  legendary_item: 'Item lendário',
  important_npc: 'NPC importante',
  betrayal: 'Traição',
  achievement: 'Conquista',
};

export const EVENT_TYPES: RpgSessionEventType[] = [
  'death',
  'level_up',
  'milestone',
  'legendary_item',
  'important_npc',
  'betrayal',
  'achievement',
];
