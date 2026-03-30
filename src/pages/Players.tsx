import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  nickname: string;
  avatar_url: string | null;
  city: string;
  state: string;
  created_at: string;
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('*').order('name');
      setPlayers((data || []).map(p => ({
        id: p.id,
        name: p.name,
        nickname: (p as any).nickname || '',
        avatar_url: p.avatar_url,
        city: (p as any).city || '',
        state: (p as any).state || '',
        created_at: p.created_at,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Jogadores</h1>
      <p className="text-muted-foreground mb-8">Membros da comunidade AzD</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-border hover:border-gold/20 transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-gold font-bold text-lg">
                    {(p.nickname || p.name)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.nickname && <p className="text-xs text-gold">@{p.nickname}</p>}
                    {(p.city || p.state) && <p className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(', ')}</p>}
                    <p className="text-xs text-muted-foreground">Desde {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
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
