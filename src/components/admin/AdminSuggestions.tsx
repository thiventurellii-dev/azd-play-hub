import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Suggestion {
  id: string;
  text: string;
  author_name: string;
  created_at: string;
}

const AdminSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSuggestions(data as Suggestion[]);
    setLoading(false);
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover sugestão');
    } else {
      setSuggestions(prev => prev.filter(s => s.id !== id));
      toast.success('Sugestão removida');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  if (suggestions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhuma sugestão recebida.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{suggestions.length} sugestão(ões) recebida(s)</p>
      {suggestions.map(s => (
        <Card key={s.id} className="bg-card border-border">
          <CardContent className="pt-4 flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{s.author_name || 'Anônimo'}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap break-words">{s.text}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminSuggestions;
