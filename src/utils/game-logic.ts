import { Trophy, Medal } from "lucide-react";
import { createElement } from "react";
import type { BloodRankingEntry } from "@/types/database";

/**
 * Returns a rank icon (Trophy/Medal) or number for a given 0-indexed position.
 */
export const getRankIcon = (pos: number) => {
  if (pos === 0) return createElement(Trophy, { className: "h-5 w-5 text-gold" });
  if (pos === 1) return createElement(Medal, { className: "h-5 w-5 text-gray-400" });
  if (pos === 2) return createElement(Medal, { className: "h-5 w-5 text-amber-700" });
  return createElement("span", {
    className: "text-sm font-bold text-muted-foreground w-5 text-center",
    children: pos + 1,
  });
};

/**
 * Returns border CSS class based on Blood prize tiers (0-indexed).
 */
export const getBloodPrizeClass = (pos: number): string => {
  if (pos <= 2) return "border-gold/30";
  if (pos <= 5) return "border-gray-400/30";
  if (pos <= 9) return "border-amber-700/30";
  return "";
};

/**
 * Returns border class for boardgame ranking (top 3 get gold).
 */
export const getBoardgamePrizeClass = (pos: number): string => {
  return pos < 3 ? "border-gold/30" : "";
};

/**
 * Calculates blood ranking derived stats.
 */
export const getBloodWinStats = (r: BloodRankingEntry) => {
  const gamesNotSt = r.games_played - r.games_as_storyteller;
  const totalWins = r.wins_evil + r.wins_good;
  const winPct = gamesNotSt > 0 ? Math.round((totalWins / gamesNotSt) * 100) : 0;
  return { gamesNotSt, totalWins, winPct };
};

/**
 * Calculates win rate percentage.
 */
export const getWinRate = (wins: number, gamesPlayed: number): number => {
  return gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
};

/**
 * Determines if a blood player won based on their team and the winning team.
 */
export const didBloodPlayerWin = (playerTeam: string, winningTeam: string): boolean => {
  return playerTeam === winningTeam;
};

/**
 * Formats MMR for display.
 */
export const formatMmr = (mmr: number): string => {
  return Number(mmr).toFixed(2);
};
