import type { SeasonItem } from "@/hooks/useSeasonsData";

// Curated palette shared between the timeline bars and season cards/badges
export const SEASON_PALETTE: Array<[number, number, number]> = [
  [245, 180, 0],   // #F5B400 amarelo
  [139, 92, 246],  // #8B5CF6 roxo suave
  [34, 197, 94],   // #22C55E verde
  [59, 130, 246],  // #3B82F6 azul dessaturado
];

export const rgba = ([r, g, b]: [number, number, number], a: number) =>
  `rgba(${r}, ${g}, ${b}, ${a})`;

export const colorForIndex = (idx: number): [number, number, number] =>
  SEASON_PALETTE[idx % SEASON_PALETTE.length];

/**
 * Build a stable color-index map for a list of seasons, sorted by start_date
 * (matching the timeline's assignment order).
 */
export const buildSeasonColorMap = (seasons: SeasonItem[]): Record<string, number> => {
  const sorted = [...seasons].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const map: Record<string, number> = {};
  sorted.forEach((s, i) => {
    map[s.id] = i;
  });
  return map;
};
