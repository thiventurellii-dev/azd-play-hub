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
}

export interface SocialLink {
  name: string;
  url: string;
}
