import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

interface RankingEntry {
  player_id: string;
  current_mmr: number;
  games_played: number;
  wins: number;
  player_name: string;
}

interface Season {
  id: string;
  name: string;
  status: string;
}

const getRankIcon = (pos: number) => {
  if (pos === 0) return <Trophy className="h-6 w-6 text-gold" />;
  if (pos === 1) return <Medal className="h-6 w-6 text-gray-400" />;
  if (pos === 2) return <Medal className="h-6 w-6 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{pos + 1}</span>;
};

const Rankings = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      if (data && data.length > 0) {
        setSeasons(data);
        const active = data.find(s => s.status === 'active');
        setSelectedSeason(active?.id || data[0].id);
      }
      setLoading(false);
    };
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    const fetchRankings = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('mmr_ratings')
        .select('player_id, current_mmr, games_played, wins, profiles(name)')
        .eq('season_id', selectedSeason)
        .order('current_mmr', { ascending: false });

      if (data) {
        setRankings(data.map((r: any) => ({
          ...r,
          player_name: r.profiles?.name || 'Unknown',
        })));
      }
      setLoading(false);
    };
    fetchRankings();
  }, [selectedSeason]);

  return (
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">Classificação por MMR da season atual</p>
        </div>
        {seasons.length > 0 && (
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : rankings.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum ranking disponível para esta season.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rankings.map((r, i) => (
            <motion.div
              key={r.player_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`bg-card border-border hover:border-gold/20 transition-colors ${i < 3 ? 'border-gold/30 glow-gold' : ''}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center w-10">{getRankIcon(i)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.player_name}</p>
                    <p className="text-xs text-muted-foreground">{r.games_played} jogos • {r.wins} vitórias</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gold">{r.current_mmr}</p>
                    <p className="text-xs text-muted-foreground">MMR</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rankings;
