import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { getRankIcon, getBloodPrizeClass, getBoardgamePrizeClass, getBloodWinStats, getWinRate, formatMmr } from "@/utils/game-logic";
import type { RankingEntry, BloodRankingEntry } from "@/types/database";

interface BoardgameRankingCardProps {
  entry: RankingEntry;
  index: number;
  linkToProfile?: boolean;
}

export const BoardgameRankingCard = ({ entry, index, linkToProfile = true }: BoardgameRankingCardProps) => {
  const playerEl = linkToProfile ? (
    <Link to={`/perfil/${entry.player_name}`} className="hover:text-gold transition-colors">
      {entry.player_name}
    </Link>
  ) : (
    entry.player_name
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`bg-card border-border hover:border-gold/20 transition-colors ${getBoardgamePrizeClass(index)}`}>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex items-center justify-center w-10">{getRankIcon(index)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{playerEl}</p>
            <p className="text-xs text-muted-foreground">
              {entry.games_played} jogos • {entry.wins} vitórias • {getWinRate(entry.wins, entry.games_played)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gold">{formatMmr(entry.current_mmr)}</p>
            <p className="text-xs text-muted-foreground">MMR</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface BloodRankingCardProps {
  entry: BloodRankingEntry;
  index: number;
  linkToProfile?: boolean;
}

export const BloodRankingCard = ({ entry, index, linkToProfile = true }: BloodRankingCardProps) => {
  const { winPct } = getBloodWinStats(entry);

  const playerEl = linkToProfile ? (
    <Link to={`/perfil/${entry.player_name}`} className="hover:text-gold transition-colors">
      {entry.player_name}
    </Link>
  ) : (
    entry.player_name
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`bg-card border-border hover:border-gold/20 transition-colors ${getBloodPrizeClass(index)}`}>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex items-center justify-center w-10">{getRankIcon(index)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{playerEl}</p>
            <p className="text-xs text-muted-foreground">
              {entry.games_played} jogos • <span className="text-red-400">{entry.wins_evil}V mal</span> •{" "}
              <span className="text-blue-400">{entry.wins_good}V bem</span> • {winPct}% vitórias
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gold">{entry.total_points}</p>
            <p className="text-xs text-muted-foreground">Pontos</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface EmptyRankingProps {
  message?: string;
}

export const EmptyRanking = ({ message = "Nenhum ranking disponível para esta season." }: EmptyRankingProps) => (
  <Card className="bg-card border-border">
    <CardContent className="py-12 text-center text-muted-foreground">{message}</CardContent>
  </Card>
);
