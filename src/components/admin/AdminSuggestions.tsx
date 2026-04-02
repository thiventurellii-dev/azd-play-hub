import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, ArrowUpDown, RotateCcw } from 'lucide-react';
import { useNotification } from '@/components/NotificationDialog';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Suggestion {
  id: string;
  text: string;
  author_name: string;
  created_at: string;
  priority: string;
  complexity: string;
  status: string;
}

const priorityLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const priorityOrder: Record<string, number> = { critica: 4, alta: 3, media: 2, baixa: 1 };
const complexityLabels: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
const complexityOrder: Record<string, number> = { alto: 3, medio: 2, baixo: 1 };

const priorityColors: Record<string, string> = {
  baixa: 'bg-green-600/20 text-green-400 border-green-600/30',
  media: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  alta: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  critica: 'bg-red-600/20 text-red-400 border-red-600/30',
};

const complexityColors: Record<string, string> = {
  baixo: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  medio: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  alto: 'bg-pink-600/20 text-pink-400 border-pink-600/30',
};

type SortOption = 'priority_desc' | 'priority_asc' | 'complexity_desc' | 'complexity_asc' | 'date_desc';

const AdminSuggestions = () => {
  const { notify } = useNotification();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  const fetchSuggestions = async () => {
    const { data } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
    if (data) setSuggestions(data as Suggestion[]);
    setLoading(false);
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const updateSuggestion = async (id: string, updates: Partial<Suggestion>, silent = false) => {
    const { error } = await supabase.from('suggestions').update(updates).eq('id', id);
    if (error) {
      notify('error', 'Erro ao atualizar sugestão');
    } else {
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      if (!silent) notify('success', 'Sugestão atualizada');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) {
      notify('error', 'Erro ao remover sugestão');
    } else {
      setSuggestions(prev => prev.filter(s => s.id !== id));
      notify('success', 'Sugestão removida');
    }
  };

  const sortSuggestions = (items: Suggestion[]) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'priority_desc': return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case 'priority_asc': return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        case 'complexity_desc': return (complexityOrder[b.complexity] || 0) - (complexityOrder[a.complexity] || 0);
        case 'complexity_asc': return (complexityOrder[a.complexity] || 0) - (complexityOrder[b.complexity] || 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  const pending = sortSuggestions(suggestions.filter(s => s.status === 'pending'));
  const completed = suggestions.filter(s => s.status === 'completed');
  const discarded = suggestions.filter(s => s.status === 'discarded');

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  const renderTable = (items: Suggestion[], showActions: boolean) => (
    <div className="rounded-md border border-border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[120px] whitespace-nowrap">Data</TableHead>
            <TableHead className="w-[140px] whitespace-nowrap">Solicitante</TableHead>
            <TableHead className="min-w-[200px]">Descrição</TableHead>
            <TableHead className="w-[140px] whitespace-nowrap">Prioridade</TableHead>
            <TableHead className="w-[140px] whitespace-nowrap">Esforço</TableHead>
            <TableHead className="w-[100px] text-center whitespace-nowrap">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhuma sugestão encontrada.
              </TableCell>
            </TableRow>
          ) : items.map(s => (
            <TableRow key={s.id} className="align-middle">
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {format(new Date(s.created_at), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="text-sm font-medium">{s.author_name || 'Anônimo'}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[400px]">
                <p className="whitespace-pre-wrap break-words line-clamp-3">{s.text}</p>
              </TableCell>
              <TableCell>
                {showActions ? (
                  <Select value={s.priority} onValueChange={(v) => updateSuggestion(s.id, { priority: v })}>
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`text-xs ${priorityColors[s.priority] || ''}`}>
                    {priorityLabels[s.priority] || s.priority}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {showActions ? (
                  <Select value={s.complexity} onValueChange={(v) => updateSuggestion(s.id, { complexity: v })}>
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(complexityLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`text-xs ${complexityColors[s.complexity] || ''}`}>
                    {complexityLabels[s.complexity] || s.complexity}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  {showActions ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-300" onClick={() => updateSuggestion(s.id, { status: 'completed' })} title="Concluir">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-400 hover:text-yellow-300" onClick={() => updateSuggestion(s.id, { status: 'discarded' })} title="Descartar">
                        <X className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => updateSuggestion(s.id, { status: 'pending' })} title="Reabrir">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList className="bg-secondary">
        <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
        <TabsTrigger value="completed">Concluídas ({completed.length})</TabsTrigger>
        <TabsTrigger value="discarded">Descartadas ({discarded.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <div className="flex items-center gap-3 mb-4">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Mais recentes</SelectItem>
              <SelectItem value="priority_desc">Prioridade mais alta</SelectItem>
              <SelectItem value="priority_asc">Prioridade mais baixa</SelectItem>
              <SelectItem value="complexity_asc">Esforço mais baixo</SelectItem>
              <SelectItem value="complexity_desc">Esforço mais alto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {renderTable(pending, true)}
      </TabsContent>

      <TabsContent value="completed">{renderTable(completed, false)}</TabsContent>
      <TabsContent value="discarded">{renderTable(discarded, false)}</TabsContent>
    </Tabs>
  );
};

export default AdminSuggestions;
