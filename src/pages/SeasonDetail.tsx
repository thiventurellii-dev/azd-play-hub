import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Calendar, Clock, Users, ExternalLink, Video, Image } from 'lucide-react';
import { motion } from 'framer-motion';

interface Season {
  id: string; name: string; description: string | null; start_date: string; end_date: string; status: string;
}

interface RankingEntry {
  player_id: string; current_mmr: number; games_played: number; wins: number; player_name: string;
}

interface MatchRecord {
  id: string; played_at: string; duration_minutes: number | null; image_url: string | null;
  game_name: string;
  results: { player_name: string; position: number; score: number; mmr_change: number }[];
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

const SeasonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [season, setSeason] = useState<Season | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      // Season info
      const { data: sData } = await supabase.from('seasons').select('*').eq('id', id).single();
      setSeason(sData);

      // Rankings
      const { data: rData } = await supabase
        .from('mmr_ratings')
        .select('player_id, current_mmr, games_played, wins')
        .eq('season_id', id)
        .order('current_mmr', { ascending: false });

      if (rData && rData.length > 0) {
        const playerIds = rData.map(r => r.player_id);
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', playerIds);
        const pMap: Record<string, string> = {};
        for (const p of (profiles || [])) pMap[p.id] = p.name;
        setRankings(rData.map(r => ({ ...r, player_name: pMap[r.player_id] || 'Unknown' })));
      }

      // Season games
      const { data: sgData } = await supabase.from('season_games').select('game_id').eq('season_id', id);
      const gameIds = (sgData || []).map(sg => sg.game_id);
      if (gameIds.length > 0) {
        const { data: gData } = await supabase.from('games').select('*').in('id', gameIds).order('name');
        setGames(gData || []);
      }

      // Matches
      const { data: mData } = await supabase
        .from('matches')
        .select('id, played_at, duration_minutes, image_url, game_id')
        .eq('season_id', id)
        .order('played_at', { ascending: false })
        .limit(50);

      if (mData && mData.length > 0) {
        const matchIds = mData.map(m => m.id);
        const gameIdsMatch = [...new Set(mData.map(m => m.game_id))];
        const [resRes, gamesRes] = await Promise.all([
          supabase.from('match_results').select('match_id, player_id, position, score, mmr_change').in('match_id', matchIds),
          supabase.from('games').select('id, name').in('id', gameIdsMatch),
        ]);
        const gameMap: Record<string, string> = {};
        for (const g of (gamesRes.data || [])) gameMap[g.id] = g.name;

        const playerIds = [...new Set((resRes.data || []).map(r => r.player_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', playerIds);
        const pMap: Record<string, string> = {};
        for (const p of (profiles || [])) pMap[p.id] = p.name;

        setMatches(mData.map(m => ({
          id: m.id,
          played_at: m.played_at,
          duration_minutes: m.duration_minutes,
          image_url: m.image_url,
          game_name: gameMap[m.game_id] || '?',
          results: (resRes.data || [])
            .filter(r => r.match_id === m.id)
            .sort((a, b) => a.position - b.position)
            .map(r => ({
              player_name: pMap[r.player_id] || '?',
              position: r.position,
              score: r.score || 0,
              mmr_change: r.mmr_change || 0,
            })),
        })));
      }

      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="container py-10 text-center text-muted-foreground">Season não encontrada.</div>
    );
  }

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/seasons" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">← Voltar para Seasons</Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{season.name}</h1>
          <Badge className={statusColors[season.status]}>{statusLabels[season.status]}</Badge>
        </div>
        {season.description && <p className="text-muted-foreground mt-2">{season.description}</p>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Calendar className="h-4 w-4" />
          <span>{new Date(season.start_date).toLocaleDateString('pt-BR')} — {new Date(season.end_date).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="matches">Partidas</TabsTrigger>
          <TabsTrigger value="games">Jogos</TabsTrigger>
        </TabsList>

        {/* Ranking Tab */}
        <TabsContent value="ranking">
          {rankings.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">Nenhum ranking disponível ainda.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rankings.map((r, i) => (
                <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`bg-card border-border hover:border-gold/20 transition-colors ${i < 3 ? 'border-gold/30' : ''}`}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex items-center justify-center w-8">{getRankIcon(i)}</div>
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
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches">
          {matches.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">Nenhuma partida registrada.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {matches.map(m => (
                <Card key={m.id} className="bg-card border-border">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{m.game_name}</Badge>
                        {m.duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {m.duration_minutes} min
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {m.image_url && (
                          <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <Image className="h-4 w-4" />
                          </a>
                        )}
                        <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {m.results.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <Badge variant={r.position === 1 ? 'default' : 'secondary'} className={`w-8 justify-center ${r.position === 1 ? 'bg-gold text-black' : ''}`}>
                            {r.position}º
                          </Badge>
                          <span className="flex-1 font-medium">{r.player_name}</span>
                          <span className="text-muted-foreground">{r.score} pts</span>
                          <span className={`text-xs font-medium ${r.mmr_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {r.mmr_change >= 0 ? '+' : ''}{r.mmr_change}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Games Tab */}
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
                        <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center text-gold font-bold text-lg">
                          {g.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{g.name}</p>
                        {(g.min_players || g.max_players) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {g.min_players || '?'}–{g.max_players || '?'} jogadores
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {g.rules_url && (
                        <a href={g.rules_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1">
                            <ExternalLink className="h-3 w-3" /> Regras
                          </Badge>
                        </a>
                      )}
                      {g.video_url && (
                        <a href={g.video_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1">
                            <Video className="h-3 w-3" /> Vídeo
                          </Badge>
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
    </div>
  );
};

export default SeasonDetail;
