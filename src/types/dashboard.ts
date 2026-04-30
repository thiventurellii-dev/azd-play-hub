export interface MatchData {
  id: string;
  played_at: string;
  game: { name: string } | null;
  position: number | null;
  score: number | null;
  type: "boardgame" | "blood";
  isUserMatch: boolean;
}

export interface UpcomingRoom {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  max_players: number;
  confirmed_count: number;
  game: { name: string } | null;
}

export interface TopPlayer {
  player_id: string;
  name: string;
  current_mmr: number;
  wins: number;
  games_played: number;
}

export interface ActiveSeason {
  id: string;
  name: string;
  end_date: string;
  match_count: number;
}

export interface UserRankPosition {
  position: number;
  current_mmr: number;
  mmr_change: number | null;
  position_change: number | null;
}

export interface SocialLink {
  name: string;
  url: string;
}
