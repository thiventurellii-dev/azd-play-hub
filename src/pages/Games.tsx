import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Video, Users, Calendar, Clock } from 'lucide-react';
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

interface BloodScript {
  id: string;
  name: string;
  description: string | null;
}

interface BloodCharacter {
  id: string;
  script_id: string;
  name: string;
  name_en: string;
  team: 'good' | 'evil';
  role_type: 'townsfolk' | 'outsider' | 'minion' | 'demon';
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
  const [avgDurations, setAvgDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [bloodScripts, setBloodScripts] = useState<BloodScript[]>([]);
  const [bloodCharacters, setBloodCharacters] = useState<BloodCharacter[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [gamesRes, sgRes, matchesRes] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('season_games').select('game_id, season_id'),
        supabase.from('matches').select('game_id, duration_minutes'),
      ]);

      const gamesData = gamesRes.data || [];
      setGames(gamesData);

      const sgData = sgRes.data || [];
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

      const matchesData = matchesRes.data || [];
      const durMap: Record<string, { total: number; count: number }> = {};
      for (const m of matchesData) {
        if (m.duration_minutes) {
          if (!durMap[m.game_id]) durMap[m.game_id] = { total: 0, count: 0 };
          durMap[m.game_id].total += m.duration_minutes;
          durMap[m.game_id].count += 1;
        }
      }
      const avgMap: Record<string, number> = {};
      for (const [gid, d] of Object.entries(durMap)) {
        avgMap[gid] = Math.round(d.total / d.count);
      }
      setAvgDurations(avgMap);

      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="container py-10">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Jogos</h1>
      </div>
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
            const avgDur = avgDurations[g.id];
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="bg-card border-border hover:border-gold/20 transition-colors h-full flex flex-col cursor-pointer"
                  onClick={() => setSelectedGame(g)}
                >
                  <CardContent className="py-5 space-y-4 flex-1 flex flex-col">
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
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {(g.min_players || g.max_players) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-4 w-4" /> {g.min_players || '?'}–{g.max_players || '?'}
                            </p>
                          )}
                          {avgDur && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-4 w-4" /> ~{avgDur} min
                            </p>
                          )}
                        </div>
                        {/* Links on card */}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {g.rules_url && (
                            <a href={g.rules_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                              <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1 py-1 px-2 text-xs">
                                <ExternalLink className="h-3 w-3" /> Regras
                              </Badge>
                            </a>
                          )}
                          {g.video_url && (
                            <a href={g.video_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                              <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1 py-1 px-2 text-xs">
                                <Video className="h-3 w-3" /> Vídeo
                              </Badge>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1" />

                    {seasons.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Seasons
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {seasons.map(s => (
                            <Badge key={s.season_id} className={`${statusColors[s.status] || 'bg-muted text-muted-foreground border-border'} text-xs`}>
                              {s.season_name}
                            </Badge>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedGame} onOpenChange={(open) => !open && setSelectedGame(null)}>
        {selectedGame && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedGame.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedGame.image_url && (
                <img src={selectedGame.image_url} alt={selectedGame.name} className="w-full h-48 object-cover rounded-lg" />
              )}
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                {(selectedGame.min_players || selectedGame.max_players) && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {selectedGame.min_players || '?'}–{selectedGame.max_players || '?'} jogadores
                  </span>
                )}
                {avgDurations[selectedGame.id] && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Média: ~{avgDurations[selectedGame.id]} min
                  </span>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                {selectedGame.rules_url && (
                  <a href={selectedGame.rules_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1.5 px-3">
                      <ExternalLink className="h-3.5 w-3.5" /> Regras
                    </Badge>
                  </a>
                )}
                {selectedGame.video_url && (
                  <a href={selectedGame.video_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1.5 px-3">
                      <Video className="h-3.5 w-3.5" /> Vídeo Explicativo
                    </Badge>
                  </a>
                )}
              </div>
              {(gameSeasons[selectedGame.id] || []).length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Seasons</p>
                  <div className="flex gap-2 flex-wrap">
                    {(gameSeasons[selectedGame.id] || []).map(s => (
                      <Link key={s.season_id} to={`/seasons/${s.season_id}`} onClick={() => setSelectedGame(null)}>
                        <Badge className={`${statusColors[s.status]} cursor-pointer text-xs`}>
                          {s.season_name} — {statusLabels[s.status]}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Games;
