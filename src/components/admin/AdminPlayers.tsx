import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, User } from 'lucide-react';

interface PlayerWithRole {
  id: string;
  name: string;
  email: string;
  role: string;
}

const AdminPlayers = () => {
  const [players, setPlayers] = useState<PlayerWithRole[]>([]);

  const fetchPlayers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('id, name');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    const roleMap: Record<string, string> = {};
    for (const r of (roles || [])) roleMap[r.user_id] = r.role;

    setPlayers((profiles || []).map(p => ({
      id: p.id,
      name: p.name,
      email: '',
      role: roleMap[p.id] || 'player',
    })));
  };

  useEffect(() => { fetchPlayers(); }, []);

  const toggleRole = async (playerId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'player' : 'admin';

    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: playerId, role: newRole }, { onConflict: 'user_id' });

    if (error) return toast.error(error.message);
    toast.success(`Role atualizado para ${newRole}`);
    fetchPlayers();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Gerenciar Jogadores</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-gold font-bold">
                    {p.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <Badge variant={p.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {p.role === 'admin' ? <><Shield className="h-3 w-3 mr-1" />Admin</> : <><User className="h-3 w-3 mr-1" />Player</>}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleRole(p.id, p.role)}>
                  {p.role === 'admin' ? 'Remover Admin' : 'Promover Admin'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlayers;
