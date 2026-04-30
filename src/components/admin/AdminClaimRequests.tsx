import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotification } from '@/components/NotificationDialog';
import { Loader2, GitPullRequest, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Status = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface ClaimRow {
  id: string;
  ghost_player_id: string;
  profile_id: string;
  claim_code: string;
  status: string;
  message: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  ghost_name?: string;
  profile_name?: string;
  profile_nickname?: string;
}

const statusBadge = (s: string) => {
  switch (s) {
    case 'approved':
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border">Aprovado</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 border">Rejeitado</Badge>;
    case 'cancelled':
      return <Badge variant="outline">Cancelado</Badge>;
    default:
      return <Badge className="bg-gold/15 text-gold border-gold/30 border">Pendente</Badge>;
  }
};

const AdminClaimRequests = () => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [filter, setFilter] = useState<Status>('all');

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('claim_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      notify('error', 'Erro ao carregar pedidos: ' + error.message);
      setLoading(false);
      return;
    }

    const list = (data || []) as ClaimRow[];

    // Resolver nomes em paralelo (ghost_players podem ter sido deletados em approved)
    const ghostIds = Array.from(new Set(list.map((r) => r.ghost_player_id)));
    const profileIds = Array.from(new Set(list.map((r) => r.profile_id)));

    const [ghosts, profiles] = await Promise.all([
      ghostIds.length
        ? supabase.from('ghost_players').select('id, display_name').in('id', ghostIds)
        : Promise.resolve({ data: [] as any[] }),
      profileIds.length
        ? supabase.from('profiles').select('id, name, nickname').in('id', profileIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const ghostMap = new Map((ghosts.data || []).map((g: any) => [g.id, g.display_name]));
    const profMap = new Map((profiles.data || []).map((p: any) => [p.id, p]));

    setRows(
      list.map((r) => ({
        ...r,
        ghost_name: ghostMap.get(r.ghost_player_id) || '(convidado removido)',
        profile_name: profMap.get(r.profile_id)?.name,
        profile_nickname: profMap.get(r.profile_id)?.nickname,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleDelete = async (id: string) => {
    const ok = await confirm('Apagar este registro de pedido? Esta ação não desfaz o vínculo, apenas remove a auditoria.');
    if (!ok) return;
    const { error } = await supabase.from('claim_requests').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Registro removido.');
    fetchRows();
  };

  const filtered = rows.filter((r) => filter === 'all' || r.status === filter);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-gold" />
          <CardTitle>Pedidos de Vínculo (Convidados)</CardTitle>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Status)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhum pedido encontrado.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-border bg-secondary/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(r.status)}
                    <span className="text-sm">
                      <span className="font-medium">{r.profile_nickname || r.profile_name || r.profile_id.slice(0, 8)}</span>
                      <span className="text-muted-foreground"> reivindicou </span>
                      <span className="font-medium">{r.ghost_name}</span>
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {r.claim_code}
                    </Badge>
                  </div>
                  {r.message && (
                    <p className="text-xs text-muted-foreground italic">"{r.message}"</p>
                  )}
                  {r.review_note && (
                    <p className="text-[11px] text-muted-foreground font-mono">{r.review_note}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                    {r.reviewed_at && ` · revisado ${formatDistanceToNow(new Date(r.reviewed_at), { addSuffix: true, locale: ptBR })}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Apagar registro">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminClaimRequests;
