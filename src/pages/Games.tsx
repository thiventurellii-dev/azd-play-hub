import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Video, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Game {
  id: string;
  name: string;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

const Games = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('games').select('*').order('name');
      setGames(data || []);
      setLoading(false);
    };
    fetch();
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.map((g, i) => {
            const isOpen = expandedId === g.id;
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="bg-card border-border hover:border-gold/20 transition-colors h-full cursor-pointer"
                  onClick={() => setExpandedId(isOpen ? null : g.id)}
                >
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center text-gold font-bold text-lg">
                          {g.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{g.name}</p>
                        {(g.min_players || g.max_players) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {g.min_players || '?'}–{g.max_players || '?'} jogadores
                          </p>
                        )}
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 border-t border-border space-y-3">
                            {g.image_url && (
                              <img src={g.image_url} alt={g.name} className="w-full h-40 object-cover rounded" />
                            )}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Mín. Jogadores</p>
                                <p className="font-medium">{g.min_players ?? '—'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Máx. Jogadores</p>
                                <p className="font-medium">{g.max_players ?? '—'}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {g.rules_url && (
                                <a href={g.rules_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                  <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1">
                                    <ExternalLink className="h-3 w-3" /> Regras
                                  </Badge>
                                </a>
                              )}
                              {g.video_url && (
                                <a href={g.video_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                  <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1">
                                    <Video className="h-3 w-3" /> Vídeo
                                  </Badge>
                                </a>
                              )}
                            </div>
                            {!g.rules_url && !g.video_url && (
                              <p className="text-xs text-muted-foreground">Nenhum link disponível.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
