import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import type { RecentMatchItem } from "@/components/profile/RecentMatchCard";

// ----- Tipos públicos do hook -----
export interface ProfileBoardgameStats {
  totalGames: number;
  uniqueGames: number;
  performance: GamePerf[];
  partners: Partner[];
}
export interface GamePerf {
  game_id: string;
  game_name: string;
  game_slug: string | null;
  image_url: string | null;
  games: number;
  wins: number;
  best: number;
  winPct: number;
  lastPlayedAt: string | null;
}
export interface Partner {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  games: number;
  wins: number;
}

export interface ProfileBotcStats {
  gamesPlayed: number;
  winsGood: number;
  winsEvil: number;
  storytellerGames: number;
  goodPlayed: number;
  evilPlayed: number;
  characters: BotcCharPerf[];
  partners: BotcPartner[];
}
export interface BotcCharPerf {
  id: string;
  name: string;
  team: string | null;
  games: number;
  wins: number;
}
export interface BotcPartner {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  goodGames: number;
  evilGames: number;
  goodWins: number;
  evilWins: number;
}

export interface SeasonContext {
  id: string;
  name: string;
  status: string;
  end_date: string | null;
  position: number;
  total: number;
  current_mmr: number;
  min_mmr: number;
  max_mmr: number;
}

export interface UpcomingRoom {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  game_id: string;
  game_name: string;
  game_slug: string | null;
  is_public: boolean;
  confirmed_count: number;
  max_players: number;
  room_type: string | null;
}

export interface AchievementItem {
  id: string;
  name: string;
  description: string | null;
  granted_at: string | null;
}

export interface CommunityItem {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  joined_at: string;
}

export interface ProfileFullData {
  profile: any;
  role: string;
  isMaster: boolean;
  isStoryteller: boolean;
  boardgame: ProfileBoardgameStats;
  botc: ProfileBotcStats;
  seasons: SeasonContext[];
  recentMatches: RecentMatchItem[];
  lastMatchDate: string | null;
  upcomingRooms: UpcomingRoom[];
  achievements: AchievementItem[];
  communities: CommunityItem[];
  mainCommunity: CommunityItem | null;
  friendsCount: number;
}

// =====================================================================

export const usePlayerProfileData = (nickname?: string) =>
  useQuery({
    queryKey: ["player-profile-full", nickname],
    enabled: !!nickname,
    queryFn: async (): Promise<ProfileFullData | null> => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("nickname", nickname as string)
        .maybeSingle();
      if (!profile) return null;
      const profId = (profile as any).id as string;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profId)
        .maybeSingle();
      const role = (roleData as any)?.role || "player";

      // ============ Boardgame matches ============
      const { data: results } = await supabase
        .from("match_results")
        .select("match_id, position, score, mmr_change")
        .eq("player_id", profId);

      const boardgame: ProfileBoardgameStats = {
        totalGames: 0,
        uniqueGames: 0,
        performance: [],
        partners: [],
      };
      const recentMatches: RecentMatchItem[] = [];
      let lastMatchDate: string | null = null;

      if (results && results.length > 0) {
        const matchIds = [...new Set(results.map((r: any) => r.match_id))];
        const { data: matches } = await supabase
          .from("matches")
          .select("id, game_id, played_at, season_id")
          .in("id", matchIds)
          .order("played_at", { ascending: false });
        const matchesById: Record<string, any> = {};
        const gameIds = [...new Set((matches || []).map((m: any) => m.game_id))];
        const { data: games } = await supabase
          .from("games")
          .select("id, name, slug, image_url")
          .in("id", gameIds);
        const gameMap: Record<string, any> = {};
        for (const g of games || []) gameMap[(g as any).id] = g;
        for (const m of matches || []) matchesById[(m as any).id] = m;
        if (matches && matches.length > 0) lastMatchDate = (matches[0] as any).played_at;

        boardgame.totalGames = results.length;
        boardgame.uniqueGames = gameIds.length;

        // perf por jogo
        const perfMap: Record<
          string,
          { games: number; wins: number; best: number; lastPlayedAt: string | null }
        > = {};
        for (const r of results) {
          const m = matchesById[(r as any).match_id];
          if (!m) continue;
          const gid = m.game_id as string;
          if (!perfMap[gid]) perfMap[gid] = { games: 0, wins: 0, best: 0, lastPlayedAt: null };
          perfMap[gid].games++;
          perfMap[gid].best = Math.max(perfMap[gid].best, (r as any).score || 0);
          if ((r as any).position === 1) perfMap[gid].wins++;
          if (!perfMap[gid].lastPlayedAt || m.played_at > perfMap[gid].lastPlayedAt!) {
            perfMap[gid].lastPlayedAt = m.played_at;
          }
        }
        boardgame.performance = Object.entries(perfMap)
          .map(([gid, s]) => ({
            game_id: gid,
            game_name: gameMap[gid]?.name || "?",
            game_slug: gameMap[gid]?.slug || null,
            image_url: gameMap[gid]?.image_url || null,
            games: s.games,
            wins: s.wins,
            best: s.best,
            winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
            lastPlayedAt: s.lastPlayedAt,
          }))
          .sort((a, b) => b.games - a.games);

        // adversários (parceiros)
        const { data: allResults } = await supabase
          .from("match_results")
          .select("match_id, player_id, position")
          .in("match_id", matchIds);
        const partnerMap: Record<string, { games: number; wins: number }> = {};
        for (const r of allResults || []) {
          if ((r as any).player_id === profId) continue;
          const pid = (r as any).player_id as string;
          if (!partnerMap[pid]) partnerMap[pid] = { games: 0, wins: 0 };
          partnerMap[pid].games++;
          const my = results.find((mr: any) => mr.match_id === (r as any).match_id);
          if ((my as any)?.position === 1) partnerMap[pid].wins++;
        }
        const partnerIds = Object.keys(partnerMap);
        const { data: partnerProfiles } = partnerIds.length
          ? await supabase.rpc("get_public_profiles", { p_ids: partnerIds })
          : { data: [] as any[] };
        const profMap: Record<string, any> = {};
        for (const p of partnerProfiles || []) profMap[(p as any).id] = p;
        boardgame.partners = Object.entries(partnerMap)
          .map(([pid, s]) => ({
            id: pid,
            name: profMap[pid]?.name || "?",
            nickname: profMap[pid]?.nickname || null,
            avatar_url: profMap[pid]?.avatar_url || null,
            games: s.games,
            wins: s.wins,
          }))
          .sort((a, b) => b.games - a.games)
          .slice(0, 8);

        // últimas partidas (8)
        const sorted = [...results].sort((a: any, b: any) => {
          const ma = matchesById[a.match_id];
          const mb = matchesById[b.match_id];
          return new Date(mb?.played_at || 0).getTime() - new Date(ma?.played_at || 0).getTime();
        }).slice(0, 8);

        for (const r of sorted) {
          const m = matchesById[(r as any).match_id];
          const opps = (allResults || [])
            .filter((ar: any) => ar.match_id === (r as any).match_id && ar.player_id !== profId)
            .map((ar: any) => ({
              name: profMap[ar.player_id]?.nickname || profMap[ar.player_id]?.name || "?",
              avatar_url: profMap[ar.player_id]?.avatar_url || null,
            }));
          recentMatches.push({
            match_id: (r as any).match_id,
            game_name: gameMap[m?.game_id]?.name || "?",
            game_slug: gameMap[m?.game_id]?.slug || null,
            played_at: m?.played_at || new Date().toISOString(),
            is_competitive: !!m?.season_id,
            position: (r as any).position ?? null,
            score: (r as any).score ?? null,
            mmr_change: (r as any).mmr_change ?? null,
            opponents: opps,
          });
        }
      }

      // ============ Próximas salas ============
      const upcomingRooms: UpcomingRoom[] = [];
      const { data: roomPlayers } = await supabase
        .from("match_room_players")
        .select("room_id")
        .eq("player_id", profId);
      if (roomPlayers && roomPlayers.length > 0) {
        const roomIds = (roomPlayers as any[]).map((rp) => rp.room_id);
        const { data: rooms } = await supabase
          .from("match_rooms")
          .select("id, title, scheduled_at, status, game_id, max_players, is_public, room_type")
          .in("id", roomIds)
          .in("status", ["open", "full"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(5);
        if (rooms && rooms.length > 0) {
          const roomGameIds = [...new Set((rooms as any[]).map((r) => r.game_id))];
          const { data: roomGames } = await supabase
            .from("games")
            .select("id, name, slug")
            .in("id", roomGameIds);
          const rgMap: Record<string, any> = {};
          for (const g of roomGames || []) rgMap[(g as any).id] = g;

          // contagens confirmadas
          const { data: confirms } = await supabase
            .from("match_room_players")
            .select("room_id, type")
            .in("room_id", (rooms as any[]).map((r) => r.id));
          const confMap: Record<string, number> = {};
          for (const c of confirms || []) {
            if ((c as any).type === "confirmed") {
              confMap[(c as any).room_id] = (confMap[(c as any).room_id] || 0) + 1;
            }
          }
          for (const r of rooms as any[]) {
            upcomingRooms.push({
              id: r.id,
              title: r.title,
              scheduled_at: r.scheduled_at,
              status: r.status,
              game_id: r.game_id,
              game_name: rgMap[r.game_id]?.name || "?",
              game_slug: rgMap[r.game_id]?.slug || null,
              is_public: r.is_public ?? true,
              max_players: r.max_players ?? 0,
              confirmed_count: confMap[r.id] || 0,
              room_type: r.room_type ?? null,
            });
          }
        }
      }

      // ============ Conquistas ============
      const achievements: AchievementItem[] = [];
      const { data: playerAchs } = await supabase
        .from("player_achievements")
        .select("achievement_id, granted_at")
        .eq("player_id", profId)
        .order("granted_at", { ascending: false });
      if (playerAchs && playerAchs.length > 0) {
        const achIds = (playerAchs as any[]).map((a) => a.achievement_id);
        const { data: achDefs } = await supabase
          .from("achievement_definitions")
          .select("id, name, description")
          .in("id", achIds);
        const defMap: Record<string, any> = {};
        for (const d of achDefs || []) defMap[(d as any).id] = d;
        for (const pa of playerAchs as any[]) {
          achievements.push({
            id: pa.achievement_id,
            name: defMap[pa.achievement_id]?.name || "Conquista",
            description: defMap[pa.achievement_id]?.description || null,
            granted_at: pa.granted_at || null,
          });
        }
      }

      // ============ Comunidades ============
      const communities: CommunityItem[] = [];
      const { data: memberships } = await supabase
        .from("community_members" as any)
        .select("community_id, joined_at")
        .eq("user_id", profId)
        .eq("status", "active")
        .order("joined_at", { ascending: false });
      if (memberships && (memberships as any[]).length > 0) {
        const cIds = (memberships as any[]).map((m) => m.community_id);
        const { data: comms } = await supabase
          .from("communities" as any)
          .select("id, slug, name, logo_url")
          .in("id", cIds);
        const cMap: Record<string, any> = {};
        for (const c of (comms || []) as any[]) cMap[c.id] = c;
        for (const m of memberships as any[]) {
          if (cMap[m.community_id]) {
            communities.push({
              ...cMap[m.community_id],
              joined_at: m.joined_at,
            });
          }
        }
      }

      // ============ Amigos ============
      const { count: fCount } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${profId},friend_id.eq.${profId}`)
        .eq("status", "accepted");

      // ============ Seasons ============
      const seasons: SeasonContext[] = [];
      const { data: playerRatings } = await supabase
        .from("mmr_ratings")
        .select("season_id, current_mmr")
        .eq("player_id", profId);
      if (playerRatings && playerRatings.length > 0) {
        const seasonIds = [...new Set((playerRatings as any[]).map((r) => r.season_id))];
        const { data: seasonsData } = await supabase
          .from("seasons")
          .select("id, name, status, end_date, start_date, type")
          .in("id", seasonIds)
          .eq("type", "boardgame" as any)
          .order("start_date", { ascending: false });
        for (const s of (seasonsData || []) as any[]) {
          const { data: allRatings } = await supabase
            .from("mmr_ratings")
            .select("player_id, current_mmr")
            .eq("season_id", s.id)
            .order("current_mmr", { ascending: false });
          if (!allRatings || (allRatings as any[]).length === 0) continue;
          const idx = (allRatings as any[]).findIndex((r) => r.player_id === profId);
          if (idx < 0) continue;
          const mmrs = (allRatings as any[]).map((r) => Number(r.current_mmr));
          seasons.push({
            id: s.id,
            name: s.name,
            status: s.status,
            end_date: s.end_date,
            position: idx + 1,
            total: (allRatings as any[]).length,
            current_mmr: Number((allRatings as any[])[idx].current_mmr),
            min_mmr: Math.min(...mmrs),
            max_mmr: Math.max(...mmrs),
          });
        }
        seasons.sort((a, b) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (b.status === "active" && a.status !== "active") return 1;
          return 0;
        });
      }

      // ============ BotC ============
      const botc: ProfileBotcStats = {
        gamesPlayed: 0,
        winsGood: 0,
        winsEvil: 0,
        storytellerGames: 0,
        goodPlayed: 0,
        evilPlayed: 0,
        characters: [],
        partners: [],
      };
      const { data: botcRatings } = await supabase
        .from("blood_mmr_ratings")
        .select("games_played, wins_good, wins_evil, games_as_storyteller")
        .eq("player_id", profId);
      if (botcRatings && (botcRatings as any[]).length > 0) {
        for (const r of botcRatings as any[]) {
          botc.gamesPlayed += r.games_played;
          botc.winsGood += r.wins_good;
          botc.winsEvil += r.wins_evil;
          botc.storytellerGames += r.games_as_storyteller;
        }
      }

      const { data: botcMatchPlayers } = await supabase
        .from("blood_match_players")
        .select("match_id, player_id, character_id, team")
        .eq("player_id", profId);
      if (botcMatchPlayers && (botcMatchPlayers as any[]).length > 0) {
        const ids = [...new Set((botcMatchPlayers as any[]).map((bp) => bp.match_id))];
        const { data: botcMatches } = await supabase
          .from("blood_matches")
          .select("id, winning_team")
          .in("id", ids);
        const winMap: Record<string, string> = {};
        for (const bm of botcMatches || []) winMap[(bm as any).id] = (bm as any).winning_team;

        for (const bp of botcMatchPlayers as any[]) {
          if (bp.team === "good") botc.goodPlayed++;
          else if (bp.team === "evil") botc.evilPlayed++;
        }

        const { data: allBotcPlayers } = await supabase
          .from("blood_match_players")
          .select("match_id, player_id, team")
          .in("match_id", ids);

        const partnerMap: Record<
          string,
          { goodGames: number; evilGames: number; goodWins: number; evilWins: number }
        > = {};
        for (const bp of allBotcPlayers || []) {
          if ((bp as any).player_id === profId) continue;
          const my = (botcMatchPlayers as any[]).find((m) => m.match_id === (bp as any).match_id);
          if (!my) continue;
          const pid = (bp as any).player_id;
          if (!partnerMap[pid])
            partnerMap[pid] = { goodGames: 0, evilGames: 0, goodWins: 0, evilWins: 0 };
          const won = winMap[(bp as any).match_id] === my.team;
          if (my.team === "good") {
            partnerMap[pid].goodGames++;
            if (won) partnerMap[pid].goodWins++;
          } else {
            partnerMap[pid].evilGames++;
            if (won) partnerMap[pid].evilWins++;
          }
        }
        const partnerIds = Object.keys(partnerMap);
        if (partnerIds.length > 0) {
          const { data: partnerProfs } = await supabase
            .from("profiles")
            .select("id, name, nickname, avatar_url")
            .in("id", partnerIds);
          const pMap: Record<string, any> = {};
          for (const p of partnerProfs || []) pMap[(p as any).id] = p;
          botc.partners = Object.entries(partnerMap)
            .map(([pid, s]) => ({
              id: pid,
              name: pMap[pid]?.name || "?",
              nickname: pMap[pid]?.nickname || null,
              avatar_url: pMap[pid]?.avatar_url || null,
              ...s,
            }))
            .sort(
              (a, b) => b.goodGames + b.evilGames - (a.goodGames + a.evilGames),
            )
            .slice(0, 8);
        }

        const charIds = [...new Set((botcMatchPlayers as any[]).map((bp) => bp.character_id))];
        const { data: charDefs } = await supabase
          .from("blood_characters")
          .select("id, name, team")
          .in("id", charIds);
        const charMap: Record<string, any> = {};
        for (const c of charDefs || []) charMap[(c as any).id] = c;
        const charPerf: Record<string, { games: number; wins: number }> = {};
        for (const bp of botcMatchPlayers as any[]) {
          if (!charPerf[bp.character_id]) charPerf[bp.character_id] = { games: 0, wins: 0 };
          charPerf[bp.character_id].games++;
          if (winMap[bp.match_id] === bp.team) charPerf[bp.character_id].wins++;
        }
        botc.characters = Object.entries(charPerf)
          .map(([cid, s]) => ({
            id: cid,
            name: charMap[cid]?.name || "?",
            team: charMap[cid]?.team || null,
            games: s.games,
            wins: s.wins,
          }))
          .sort((a, b) => b.games - a.games);
      }

      // ============ Derivados ============
      // Mestre: tem campanha ativa como master
      const { data: activeAsMaster } = await supabase
        .from("rpg_campaigns")
        .select("id")
        .eq("master_id", profId)
        .eq("status", "active")
        .limit(1);
      const isMaster = !!(activeAsMaster && (activeAsMaster as any[]).length > 0);
      const isStoryteller = botc.storytellerGames >= 3;

      const mainCommunity = communities[0] || null;

      return {
        profile,
        role,
        isMaster,
        isStoryteller,
        boardgame,
        botc,
        seasons,
        recentMatches,
        lastMatchDate,
        upcomingRooms,
        achievements,
        communities,
        mainCommunity,
        friendsCount: fCount || 0,
      };
    },
  });
