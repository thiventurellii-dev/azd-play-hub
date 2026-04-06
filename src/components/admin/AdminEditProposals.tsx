import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLog';

interface Proposal {
  id: string;
  match_id: string;
  proposed_by: string;
  proposed_data: any;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  proposer_name?: string;
}

const AdminEditProposals = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('match_edit_proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) { setProposals([]); setLoading(false); return; }

    const userIds = [...new Set((data as any[]).map(p => p.proposed_by))];
    const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', userIds);
    const nameMap: Record<string, string> = {};
    for (const p of (profiles || [])) nameMap[p.id] = (p as any).nickname || p.name;

    setProposals((data as any[]).map(p => ({ ...p, proposer_name: nameMap[p.proposed_by] || '?' })));
    setLoading(false);
  };

  useEffect(() => { fetchProposals(); }, []);

  const handleReview = async (proposal: Proposal, approve: boolean) => {
    if (!user) return;

    if (approve) {
      // Apply changes
      const d = proposal.proposed_data;
      if (d.played_at || d.duration_minutes !== undefined || d.season_id || d.game_id) {
        const update: any = {};
        if (d.played_at) update.played_at = d.played_at;
        if (d.duration_minutes !== undefined) update.duration_minutes = d.duration_minutes;
        if (d.season_id) update.season_id = d.season_id;
        if (d.game_id) update.game_id = d.game_id;
        if (d.results) {
          const fp = d.results.find((r: any) => r.is_first);
          if (fp) update.first_player_id = fp.player_id;
        }
        await supabase.from('matches').update(update).eq('id', proposal.match_id);
      }
      if (d.results) {
        for (const r of d.results) {
          await supabase.from('match_results').update({
            position: r.position, score: r.score,
          }).eq('match_id', proposal.match_id).eq('player_id', r.player_id);
        }
      }
    }

    await supabase.from('match_edit_proposals').update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', proposal.id);

    await logActivity(user.id, 'update', 'match', proposal.match_id, { proposal_status: 'pending' }, { proposal_status: approve ? 'approved' : 'rejected' });

    toast.success(approve ? 'Proposta aprovada e aplicada!' : 'Proposta rejeitada');
    fetchProposals();
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendente', color: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
    approved: { label: 'Aprovada', color: 'bg-green-600/20 text-green-400 border-green-600/30' },
    rejected: { label: 'Rejeitada', color: 'bg-red-600/20 text-red-400 border-red-600/30' },
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Propostas de Edição de Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : proposals.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Nenhuma proposta encontrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alterações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map(p => {
                  const st = statusConfig[p.status] || statusConfig.pending;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-sm">{p.proposer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.color}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {JSON.stringify(p.proposed_data).slice(0, 80)}...
                      </TableCell>
                      <TableCell>
                        {p.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400" onClick={() => handleReview(p, true)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleReview(p, false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEditProposals;
