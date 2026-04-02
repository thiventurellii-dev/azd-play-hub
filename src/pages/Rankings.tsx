import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

interface RankingEntry {
  player_id: string;
  current_mmr: number;
  games_played: number;
  wins: number;
  player_name: string;
}

interface BloodRankingEntry {
  player_id: string;
  total_points: number;
  games_played: number;
  wins_evil: number;
  wins_good: number;
  games_as_storyteller: number;
  player_name: string;
}

interface Season {
  id: string;
  name: string;
  status: string;
  type: 'boardgame' | 'blood';
}

const getRankIcon = (pos: number) => {
  if (pos === 0) return <Trophy className="h-6 w-6 text-gold" />;
  if (pos === 1) return <Medal className="h-6 w-6 text-gray-400" />;
  if (pos === 2) return <Medal className="h-6 w-6 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{pos + 1}</span>;
};

const getBloodPrizeClass = (pos: number) => {
  if (pos <= 2) return 'border-gold/30 glow-gold';
  if (pos <= 5) return 'border-gray-400/30';
  if (pos <= 9) return 'border-amber-700/30';
  return '';
};

const Rankings = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [bloodRankings, setBloodRankings] = useState<BloodRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('boardgame');

  const filteredSeasons = seasons.filter(s => s.type === activeTab);

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      if (data && data.length > 0) {
        const mapped = data.map(s => ({ ...s, type: (s as any).type || 'boardgame' })) as Season[];
        setSeasons(mapped);
        const active = mapped.find(s => s.status === 'active' && s.type === 'boardgame');
        setSelectedSeason(active?.id || mapped.filter(s => s.type === 'boardgame')[0]?.id || mapped[0].id);
      }
      setLoading(false);
    };
    fetchSeasons();
  }, []);

  // When tab changes, reset to first season of that type
  useEffect(() => {
    const filtered = seasons.filter(s => s.type === activeTab);
    if (filtered.length > 0) {
      const active = filtered.find(s => s.status === 'active');
      setSelectedSeason(active?.id || filtered[0].id);
    } else {
      setSelectedSeason('');
    }
  }, [activeTab, seasons]);

  useEffect(() => {
    if (!selectedSeason) return;
    const season = seasons.find(s => s.id === selectedSeason);
    if (!season) return;

    const fetchRankings = async () => {
      setLoading(true);
      if (season.type === 'blood') {
        const { data } = await supabase
          .from('blood_mmr_ratings')
          .select('*')
          .eq('season_id', selectedSeason)
          .order('total_points', { ascending: false });
        if (data && data.length > 0) {
          const playerIds = (data as any[]).map(r => r.player_id);
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
          const pMap: Record<string, string> = {};
          for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;
          setBloodRankings((data as any[]).map(r => ({ ...r, player_name: pMap[r.player_id] || '?' })));
        } else {
          setBloodRankings([]);
        }
        setRankings([]);
      } else {
        const { data } = await supabase
          .from('mmr_ratings')
          .select('player_id, current_mmr, games_played, wins, profiles(name, nickname)')
          .eq('season_id', selectedSeason)
          .order('current_mmr', { ascending: false });
        if (data) {
          setRankings(data.map((r: any) => ({
            ...r,
            player_name: r.profiles?.nickname || r.profiles?.name || 'Unknown',
          })));
        } else {
          setRankings([]);
        }
        setBloodRankings([]);
      }
      setLoading(false);
    };
    fetchRankings();
  }, [selectedSeason, seasons]);

  const currentSeason = seasons.find(s => s.id === selectedSeason);

  return (
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">Classificação por season</p>
        </div>
        {filteredSeasons.length > 0 && (
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {filteredSeasons.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
          <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
        </TabsList>

        <TabsContent value="boardgame">
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
                <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`bg-card border-border hover:border-gold/20 transition-colors ${i < 3 ? 'border-gold/30 glow-gold' : ''}`}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex items-center justify-center w-10">{getRankIcon(i)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{r.player_name}</p>
                        <p className="text-xs text-muted-foreground">{r.games_played} jogos • {r.wins} vitórias</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gold">{Number(r.current_mmr).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">MMR</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blood">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : bloodRankings.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum ranking disponível para esta season.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bloodRankings.map((r, i) => {
                const gamesNotSt = r.games_played - r.games_as_storyteller;
                const totalWins = r.wins_evil + r.wins_good;
                const winPct = gamesNotSt > 0 ? Math.round((totalWins / gamesNotSt) * 100) : 0;
                return (
                  <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className={`bg-card border-border hover:border-gold/20 transition-colors ${getBloodPrizeClass(i)}`}>
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex items-center justify-center w-10">{getRankIcon(i)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{r.player_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.games_played} jogos • <span className="text-red-400">{r.wins_evil}V mal</span> • <span className="text-blue-400">{r.wins_good}V bem</span> • {winPct}% vitórias
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gold">{r.total_points}</p>
                          <p className="text-xs text-muted-foreground">Pontos</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;
