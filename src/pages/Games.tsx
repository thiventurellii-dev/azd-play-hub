import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Video, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Game {
  id: string;
  name: string;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

interface SeasonLink {
  season_id: string;
  season_name: string;
  status: string;
}

const statusLabels: Record<string, string> = { active: 'Ativa', upcoming: 'Em breve', finished: 'Finalizada' };
const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finished: 'bg-muted text-muted-foreground border-border',
};

const Games = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [gameSeasons, setGameSeasons] = useState<Record<string, SeasonLink[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [gamesRes, sgRes] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('season_games').select('game_id, season_id'),
      ]);

      const games = gamesRes.data || [];
      const sgData = sgRes.data || [];
      setGames(games);

      if (sgData.length > 0) {
        const seasonIds = [...new Set(sgData.map(sg => sg.season_id))];
        const { data: seasons } = await supabase.from('seasons').select('id, name, status').in('id', seasonIds);
        const seasonMap: Record<string, { name: string; status: string }> = {};
        for (const s of (seasons || [])) seasonMap[s.id] = { name: s.name, status: s.status };

        const map: Record<string, SeasonLink[]> = {};
        for (const sg of sgData) {
          const s = seasonMap[sg.season_id];
          if (!s) continue;
          if (!map[sg.game_id]) map[sg.game_id] = [];
          map[sg.game_id].push({ season_id: sg.season_id, season_name: s.name, status: s.status });
        }
        setGameSeasons(map);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Jogos</h1>
      <p className="text-muted-foreground mb-8">Biblioteca de jogos da comunidade AzD</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : games.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum jogo cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {games.map((g, i) => {
            const seasons = gameSeasons[g.id] || [];
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full">
                  <CardContent className="py-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold text-2xl flex-shrink-0">
                          {g.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold">{g.name}</h3>
                        {(g.min_players || g.max_players) && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="h-4 w-4" /> {g.min_players || '?'}–{g.max_players || '?'} jogadores
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex gap-2 flex-wrap">
                      {g.rules_url && (
                        <a href={g.rules_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1">
                            <ExternalLink className="h-3.5 w-3.5" /> Regras
                          </Badge>
                        </a>
                      )}
                      {g.video_url && (
                        <a href={g.video_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1">
                            <Video className="h-3.5 w-3.5" /> Vídeo Explicativo
                          </Badge>
                        </a>
                      )}
                      {!g.rules_url && !g.video_url && (
                        <p className="text-xs text-muted-foreground italic">Nenhum link disponível.</p>
                      )}
                    </div>

                    {/* Seasons */}
                    {seasons.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Seasons
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {seasons.map(s => (
                            <Link key={s.season_id} to={`/seasons/${s.season_id}`}>
                              <Badge className={`${statusColors[s.status] || 'bg-muted text-muted-foreground border-border'} cursor-pointer text-xs`}>
                                {s.season_name} — {statusLabels[s.status] || s.status}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {seasons.length === 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground italic">Não vinculado a nenhuma season.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Games;
