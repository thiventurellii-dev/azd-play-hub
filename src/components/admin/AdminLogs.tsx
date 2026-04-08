import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, CalendarIcon } from 'lucide-react';

interface LogEntry {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: 'Criação', color: 'bg-green-600/20 text-green-400 border-green-600/30' },
  update: { label: 'Atualização', color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
  delete: { label: 'Exclusão', color: 'bg-red-600/20 text-red-400 border-red-600/30' },
};

const entityLabels: Record<string, string> = {
  match: 'Partida',
  room: 'Sala',
  game: 'Jogo',
  player: 'Jogador',
  season: 'Season',
  achievement: 'Conquista',
};

const AdminLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
    if (actionFilter !== 'all') query = query.eq('action', actionFilter);
    if (dateFilter) query = query.gte('created_at', `${dateFilter}T00:00:00`);

    const { data } = await query;
    if (!data) { setLogs([]); setLoading(false); return; }

    // Fetch user names
    const userIds = [...new Set((data as any[]).map(l => l.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', userIds);
    const nameMap: Record<string, string> = {};
    for (const p of (profiles || [])) nameMap[p.id] = (p as any).nickname || p.name;

    setLogs((data as any[]).map(l => ({ ...l, user_name: nameMap[l.user_id] || 'Desconhecido' })));
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [entityFilter, actionFilter, dateFilter]);

  const renderDiff = (old_data: any, new_data: any) => {
    if (!old_data && !new_data) return <span className="text-muted-foreground text-xs">—</span>;
    const keys = new Set([...Object.keys(old_data || {}), ...Object.keys(new_data || {})]);
    const changes: { key: string; from: any; to: any }[] = [];
    for (const k of keys) {
      const ov = old_data?.[k];
      const nv = new_data?.[k];
      if (JSON.stringify(ov) !== JSON.stringify(nv)) {
        changes.push({ key: k, from: ov, to: nv });
      }
    }
    if (changes.length === 0) return <span className="text-muted-foreground text-xs">Sem alterações</span>;
    return (
      <div className="space-y-1">
        {changes.slice(0, 5).map(c => (
          <div key={c.key} className="text-xs">
            <span className="font-medium text-muted-foreground">{c.key}:</span>{' '}
            {c.from !== undefined && <span className="text-red-400 line-through">{String(c.from ?? '—')}</span>}
            {c.from !== undefined && ' → '}
            <span className="text-green-400">{String(c.to ?? '—')}</span>
          </div>
        ))}
        {changes.length > 5 && <span className="text-xs text-muted-foreground">+{changes.length - 5} mais</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Entidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(entityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-[160px]"><Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="pr-10 h-9" /><CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" /></div>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Logs de Atividade ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Nenhum log encontrado</p>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Alterações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => {
                    const ac = actionLabels[log.action] || { label: log.action, color: '' };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-sm">{log.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ac.color}>{ac.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </TableCell>
                        <TableCell>{renderDiff(log.old_data, log.new_data)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs;
