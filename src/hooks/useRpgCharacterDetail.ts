import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseExternal';
import type {
  RpgCharacter,
  RpgCharacterCampaignStatus,
  PublicProfileLite,
} from '@/types/rpg';

export interface CharacterCampaignAppearance {
  id: string;
  campaign_id: string;
  status: RpgCharacterCampaignStatus;
  joined_at: string;
  exited_at: string | null;
  campaign: {
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    status: string;
  } | null;
}

export interface CharacterDetail {
  character: RpgCharacter;
  owner: PublicProfileLite | null;
  system: { id: string; name: string } | null;
  appearances: CharacterCampaignAppearance[];
}

export const useRpgCharacterDetail = (id?: string) => {
  return useQuery({
    queryKey: ['rpg-character-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<CharacterDetail | null> => {
      if (!id) return null;
      const { data: ch, error } = await supabase
        .from('rpg_characters')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!ch) return null;
      const character = ch as any as RpgCharacter;

      const [{ data: owner }, systemResp, { data: links }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, nickname, avatar_url')
          .eq('id', character.player_id)
          .maybeSingle(),
        character.system_id
          ? supabase
              .from('rpg_systems')
              .select('id, name')
              .eq('id', character.system_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        supabase
          .from('rpg_campaign_characters')
          .select('id, campaign_id, status, joined_at, exited_at')
          .eq('character_id', character.id)
          .order('joined_at', { ascending: false }),
      ]);

      const campaignIds = (links || []).map((l: any) => l.campaign_id);
      const { data: campaigns } = campaignIds.length
        ? await supabase
            .from('rpg_campaigns')
            .select('id, name, slug, image_url, status')
            .in('id', campaignIds)
        : { data: [] as any[] };
      const campMap = new Map<string, any>(
        (campaigns || []).map((c: any) => [c.id, c]),
      );

      return {
        character,
        owner: (owner as any) || null,
        system: (systemResp.data as any) || null,
        appearances: (links || []).map((l: any) => ({
          ...l,
          campaign: campMap.get(l.campaign_id) || null,
        })),
      };
    },
  });
};
