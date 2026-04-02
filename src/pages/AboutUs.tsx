import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotification } from '@/components/NotificationDialog';
import { Pencil, Save, X } from 'lucide-react';

const AboutUs = () => {
  const { isAdmin } = useAuth();
  const { notify } = useNotification();
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('about_us').select('content').limit(1).single();
      if (data) setContent(data.content);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase.from('about_us').update({ content: editContent } as any).neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      const { data: rows } = await supabase.from('about_us').select('id').limit(1).single();
      if (rows) {
        const { error: err2 } = await supabase.from('about_us').update({ content: editContent } as any).eq('id', rows.id);
        if (err2) return notify('error', err2.message);
      }
    }
    setContent(editContent);
    setEditing(false);
    notify('success', 'Conteúdo atualizado!');
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-3xl">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Sobre Nós</CardTitle>
          {isAdmin && !editing && (
            <Button variant="ghost" size="sm" onClick={() => { setEditContent(content); setEditing(true); }}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={10}
                className="min-h-[200px]"
              />
              <div className="flex gap-2">
                <Button variant="gold" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground">
              {content.split('\n').map((line, i) => {
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-3 text-muted-foreground'}>
                    {parts.map((part, j) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>
                        : part
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutUs;
