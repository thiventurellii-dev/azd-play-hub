import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseExternal';
import { useAuth } from '@/contexts/AuthContext';
import type { RpgCampaign, RpgCampaignSummary, PublicProfileLite } from '@/types/rpg';
import { slugify } from '@/lib/slugify';

const CAMPAIGNS_KEY = ['rpg-campaigns'] as const;

export const useRpgCampaigns = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, user?.id ?? 'anon'],
    queryFn: async (): Promise<RpgCampaignSummary[]> => {
      // RLS já filtra: públicas + (minhas se logado)
      const { data: campaigns, error } = await supabase
        .from('rpg_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (campaigns || []) as RpgCampaign[];
      if (list.length === 0) return [];

      const masterIds = Array.from(new Set(list.map((c) => c.master_id)));
      const advIds = Array.from(
        new Set(list.map((c) => c.adventure_id).filter(Boolean) as string[]),
      );

      const [{ data: profs }, { data: advs }, { data: members }, { data: sessions }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, name, nickname, avatar_url')
            .in('id', masterIds),
          advIds.length
            ? supabase
                .from('rpg_adventures')
                .select('id, name, slug, image_url')
                .in('id', advIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from('rpg_campaign_players')
            .select('campaign_id, status')
            .in(
              'campaign_id',
              list.map((c) => c.id),
            ),
          supabase
            .from('match_rooms')
            .select('campaign_id')
            .in(
              'campaign_id',
              list.map((c) => c.id),
            ),
        ]);

      const profMap = new Map<string, PublicProfileLite>(
        (profs || []).map((p: any) => [p.id, p]),
      );
      const advMap = new Map((advs || []).map((a: any) => [a.id, a]));
      const partyCount = new Map<string, number>();
      (members || []).forEach((m: any) => {
        if (m.status === 'accepted') {
          partyCount.set(m.campaign_id, (partyCount.get(m.campaign_id) || 0) + 1);
        }
      });
      const sessionCount = new Map<string, number>();
      (sessions || []).forEach((s: any) => {
        if (s.campaign_id) {
          sessionCount.set(s.campaign_id, (sessionCount.get(s.campaign_id) || 0) + 1);
        }
      });

      return list.map((c) => ({
        ...c,
        master: profMap.get(c.master_id) ?? null,
        adventure: c.adventure_id ? (advMap.get(c.adventure_id) as any) ?? null : null,
        party_count: partyCount.get(c.id) || 0,
        session_count: sessionCount.get(c.id) || 0,
      }));
    },
  });
};

export const useIsMestre = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-mestre', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('profile_tags')
        .select('tag')
        .eq('user_id', user.id)
        .eq('tag', 'mestre' as any)
        .maybeSingle();
      return !!data;
    },
  });
};

export interface CreateCampaignInput {
  name: string;
  description?: string;
  adventure_id?: string | null;
  is_public: boolean;
  open_join: boolean;
  max_players: number;
  image_url?: string | null;
}

export const useCreateCampaign = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      if (!user) throw new Error('Não autenticado');
      const baseSlug = slugify(input.name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from('rpg_campaigns')
        .insert({
          name: input.name,
          slug,
          description: input.description || null,
          adventure_id: input.adventure_id || null,
          master_id: user.id,
          is_public: input.is_public,
          open_join: input.open_join,
          max_players: input.max_players,
          image_url: input.image_url || null,
          status: 'planning',
        } as any)
        .select('*')
        .single();
      if (error) throw error;

      // Mestre vira automaticamente "accepted" na própria campanha
      await supabase.from('rpg_campaign_players').insert({
        campaign_id: (data as any).id,
        player_id: user.id,
        status: 'accepted',
      } as any);

      return data as RpgCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
};
