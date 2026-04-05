import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import FriendButton from '@/components/friendlist/FriendButton';

interface Player {
  id: string;
  name: string;
  nickname: string;
  city: string;
  state: string;
  created_at: string;
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase.from('profiles').select('id, name, nickname, city, state, created_at').order('name');
      setPlayers((data || []).map(p => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname || '',
        city: p.city || '',
        state: p.state || '',
        created_at: p.created_at,
      })));
      setLoading(false);
    };
    fetchPlayers();
  }, []);

  return (
    <div className="container py-10">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Jogadores</h1>
      </div>
      <p className="text-muted-foreground mb-8">Membros da comunidade AzD</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={p.nickname ? `/perfil/${p.nickname}` : '#'}>
              <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full">
                <CardContent className="flex items-center gap-4 py-4 h-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-gold font-bold text-lg flex-shrink-0">
                    {(p.nickname || p.name)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.name}</p>
                    {p.nickname && <p className="text-xs text-gold truncate">@{p.nickname}</p>}
                    {(p.city || p.state) && <p className="text-xs text-muted-foreground truncate">{[p.city, p.state].filter(Boolean).join(', ')}</p>}
                    <p className="text-xs text-muted-foreground">Desde {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <FriendButton targetUserId={p.id} />
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

export default Players;
