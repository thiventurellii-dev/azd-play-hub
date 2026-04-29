import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseExternal';
import type {
  RpgCharacter,
  RpgCharacterCampaignStatus,
  RpgSessionEvent,
  RpgSessionEventType,
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
    master_id: string;
    master_name?: string | null;
  } | null;
  session_count: number;
  total_minutes: number;
  level_start: number | null;
  level_end: number | null;
}

export interface CharacterMoment {
  id: string;
  event_type: RpgSessionEventType;
  description: string | null;
  created_at: string;
  campaign_name: string | null;
  session_number: number | null;
  session_date: string | null;
}

export interface SiblingCharacter {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  portrait_url: string | null;
  status: 'active' | 'dead' | 'retired' | 'left' | null;
  exited_at: string | null;
}

export interface CharacterDetail {
  character: RpgCharacter;
  owner: PublicProfileLite | null;
  system: { id: string; name: string } | null;
  appearances: CharacterCampaignAppearance[];
  moments: CharacterMoment[];
  siblings: SiblingCharacter[];
  stats: {
    campaigns: number;
    sessions: number;
    minutes: number;
    since: string | null;
    overall_status: 'active' | 'dead' | 'retired' | 'left';
  };
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

      const [{ data: owner }, systemResp, { data: links }, { data: siblingsRaw }] = await Promise.all([
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
        supabase
          .from('rpg_characters')
          .select('id, name, class, level, portrait_url')
          .eq('player_id', character.player_id)
          .neq('id', character.id)
          .order('updated_at', { ascending: false })
          .limit(8),
      ]);

      const campaignIds = (links || []).map((l: any) => l.campaign_id);
      const [{ data: campaigns }, { data: rooms }] = await Promise.all([
        campaignIds.length
          ? supabase
              .from('rpg_campaigns')
              .select('id, name, slug, image_url, status, master_id')
              .in('id', campaignIds)
          : Promise.resolve({ data: [] as any[] }),
        campaignIds.length
          ? supabase
              .from('match_rooms')
              .select('id, campaign_id, scheduled_at, duration_minutes, session_number, session_title, status')
              .in('campaign_id', campaignIds)
              .eq('status', 'finished')
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Master names
      const masterIds = Array.from(new Set((campaigns || []).map((c: any) => c.master_id)));
      const { data: masters } = masterIds.length
        ? await supabase.from('profiles').select('id, name, nickname').in('id', masterIds)
        : { data: [] as any[] };
      const masterMap = new Map((masters || []).map((m: any) => [m.id, m.nickname || m.name]));

      const campMap = new Map<string, any>(
        (campaigns || []).map((c: any) => [
          c.id,
          { ...c, master_name: masterMap.get(c.master_id) ?? null },
        ]),
      );

      // Sessões/minutos por campanha
      const sessionsByCamp = new Map<string, { count: number; minutes: number; ids: string[] }>();
      (rooms || []).forEach((r: any) => {
        const e = sessionsByCamp.get(r.campaign_id) || { count: 0, minutes: 0, ids: [] };
        e.count += 1;
        e.minutes += r.duration_minutes || 0;
        e.ids.push(r.id);
        sessionsByCamp.set(r.campaign_id, e);
      });

      // Eventos do personagem em todas as salas dessas campanhas (level_up, etc.)
      const allRoomIds = (rooms || []).map((r: any) => r.id);
      const { data: events } = allRoomIds.length
        ? await supabase
            .from('rpg_session_events')
            .select('id, room_id, event_type, description, created_at, character_id')
            .in('room_id', allRoomIds)
            .or(`character_id.eq.${character.id},character_id.is.null`)
            .order('created_at', { ascending: false })
        : { data: [] as any[] };

      const roomMap = new Map((rooms || []).map((r: any) => [r.id, r]));

      // Level start/end por campanha (heurística: count level_up do personagem)
      const levelUpsByCamp = new Map<string, number>();
      (events || []).forEach((e: any) => {
        if (e.event_type !== 'level_up' || e.character_id !== character.id) return;
        const room = roomMap.get(e.room_id);
        if (!room) return;
        levelUpsByCamp.set(room.campaign_id, (levelUpsByCamp.get(room.campaign_id) || 0) + 1);
      });

      const appearances: CharacterCampaignAppearance[] = (links || []).map((l: any) => {
        const sess = sessionsByCamp.get(l.campaign_id) || { count: 0, minutes: 0, ids: [] };
        const ups = levelUpsByCamp.get(l.campaign_id) || 0;
        const camp = campMap.get(l.campaign_id) || null;
        return {
          ...l,
          campaign: camp,
          session_count: sess.count,
          total_minutes: sess.minutes,
          level_start: null,
          level_end: ups > 0 ? ups + 1 : null,
        };
      });

      const moments: CharacterMoment[] = (events || [])
        .filter((e: any) => e.character_id === character.id)
        .slice(0, 12)
        .map((e: any) => {
          const room = roomMap.get(e.room_id);
          const camp = room ? campMap.get(room.campaign_id) : null;
          return {
            id: e.id,
            event_type: e.event_type,
            description: e.description,
            created_at: e.created_at,
            campaign_name: camp?.name ?? null,
            session_number: room?.session_number ?? null,
            session_date: room?.scheduled_at ?? null,
          };
        });

      // Status agregado dos siblings (busca no rpg_campaign_characters)
      const siblingIds = (siblingsRaw || []).map((s: any) => s.id);
      const { data: sibLinks } = siblingIds.length
        ? await supabase
            .from('rpg_campaign_characters')
            .select('character_id, status, exited_at')
            .in('character_id', siblingIds)
            .order('joined_at', { ascending: false })
        : { data: [] as any[] };
      const sibStatus = new Map<string, { status: string; exited_at: string | null }>();
      (sibLinks || []).forEach((l: any) => {
        if (!sibStatus.has(l.character_id)) {
          sibStatus.set(l.character_id, { status: l.status, exited_at: l.exited_at });
        } else if (l.status === 'dead') {
          sibStatus.set(l.character_id, { status: 'dead', exited_at: l.exited_at });
        }
      });
      const siblings: SiblingCharacter[] = (siblingsRaw || []).map((s: any) => {
        const st = sibStatus.get(s.id);
        return {
          id: s.id,
          name: s.name,
          class: s.class,
          level: s.level,
          portrait_url: s.portrait_url,
          status: (st?.status as any) ?? 'active',
          exited_at: st?.exited_at ?? null,
        };
      });

      const totalSessions = appearances.reduce((s, a) => s + a.session_count, 0);
      const totalMinutes = appearances.reduce((s, a) => s + a.total_minutes, 0);
      const overall_status = appearances.some((a) => a.status === 'dead')
        ? 'dead'
        : appearances.some((a) => a.status === 'active')
          ? 'active'
          : appearances.some((a) => a.status === 'retired')
            ? 'retired'
            : 'left';

      return {
        character,
        owner: (owner as any) || null,
        system: (systemResp.data as any) || null,
        appearances,
        moments,
        siblings,
        stats: {
          campaigns: appearances.length,
          sessions: totalSessions,
          minutes: totalMinutes,
          since: character.created_at,
          overall_status,
        },
      };
    },
  });
};
