import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, Users, Target, ExternalLink, Video, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameData {
  id: string; name: string; slug: string | null; image_url: string | null;
  rules_url: string | null; video_url: string | null;
  min_players: number | null; max_players: number | null;
}

const GameDetail = () => {
  const { slug } = useParams();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMatches: 0, avgScore: 0, highScore: 0, highScorePlayer: '', worstWinScore: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchGame = async () => {
      const { data } = await supabase.from('games').select('*').eq('slug', slug as string).maybeSingle();
      if (!data) { setLoading(false); return; }
      setGame(data as GameData);

      // Fetch matches for this game
      const { data: matches } = await supabase.from('matches').select('id, played_at, duration_minutes').eq('game_id', data.id).order('played_at', { ascending: false });
      const matchIds = (matches || []).map(m => m.id);

      if (matchIds.length === 0) { setLoading(false); return; }

      const { data: results } = await supabase.from('match_results').select('*').in('match_id', matchIds);
      const playerIds = [...new Set((results || []).map(r => r.player_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
      const pMap: Record<string, string> = {};
      for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;

      // Stats
      const scores = (results || []).map(r => r.score || 0);
      const winnerScores = (results || []).filter(r => r.position === 1).map(r => r.score || 0);
      const highScore = Math.max(...scores, 0);
      const highScoreResult = (results || []).find(r => (r.score || 0) === highScore);
      const worstWin = winnerScores.length > 0 ? Math.min(...winnerScores) : 0;
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      setStats({
        totalMatches: matchIds.length,
        avgScore,
        highScore,
        highScorePlayer: highScoreResult ? pMap[highScoreResult.player_id] || '?' : '—',
        worstWinScore: worstWin,
      });

      // Monthly activity (last 6 months)
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = 0;
      }
      for (const m of (matches || [])) {
        const key = m.played_at.slice(0, 7);
        if (key in months) months[key]++;
      }
      setMonthlyData(Object.entries(months).map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        count,
      })));

      // Leaderboard
      const playerStats: Record<string, { wins: number; games: number; totalScore: number; best: number }> = {};
      for (const r of (results || [])) {
        if (!playerStats[r.player_id]) playerStats[r.player_id] = { wins: 0, games: 0, totalScore: 0, best: 0 };
        playerStats[r.player_id].games++;
        playerStats[r.player_id].totalScore += r.score || 0;
        playerStats[r.player_id].best = Math.max(playerStats[r.player_id].best, r.score || 0);
        if (r.position === 1) playerStats[r.player_id].wins++;
      }
      const lb = Object.entries(playerStats)
        .map(([pid, s]) => ({
          player_id: pid,
          player_name: pMap[pid] || '?',
          wins: s.wins,
          games: s.games,
          winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
          avgScore: s.games > 0 ? Math.round(s.totalScore / s.games) : 0,
          best: s.best,
        }))
        .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);
      setLeaderboard(lb);

      // History
      const matchMap: Record<string, any> = {};
      for (const m of (matches || [])) matchMap[m.id] = m;
      const hist = (matches || []).slice(0, 20).map(m => ({
        ...m,
        results: (results || [])
          .filter(r => r.match_id === m.id)
          .sort((a, b) => a.position - b.position)
          .map(r => ({ ...r, player_name: pMap[r.player_id] || '?' })),
      }));
      setHistory(hist);

      setLoading(false);
    };
    fetchGame();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Jogo não encontrado</h1>
        <Link to="/games"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button></Link>
      </div>
    );
  }

  const chartConfig = { count: { label: 'Partidas', color: 'hsl(var(--gold))' } };

  return (
    <div className="container py-10 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {game.image_url ? (
            <img src={game.image_url} alt={game.name} className="w-full md:w-64 h-48 object-cover rounded-xl" />
          ) : (
            <div className="w-full md:w-64 h-48 rounded-xl bg-secondary flex items-center justify-center text-6xl text-gold font-bold">
              {game.name.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Jogos
            </Link>
            <h1 className="text-3xl font-bold mt-1">{game.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {(game.min_players || game.max_players) && (
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {game.min_players || '?'}–{game.max_players || '?'} jogadores</span>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {game.rules_url && (
                <a href={game.rules_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1" /> Regras</Button>
                </a>
              )}
              {game.video_url && (
                <a href={game.video_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><Video className="h-4 w-4 mr-1" /> Vídeo</Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Record cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 mx-auto text-gold mb-2" />
            <p className="text-2xl font-bold text-gold">{stats.highScore}</p>
            <p className="text-xs text-muted-foreground">Maior Pontuação</p>
            <p className="text-xs font-medium mt-1">{stats.highScorePlayer}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-gold mb-2" />
            <p className="text-2xl font-bold">{stats.avgScore}</p>
            <p className="text-xs text-muted-foreground">Pontuação Média</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto text-gold mb-2" />
            <p className="text-2xl font-bold">{stats.totalMatches}</p>
            <p className="text-xs text-muted-foreground">Total de Partidas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto text-gold mb-2" />
            <p className="text-2xl font-bold">{stats.worstWinScore}</p>
            <p className="text-xs text-muted-foreground">Pior Pontuação Ganhadora</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity chart */}
      {monthlyData.some(d => d.count > 0) && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Atividade (últimos 6 meses)</h2>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Leaderboard da Comunidade</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-center">Vitórias</TableHead>
                    <TableHead className="text-center">% Vitórias</TableHead>
                    <TableHead className="text-center">Média</TableHead>
                    <TableHead className="text-center">Recorde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((r, i) => (
                    <TableRow key={r.player_id}>
                      <TableCell>
                        <Badge variant={i < 3 ? 'default' : 'secondary'} className={i === 0 ? 'bg-gold text-black' : ''}>
                          {i + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link to={`/perfil/${r.player_name}`} className="hover:text-gold transition-colors">
                          {r.player_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">{r.wins}/{r.games}</TableCell>
                      <TableCell className="text-center">{r.winPct}%</TableCell>
                      <TableCell className="text-center">{r.avgScore}</TableCell>
                      <TableCell className="text-center font-bold text-gold">{r.best}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Histórico de Partidas</h2>
            <div className="space-y-3">
              {history.map(m => (
                <div key={m.id} className="border border-border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(m.played_at).toLocaleDateString('pt-BR')}
                    </span>
                    {m.duration_minutes && <span className="text-xs text-muted-foreground">{m.duration_minutes} min</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.results.map((r: any) => (
                      <Badge key={r.id} variant={r.position === 1 ? 'default' : 'secondary'} className={r.position === 1 ? 'bg-gold text-black' : ''}>
                        {r.position}º {r.player_name} ({r.score || 0}pts)
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GameDetail;
