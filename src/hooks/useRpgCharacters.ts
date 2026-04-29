import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseExternal';
import { useAuth } from '@/contexts/AuthContext';
import type { RpgCharacter } from '@/types/rpg';

const charsKey = (uid?: string) => ['rpg-characters', uid] as const;

export const useMyCharacters = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: charsKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<RpgCharacter[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('rpg_characters')
        .select('*')
        .eq('player_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RpgCharacter[];
    },
  });
};

export const usePlayerCharacters = (playerId?: string) => {
  return useQuery({
    queryKey: ['rpg-characters-player', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<RpgCharacter[]> => {
      if (!playerId) return [];
      // RLS já filtra para mostrar só is_public ou próprios
      const { data, error } = await supabase
        .from('rpg_characters')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RpgCharacter[];
    },
  });
};

export interface CharacterInput {
  id?: string;
  name: string;
  race?: string | null;
  class?: string | null;
  level?: number | null;
  system_id?: string | null;
  portrait_url?: string | null;
  backstory?: string | null;
  alignment?: string | null;
  traits?: string | null;
  gear?: string | null;
  external_url?: string | null;
  is_public?: boolean;
}

export const useUpsertCharacter = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CharacterInput) => {
      if (!user) throw new Error('Não autenticado');
      if (input.id) {
        const { error } = await supabase
          .from('rpg_characters')
          .update({
            name: input.name,
            race: input.race ?? null,
            class: input.class ?? null,
            level: input.level ?? null,
            system_id: input.system_id ?? null,
            portrait_url: input.portrait_url ?? null,
            backstory: input.backstory ?? null,
            alignment: input.alignment ?? null,
            traits: input.traits ?? null,
            gear: input.gear ?? null,
            external_url: input.external_url ?? null,
            is_public: input.is_public ?? true,
          } as any)
          .eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from('rpg_characters')
        .insert({
          player_id: user.id,
          name: input.name,
          race: input.race ?? null,
          class: input.class ?? null,
          level: input.level ?? 1,
          system_id: input.system_id ?? null,
          portrait_url: input.portrait_url ?? null,
          backstory: input.backstory ?? null,
          alignment: input.alignment ?? null,
          traits: input.traits ?? null,
          gear: input.gear ?? null,
          external_url: input.external_url ?? null,
          is_public: input.is_public ?? true,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rpg-characters'] });
      qc.invalidateQueries({ queryKey: ['rpg-characters-player'] });
    },
  });
};

export const useDeleteCharacter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rpg_characters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rpg-characters'] });
      qc.invalidateQueries({ queryKey: ['rpg-characters-player'] });
    },
  });
};
