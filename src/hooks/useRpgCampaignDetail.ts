import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseExternal';
import { useAuth } from '@/contexts/AuthContext';
import type {
  RpgCampaign,
  RpgCampaignPlayer,
  RpgCampaignCharacter,
  RpgCampaignPost,
  RpgCharacter,
  PublicProfileLite,
  RpgSessionEvent,
} from '@/types/rpg';

export interface CampaignDetail {
  campaign: RpgCampaign;
  master: PublicProfileLite | null;
  adventure: { id: string; name: string; slug: string | null; image_url: string | null } | null;
  members: (RpgCampaignPlayer & { profile: PublicProfileLite | null })[];
  characters: (RpgCampaignCharacter & {
    character: RpgCharacter | null;
    owner: PublicProfileLite | null;
  })[];
  posts: (RpgCampaignPost & { author: PublicProfileLite | null })[];
  sessions: {
    id: string;
    title: string;
    session_number: number | null;
    session_recap: string | null;
    scheduled_at: string;
    status: string;
  }[];
  events: RpgSessionEvent[];
}

const detailKey = (slug?: string) => ['rpg-campaign', slug] as const;

export const useRpgCampaignDetail = (slugOrId?: string) => {
  return useQuery({
    queryKey: detailKey(slugOrId),
    enabled: !!slugOrId,
    queryFn: async (): Promise<CampaignDetail | null> => {
      // Tenta por slug; se não, por id
      let camp: RpgCampaign | null = null;
      const bySlug = await supabase
        .from('rpg_campaigns')
        .select('*')
        .eq('slug', slugOrId!)
        .maybeSingle();
      camp = (bySlug.data as any) || null;
      if (!camp) {
        const byId = await supabase
          .from('rpg_campaigns')
          .select('*')
          .eq('id', slugOrId!)
          .maybeSingle();
        camp = (byId.data as any) || null;
      }
      if (!camp) return null;

      const [
        { data: master },
        adventureResp,
        { data: members },
        { data: campChars },
        { data: posts },
        { data: rooms },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, nickname, avatar_url')
          .eq('id', camp.master_id)
          .maybeSingle(),
        camp.adventure_id
          ? supabase
              .from('rpg_adventures')
              .select('id, name, slug, image_url')
              .eq('id', camp.adventure_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('rpg_campaign_players').select('*').eq('campaign_id', camp.id),
        supabase
          .from('rpg_campaign_characters')
          .select('*')
          .eq('campaign_id', camp.id),
        supabase
          .from('rpg_campaign_posts')
          .select('*')
          .eq('campaign_id', camp.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('match_rooms')
          .select('id, title, session_number, session_recap, scheduled_at, status')
          .eq('campaign_id', camp.id)
          .order('scheduled_at', { ascending: false }),
      ]);

      const memberIds = (members || []).map((m: any) => m.player_id);
      const charIds = (campChars || []).map((c: any) => c.character_id);
      const postAuthorIds = (posts || []).map((p: any) => p.author_id);
      const allUserIds = Array.from(
        new Set([...memberIds, ...postAuthorIds, camp.master_id]),
      );

      const [{ data: profiles }, charsResp, eventsResp] = await Promise.all([
        allUserIds.length
          ? supabase
              .from('profiles')
              .select('id, name, nickname, avatar_url')
              .in('id', allUserIds)
          : Promise.resolve({ data: [] as any[] }),
        charIds.length
          ? supabase.from('rpg_characters').select('*').in('id', charIds)
          : Promise.resolve({ data: [] as any[] }),
        rooms && rooms.length
          ? supabase
              .from('rpg_session_events')
              .select('*')
              .in(
                'room_id',
                rooms.map((r: any) => r.id),
              )
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profMap = new Map<string, PublicProfileLite>(
        (profiles || []).map((p: any) => [p.id, p]),
      );
      const charMap = new Map<string, RpgCharacter>(
        (charsResp.data || []).map((c: any) => [c.id, c]),
      );

      return {
        campaign: camp,
        master: profMap.get(camp.master_id) ?? null,
        adventure: (adventureResp.data as any) || null,
        members: (members || []).map((m: any) => ({
          ...m,
          profile: profMap.get(m.player_id) ?? null,
        })),
        characters: (campChars || []).map((cc: any) => {
          const ch = charMap.get(cc.character_id) || null;
          return {
            ...cc,
            character: ch,
            owner: ch ? profMap.get(ch.player_id) ?? null : null,
          };
        }),
        posts: (posts || []).map((p: any) => ({
          ...p,
          author: profMap.get(p.author_id) ?? null,
        })),
        sessions: (rooms || []) as any,
        events: (eventsResp.data || []) as RpgSessionEvent[],
      };
    },
  });
};

// ----- Mutations -----
export const useCreateCampaignPost = (campaignId?: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!user || !campaignId) throw new Error('Sem permissão');
      const { error } = await supabase.from('rpg_campaign_posts').insert({
        campaign_id: campaignId,
        author_id: user.id,
        body,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpg-campaign'] }),
  });
};

export const useDeleteCampaignPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('rpg_campaign_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpg-campaign'] }),
  });
};

export const useRequestJoinCampaign = (campaignId?: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: 'pending_request' | 'accepted' = 'pending_request') => {
      if (!user || !campaignId) throw new Error('Sem permissão');
      const { error } = await supabase
        .from('rpg_campaign_players')
        .upsert(
          {
            campaign_id: campaignId,
            player_id: user.id,
            status,
          } as any,
          { onConflict: 'campaign_id,player_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpg-campaign'] }),
  });
};

export const useUpdateCampaignPlayerStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: 'accepted' | 'declined' | 'left';
    }) => {
      const { error } = await supabase
        .from('rpg_campaign_players')
        .update({ status: input.status } as any)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpg-campaign'] }),
  });
};

export const useAttachCharacterToCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { campaign_id: string; character_id: string }) => {
      const { error } = await supabase.from('rpg_campaign_characters').insert({
        campaign_id: input.campaign_id,
        character_id: input.character_id,
        status: 'active',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpg-campaign'] }),
  });
};

export const useUpdateCampaignCharacterStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: 'active' | 'left' | 'dead' | 'retired';
    }) => {
      const patch: any = { status: input.status };
      if (input.status !== 'active') patch.exited_at = new Date().toISOString();
      const { error } = await supabase
        .from('rpg_campaign_characters')
        .update(patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpg-campaign'] }),
  });
};
