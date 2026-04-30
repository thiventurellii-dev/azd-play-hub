import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

export interface ProfileRpgCampaign {
  id: string;
  slug: string | null;
  name: string;
  status: string;
  is_public: boolean;
  master_id: string;
  is_master: boolean;
  adventure_name: string | null;
  adventure_image: string | null;
  party_count: number;
  session_count: number;
  total_minutes: number;
  next_session_at: string | null;
  my_character_name: string | null;
}

export interface ProfileRpgCharacter {
  id: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  portrait_url: string | null;
  status: "active" | "left" | "dead" | "retired" | null;
  is_public: boolean;
}

export interface ProfileRpgPartner {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  campaigns: number;
  sessions: number;
}

export interface ProfileRpgStats {
  asMaster: {
    activeCampaigns: number;
    sessions: number;
    totalMinutes: number;
    uniquePlayers: number;
  };
  asPlayer: {
    activeCampaigns: number;
    characters: number;
    sessions: number;
    totalMinutes: number;
  };
  campaigns: ProfileRpgCampaign[];
  characters: ProfileRpgCharacter[];
  partners: ProfileRpgPartner[];
}

export const useProfileRpgData = (profileId?: string) =>
  useQuery({
    queryKey: ["player-profile-rpg", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<ProfileRpgStats> => {
      const empty: ProfileRpgStats = {
        asMaster: { activeCampaigns: 0, sessions: 0, totalMinutes: 0, uniquePlayers: 0 },
        asPlayer: { activeCampaigns: 0, characters: 0, sessions: 0, totalMinutes: 0 },
        campaigns: [],
        characters: [],
        partners: [],
      };
      if (!profileId) return empty;

      // Personagens do jogador
      const { data: chars } = await supabase
        .from("rpg_characters")
        .select("id, name, race, class, level, portrait_url, is_public")
        .eq("player_id", profileId)
        .order("created_at", { ascending: false });

      // Status (vivo/morto/etc) vem de rpg_campaign_characters quando atrelado
      const charIds = (chars || []).map((c: any) => c.id);
      const { data: charCampLinks } = charIds.length
        ? await supabase
            .from("rpg_campaign_characters")
            .select("character_id, campaign_id, status")
            .in("character_id", charIds)
        : { data: [] as any[] };
      const charStatusMap: Record<string, ProfileRpgCharacter["status"]> = {};
      for (const link of charCampLinks || []) {
        const prev = charStatusMap[(link as any).character_id];
        // ativo > qualquer outro
        if (!prev || (link as any).status === "active") {
          charStatusMap[(link as any).character_id] = (link as any).status;
        }
      }
      const characters: ProfileRpgCharacter[] = (chars || []).map((c: any) => ({
        ...c,
        status: charStatusMap[c.id] || "active",
      }));

      // Campanhas como mestre
      const { data: masterCamps } = await supabase
        .from("rpg_campaigns")
        .select("id, slug, name, status, is_public, master_id, adventure_id")
        .eq("master_id", profileId);

      // Campanhas como jogador (memberships)
      const { data: memberships } = await supabase
        .from("rpg_campaign_players")
        .select("campaign_id, status")
        .eq("player_id", profileId)
        .eq("status", "accepted");

      const playerCampIds = (memberships || [])
        .map((m: any) => m.campaign_id)
        .filter((id: string) => !(masterCamps || []).some((c: any) => c.id === id));

      const { data: playerCamps } = playerCampIds.length
        ? await supabase
            .from("rpg_campaigns")
            .select("id, slug, name, status, is_public, master_id, adventure_id")
            .in("id", playerCampIds)
        : { data: [] as any[] };

      const allCamps = [...(masterCamps || []), ...(playerCamps || [])];
      const allCampIds = allCamps.map((c: any) => c.id);

      // Sessions
      const { data: sessions } = allCampIds.length
        ? await supabase
            .from("match_rooms")
            .select("id, campaign_id, scheduled_at, status")
            .in("campaign_id", allCampIds)
        : { data: [] as any[] };

      // Próximas sessões
      const nextSessionMap: Record<string, string> = {};
      const sessionCount: Record<string, number> = {};
      const totalMinutes: Record<string, number> = {};
      const now = Date.now();
      for (const s of sessions || []) {
        const cid = (s as any).campaign_id;
        if (!cid) continue;
        if ((s as any).status === "finished") {
          sessionCount[cid] = (sessionCount[cid] || 0) + 1;
          totalMinutes[cid] = (totalMinutes[cid] || 0) + 240; // estimativa: 4h por sessão
        }
        const at = (s as any).scheduled_at;
        if (at && new Date(at).getTime() > now && (s as any).status !== "finished") {
          if (!nextSessionMap[cid] || at < nextSessionMap[cid]) nextSessionMap[cid] = at;
        }
      }

      // Party count
      const { data: allMembers } = allCampIds.length
        ? await supabase
            .from("rpg_campaign_players")
            .select("campaign_id, player_id, status")
            .in("campaign_id", allCampIds)
            .eq("status", "accepted")
        : { data: [] as any[] };
      const partyCount: Record<string, number> = {};
      const playersByCampaign: Record<string, Set<string>> = {};
      for (const m of allMembers || []) {
        partyCount[(m as any).campaign_id] = (partyCount[(m as any).campaign_id] || 0) + 1;
        if (!playersByCampaign[(m as any).campaign_id])
          playersByCampaign[(m as any).campaign_id] = new Set();
        playersByCampaign[(m as any).campaign_id].add((m as any).player_id);
      }

      // Aventuras
      const advIds = [...new Set(allCamps.map((c: any) => c.adventure_id).filter(Boolean))];
      const { data: advs } = advIds.length
        ? await supabase
            .from("rpg_adventures")
            .select("id, name, image_url")
            .in("id", advIds)
        : { data: [] as any[] };
      const advMap: Record<string, any> = {};
      for (const a of advs || []) advMap[(a as any).id] = a;

      // Personagem usado pelo jogador em cada campanha (quando aventureiro)
      const myCharByCampaign: Record<string, string> = {};
      for (const link of charCampLinks || []) {
        const camp = (link as any).campaign_id;
        const charId = (link as any).character_id;
        const ch = characters.find((c) => c.id === charId);
        if (ch && !myCharByCampaign[camp]) myCharByCampaign[camp] = ch.name;
      }

      const campaigns: ProfileRpgCampaign[] = allCamps.map((c: any) => {
        const isMaster = c.master_id === profileId;
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          status: c.status,
          is_public: c.is_public,
          master_id: c.master_id,
          is_master: isMaster,
          adventure_name: c.adventure_id ? advMap[c.adventure_id]?.name || null : null,
          adventure_image: c.adventure_id ? advMap[c.adventure_id]?.image_url || null : null,
          party_count: partyCount[c.id] || 0,
          session_count: sessionCount[c.id] || 0,
          total_minutes: totalMinutes[c.id] || 0,
          next_session_at: nextSessionMap[c.id] || null,
          my_character_name: !isMaster ? myCharByCampaign[c.id] || null : null,
        };
      });

      // Stats agregados
      const asMaster = {
        activeCampaigns: campaigns.filter((c) => c.is_master && c.status === "active").length,
        sessions: campaigns.filter((c) => c.is_master).reduce((s, c) => s + c.session_count, 0),
        totalMinutes: campaigns
          .filter((c) => c.is_master)
          .reduce((s, c) => s + c.total_minutes, 0),
        uniquePlayers: (() => {
          const set = new Set<string>();
          for (const c of campaigns.filter((x) => x.is_master)) {
            const p = playersByCampaign[c.id];
            if (p) for (const pid of p) if (pid !== profileId) set.add(pid);
          }
          return set.size;
        })(),
      };
      const asPlayer = {
        activeCampaigns: campaigns.filter((c) => !c.is_master && c.status === "active").length,
        characters: characters.length,
        sessions: campaigns.filter((c) => !c.is_master).reduce((s, c) => s + c.session_count, 0),
        totalMinutes: campaigns
          .filter((c) => !c.is_master)
          .reduce((s, c) => s + c.total_minutes, 0),
      };

      // Co-aventureiros: outros membros das campanhas onde sou jogador
      const partnerStats: Record<string, { campaigns: Set<string>; sessions: number }> = {};
      const playerCampIdsSet = new Set(
        campaigns.filter((c) => !c.is_master).map((c) => c.id),
      );
      for (const m of allMembers || []) {
        const cid = (m as any).campaign_id;
        const pid = (m as any).player_id;
        if (pid === profileId) continue;
        if (!playerCampIdsSet.has(cid)) continue;
        if (!partnerStats[pid]) partnerStats[pid] = { campaigns: new Set(), sessions: 0 };
        partnerStats[pid].campaigns.add(cid);
        partnerStats[pid].sessions +=
          campaigns.find((c) => c.id === cid)?.session_count || 0;
      }
      const partnerIds = Object.keys(partnerStats);
      const { data: pProfs } = partnerIds.length
        ? await supabase
            .from("profiles")
            .select("id, name, nickname, avatar_url")
            .in("id", partnerIds)
        : { data: [] as any[] };
      const pMap: Record<string, any> = {};
      for (const p of pProfs || []) pMap[(p as any).id] = p;
      const partners: ProfileRpgPartner[] = Object.entries(partnerStats)
        .map(([pid, s]) => ({
          id: pid,
          name: pMap[pid]?.name || "?",
          nickname: pMap[pid]?.nickname || null,
          avatar_url: pMap[pid]?.avatar_url || null,
          campaigns: s.campaigns.size,
          sessions: s.sessions,
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 8);

      return { asMaster, asPlayer, campaigns, characters, partners };
    },
  });
