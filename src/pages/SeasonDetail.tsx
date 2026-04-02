import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Calendar, Clock, Users, ExternalLink, Video, Award, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

interface Season {
  id: string; name: string; description: string | null; start_date: string; end_date: string; status: string; prize: string; type: 'boardgame' | 'blood';
  prize_1st: number; prize_2nd: number; prize_3rd: number; prize_4th_6th: number; prize_7th_10th: number;
}

interface RankingEntry {
  player_id: string; current_mmr: number; games_played: number; wins: number; player_name: string;
}

interface BloodRankingEntry {
  player_id: string; total_points: number; games_played: number; wins_evil: number; wins_good: number; games_as_storyteller: number; player_name: string;
}

interface MatchRecord {
  id: string; played_at: string; duration_minutes: number | null; image_url: string | null; first_player_id: string | null;
  game_name: string; game_id: string;
  results: { player_name: string; player_id: string; position: number; score: number; mmr_change: number; mmr_before: number; mmr_after: number }[];
}

interface BloodMatchRecord {
  id: string; played_at: string; duration_minutes: number | null;
  script_name: string; winning_team: string; storyteller_name: string;
  players: { player_name: string; character_name: string; team: string }[];
}

interface GameInfo {
  id: string; name: string; image_url: string | null; rules_url: string | null; video_url: string | null;
  min_players: number | null; max_players: number | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finished: 'bg-muted text-muted-foreground border-border',
};
const statusLabels: Record<string, string> = { active: 'Ativa', upcoming: 'Em breve', finished: 'Finalizada' };

const getRankIcon = (pos: number) => {
  if (pos === 0) return <Trophy className="h-5 w-5 text-gold" />;
  if (pos === 1) return <Medal className="h-5 w-5 text-gray-400" />;
  if (pos === 2) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{pos + 1}</span>;
};

const MatchImage = ({ src }: { src: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <img src={src} alt="Partida" className={`w-full object-cover cursor-pointer transition-all duration-300 ${expanded ? 'max-h-[600px]' : 'h-48'}`} onClick={() => setExpanded(!expanded)} />
      {!expanded && (
        <button onClick={() => setExpanded(true)} className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 transition-colors">
          Expandir imagem
        </button>
      )}
    </div>
  );
};

const getBloodPrizeClass = (pos: number) => {
  if (pos <= 2) return 'border-gold/30 bg-card';
  if (pos <= 5) return 'border-gray-400/30 bg-card';
  if (pos <= 9) return 'border-amber-700/30 bg-card';
  return 'bg-card';
};

const SeasonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [season, setSeason] = useState<Season | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [bloodRankings, setBloodRankings] = useState<BloodRankingEntry[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [bloodMatches, setBloodMatches] = useState<BloodMatchRecord[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const { data: sData } = await supabase.from('seasons').select('*').eq('id', id).single();
      const seasonData: Season | null = sData ? { ...sData, prize: (sData as any).prize || '', type: (sData as any).type || 'boardgame' } : null;
      setSeason(seasonData);

      if (seasonData?.type === 'blood') {
        // Blood matches
        const { data: bmData } = await supabase
          .from('blood_matches')
          .select('*')
          .eq('season_id', id)
          .order('played_at', { ascending: false })
          .limit(50);

        if (bmData && bmData.length > 0) {
          const scriptIds = [...new Set((bmData as any[]).map(m => m.script_id))];
          const matchIds = (bmData as any[]).map(m => m.id);
          const storytellerIds = [...new Set((bmData as any[]).map(m => m.storyteller_player_id))];

          const [scriptsRes, playersRes] = await Promise.all([
            supabase.from('blood_scripts').select('id, name').in('id', scriptIds),
            supabase.from('blood_match_players').select('*').in('match_id', matchIds),
          ]);

          const scriptMap: Record<string, string> = {};
          for (const s of ((scriptsRes.data || []) as any[])) scriptMap[s.id] = s.name;

          const allPlayerIds = [...new Set([
            ...storytellerIds,
            ...((playersRes.data || []) as any[]).map(p => p.player_id),
          ])];
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', allPlayerIds);
          const pMap: Record<string, string> = {};
          for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;

          const charIds = [...new Set(((playersRes.data || []) as any[]).map(p => p.character_id))];
          const { data: charsData } = charIds.length > 0
            ? await supabase.from('blood_characters').select('id, name').in('id', charIds)
            : { data: [] };
          const charMap: Record<string, string> = {};
          for (const c of ((charsData || []) as any[])) charMap[c.id] = c.name;

          setBloodMatches((bmData as any[]).map(m => ({
            id: m.id,
            played_at: m.played_at,
            duration_minutes: m.duration_minutes,
            script_name: scriptMap[m.script_id] || '?',
            winning_team: m.winning_team,
            storyteller_name: pMap[m.storyteller_player_id] || '?',
            players: ((playersRes.data || []) as any[])
              .filter(p => p.match_id === m.id)
              .map(p => ({
                player_name: pMap[p.player_id] || '?',
                character_name: charMap[p.character_id] || '?',
                team: p.team,
              })),
          })));
        }

        // Blood rankings
        const { data: brData } = await supabase
          .from('blood_mmr_ratings')
          .select('*')
          .eq('season_id', id)
          .order('total_points', { ascending: false });

        if (brData && brData.length > 0) {
          const playerIds = (brData as any[]).map(r => r.player_id);
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
          const pMap: Record<string, string> = {};
          for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;
          setBloodRankings((brData as any[]).map(r => ({ ...r, player_name: pMap[r.player_id] || '?' })));
        }
      } else {
        // Boardgame season - existing logic
        const { data: sgData } = await supabase.from('season_games').select('game_id').eq('season_id', id);
        const gameIds = (sgData || []).map(sg => sg.game_id);
        let gamesData: GameInfo[] = [];
        if (gameIds.length > 0) {
          const { data: gData } = await supabase.from('games').select('*').in('id', gameIds).order('name');
          gamesData = gData || [];
        }
        setGames(gamesData);

        const { data: mData } = await supabase
          .from('matches').select('id, played_at, duration_minutes, image_url, first_player_id, game_id')
          .eq('season_id', id).order('played_at', { ascending: false }).limit(50);

        if (mData && mData.length > 0) {
          const matchIds = mData.map(m => m.id);
          const gameIdsMatch = [...new Set(mData.map(m => m.game_id))];
          const [resRes, gamesRes] = await Promise.all([
            supabase.from('match_results').select('match_id, player_id, position, score, mmr_change, mmr_before, mmr_after').in('match_id', matchIds),
            supabase.from('games').select('id, name').in('id', gameIdsMatch),
          ]);
          const gameMap: Record<string, string> = {};
          for (const g of (gamesRes.data || [])) gameMap[g.id] = g.name;
          const playerIds = [...new Set((resRes.data || []).map(r => r.player_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
          const pMap: Record<string, string> = {};
          for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;

          setMatches(mData.map(m => ({
            id: m.id, played_at: m.played_at, duration_minutes: m.duration_minutes,
            image_url: m.image_url, first_player_id: (m as any).first_player_id || null,
            game_name: gameMap[m.game_id] || '?', game_id: m.game_id,
            results: (resRes.data || []).filter(r => r.match_id === m.id).sort((a, b) => a.position - b.position)
              .map(r => ({ player_name: pMap[r.player_id] || '?', player_id: r.player_id, position: r.position, score: r.score || 0, mmr_change: r.mmr_change || 0, mmr_before: r.mmr_before || 1000, mmr_after: r.mmr_after || 1000 })),
          })));
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  // Fetch boardgame rankings when game filter changes
  useEffect(() => {
    if (!id || !season || season.type === 'blood') return;
    const fetchRankings = async () => {
      let query = supabase.from('mmr_ratings').select('player_id, current_mmr, games_played, wins, game_id').eq('season_id', id).order('current_mmr', { ascending: false });
      if (selectedGameId !== 'all') query = query.eq('game_id', selectedGameId);
      const { data: rData } = await query;

      if (rData && rData.length > 0) {
        let aggregated: RankingEntry[];
        if (selectedGameId === 'all') {
          const agg: Record<string, { mmr: number; gp: number; wins: number }> = {};
          const gameCount: Record<string, number> = {};
          for (const r of rData) {
            if (!agg[r.player_id]) agg[r.player_id] = { mmr: 0, gp: 0, wins: 0 };
            agg[r.player_id].mmr += r.current_mmr;
            agg[r.player_id].gp += r.games_played;
            agg[r.player_id].wins += r.wins;
            gameCount[r.player_id] = (gameCount[r.player_id] || 0) + 1;
          }
          const playerIds = Object.keys(agg);
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
          const pMap: Record<string, string> = {};
          for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;
          aggregated = playerIds.map(pid => ({
            player_id: pid, current_mmr: parseFloat((agg[pid].mmr / gameCount[pid]).toFixed(2)),
            games_played: agg[pid].gp, wins: agg[pid].wins, player_name: pMap[pid] || 'Unknown',
          })).sort((a, b) => b.current_mmr - a.current_mmr);
        } else {
          const playerIds = rData.map(r => r.player_id);
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
          const pMap: Record<string, string> = {};
          for (const p of (profiles || [])) pMap[p.id] = (p as any).nickname || p.name;
          aggregated = rData.map(r => ({ ...r, player_name: pMap[r.player_id] || 'Unknown' }));
        }
        setRankings(aggregated);
      } else {
        setRankings([]);
      }
    };
    fetchRankings();
  }, [id, selectedGameId, season]);

  const filteredMatches = selectedGameId === 'all' ? matches : matches.filter(m => m.game_id === selectedGameId);

  if (loading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!season) {
    return <div className="container py-10 text-center text-muted-foreground">Season não encontrada.</div>;
  }

  const isBlood = season.type === 'blood';

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/seasons" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">← Voltar para Seasons</Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{season.name}</h1>
          <Badge variant="outline">{isBlood ? '🩸 Blood' : '🎲 Boardgame'}</Badge>
          <Badge className={statusColors[season.status]}>{statusLabels[season.status]}</Badge>
        </div>
        {season.description && <p className="text-muted-foreground mt-2">{season.description}</p>}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(season.start_date).toLocaleDateString('pt-BR')} — {new Date(season.end_date).toLocaleDateString('pt-BR')}</span>
        </div>
        {season.prize && (
          <div className="mt-3 p-3 rounded-lg border border-gold/30 bg-gold/5">
            <div className="flex items-center gap-2 text-gold text-sm font-medium mb-1"><Award className="h-4 w-4" /> Premiação</div>
            <p className="text-sm">{season.prize}</p>
          </div>
        )}
      </div>

      {isBlood ? (
        /* BLOOD SEASON */
        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="matches">Partidas</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            {bloodRankings.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">Nenhum ranking disponível ainda.</CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px_80px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>#</span><span>Jogador</span><span className="text-center">Partidas</span>
                  <span className="text-center">V. Mal</span><span className="text-center">V. Bem</span>
                  <span className="text-center">% Vitórias</span><span className="text-center">Narrador</span>
                  <span className="text-right">Pontos</span>
                </div>
                {bloodRankings.map((r, i) => {
                  const gamesNotSt = r.games_played - r.games_as_storyteller;
                  const totalWins = r.wins_evil + r.wins_good;
                  const winPct = gamesNotSt > 0 ? Math.round((totalWins / gamesNotSt) * 100) : 0;
                  return (
                    <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className={`grid grid-cols-[40px_1fr_80px_80px_80px_80px_80px_80px] gap-2 items-center px-4 py-3 rounded-lg border border-border hover:border-gold/20 transition-colors ${getBloodPrizeClass(i)}`}>
                        <div className="flex items-center justify-center">{getRankIcon(i)}</div>
                        <p className="font-semibold truncate">{r.player_name}</p>
                        <p className="text-center text-sm">{r.games_played}</p>
                        <p className="text-center text-sm text-red-400">{r.wins_evil}</p>
                        <p className="text-center text-sm text-blue-400">{r.wins_good}</p>
                        <p className="text-center text-sm">{winPct}%</p>
                        <p className="text-center text-sm text-muted-foreground">{r.games_as_storyteller}</p>
                        <p className="text-right text-lg font-bold text-gold">{r.total_points}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="matches">
            {bloodMatches.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">Nenhuma partida registrada.</CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {bloodMatches.map(m => {
                  const isExpanded = expandedMatch === m.id;
                  return (
                    <Card key={m.id} className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer" onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{m.script_name}</Badge>
                            <Badge className={m.winning_team === 'evil' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}>
                              {m.winning_team === 'evil' ? '💀 Mal' : '🛡️ Bem'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Narrador: {m.storyteller_name}</span>
                            {m.duration_minutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration_minutes} min</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="space-y-2 pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                            {m.players.map((p, i) => (
                              <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded ${p.team === 'evil' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                                <span>{p.team === 'evil' ? '💀' : '🛡️'}</span>
                                <span className="font-medium">{p.player_name}</span>
                                <span className="text-muted-foreground">— {p.character_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* BOARDGAME SEASON */
        <>
          <div className="mb-6">
            <Select value={selectedGameId} onValueChange={setSelectedGameId}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filtrar por jogo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os jogos (média)</SelectItem>
                {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="ranking" className="space-y-6">
            <TabsList>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="matches">Partidas</TabsTrigger>
              <TabsTrigger value="games">Jogos</TabsTrigger>
            </TabsList>

            <TabsContent value="ranking">
              {rankings.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center text-muted-foreground">Nenhum ranking disponível ainda.</CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>#</span><span>Jogador</span><span className="text-center">Partidas</span>
                    <span className="text-center">Vitórias</span><span className="text-center">Win Rate</span><span className="text-right">MMR</span>
                  </div>
                  {rankings.map((r, i) => (
                    <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className={`grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-2 items-center px-4 py-3 rounded-lg border border-border hover:border-gold/20 transition-colors ${i < 3 ? 'border-gold/30 bg-card' : 'bg-card'}`}>
                        <div className="flex items-center justify-center">{getRankIcon(i)}</div>
                        <p className="font-semibold truncate">{r.player_name}</p>
                        <p className="text-center text-sm">{r.games_played}</p>
                        <p className="text-center text-sm">{r.wins}</p>
                        <p className="text-center text-sm">{r.games_played > 0 ? Math.round((r.wins / r.games_played) * 100) : 0}%</p>
                        <p className="text-right text-lg font-bold text-gold">{Number(r.current_mmr).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="matches">
              {filteredMatches.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center text-muted-foreground">Nenhuma partida registrada.</CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredMatches.map(m => {
                    const isExpanded = expandedMatch === m.id;
                    const winner = m.results.find(r => r.position === 1);
                    return (
                      <Card key={m.id} className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer" onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                        <CardContent className="py-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{m.game_name}</Badge>
                              {winner && <span className="text-sm font-medium text-gold">🏆 {winner.player_name}</span>}
                              {m.duration_minutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration_minutes} min</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="space-y-4 pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                              {m.image_url && <MatchImage src={m.image_url} />}
                              <div className="space-y-2">
                                {m.results.map((r, i) => (
                                  <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-secondary/30">
                                    <Badge variant={r.position === 1 ? 'default' : 'secondary'} className={`w-8 justify-center ${r.position === 1 ? 'bg-gold text-black' : ''}`}>{r.position}º</Badge>
                                    <span className="flex-1 font-medium flex items-center gap-1">
                                      {r.player_name}
                                      {r.player_id === m.first_player_id && <Flag className="h-3.5 w-3.5 text-gold ml-1" />}
                                    </span>
                                    <span className="text-muted-foreground">{r.score} pts</span>
                                    <span className={`text-xs font-medium ${r.mmr_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {r.mmr_change >= 0 ? '+' : ''}{r.mmr_change} MMR
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="games">
              {games.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center text-muted-foreground">Nenhum jogo vinculado a esta season.</CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {games.map(g => (
                    <Card key={g.id} className="bg-card border-border hover:border-gold/20 transition-colors">
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {g.image_url ? (
                            <img src={g.image_url} alt={g.name} className="h-12 w-12 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center text-gold font-bold text-lg">{g.name.charAt(0)}</div>
                          )}
                          <div>
                            <p className="font-semibold">{g.name}</p>
                            {(g.min_players || g.max_players) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {g.min_players || '?'}–{g.max_players || '?'} jogadores</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {g.rules_url && (
                            <a href={g.rules_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1"><ExternalLink className="h-3 w-3" /> Regras</Badge>
                            </a>
                          )}
                          {g.video_url && (
                            <a href={g.video_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1"><Video className="h-3 w-3" /> Vídeo</Badge>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default SeasonDetail;
