import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import FriendButton from '@/components/friendlist/FriendButton';
import { Search } from 'lucide-react';
import { usePlayersData } from '@/hooks/usePlayersData';

const Players = () => {
  const { data: players = [], isLoading } = usePlayersData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return players;
    const q = search.toLowerCase();
    return players.filter(p =>
      p.name.toLowerCase().includes(q) || p.nickname.toLowerCase().includes(q)
    );
  }, [players, search]);

  return (
    <div className="container py-10">
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-bold">Jogadores</h1>
      </div>
      <p className="text-muted-foreground mb-4">Membros da comunidade AzD</p>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full">
                <CardContent className="flex items-center gap-4 py-4 h-full">
                  <Link to={p.nickname ? `/perfil/${p.nickname}` : '#'} className="flex items-center gap-4 min-w-0 flex-1">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-gold font-bold text-lg flex-shrink-0">
                        {(p.nickname || p.name)?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.name}</p>
                      {p.nickname && <p className="text-xs text-gold truncate">@{p.nickname}</p>}
                      {(p.city || p.state) && <p className="text-xs text-muted-foreground truncate">{[p.city, p.state].filter(Boolean).join(', ')}</p>}
                      <p className="text-xs text-muted-foreground">Desde {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </Link>
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <FriendButton targetUserId={p.id} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <p className="col-span-full text-center text-muted-foreground py-8">Nenhum jogador encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Players;
