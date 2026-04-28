// ========== Shared types for Rankings, Seasons, Matches ==========

export interface RankingEntry {
  player_id: string;
  current_mmr: number;
  games_played: number;
  wins: number;
  player_name: string;
  avatar_url?: string | null;
}

export interface BloodRankingEntry {
  player_id: string;
  total_points: number;
  games_played: number;
  wins_evil: number;
  wins_good: number;
  games_as_storyteller: number;
  player_name: string;
  avatar_url?: string | null;
}

export interface GameInfoLite {
  id: string;
  name: string;
  factions?: any;
}

export interface SeasonBase {
  id: string;
  name: string;
  status: string;
  type: "boardgame" | "blood";
}

export interface SeasonFull extends SeasonBase {
  description: string | null;
  start_date: string;
  end_date: string;
  prize: string;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  prize_4th_6th: number;
  prize_7th_10th: number;
}

export interface MatchRecord {
  id: string;
  played_at: string;
  duration_minutes: number | null;
  image_url: string | null;
  first_player_id: string | null;
  game_name: string;
  game_id: string;
  results: MatchResultEntry[];
}

export interface MatchResultEntry {
  player_name: string;
  player_id: string;
  position: number;
  seat_position?: number | null;
  score: number;
  mmr_change: number;
  mmr_before: number;
  mmr_after: number;
}

export interface BloodMatchRecord {
  id: string;
  played_at: string;
  duration_minutes: number | null;
  script_name: string;
  winning_team: string;
  storyteller_name: string;
  players: BloodMatchPlayer[];
}

export interface BloodMatchPlayer {
  player_name: string;
  character_name: string;
  team: string;
}

export interface GameInfo {
  id: string;
  name: string;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
}
