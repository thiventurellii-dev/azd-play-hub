import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const AdminAboutUs = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('about_us').select('content').limit(1).single();
      if (data) setContent(data.content);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: rows } = await supabase.from('about_us').select('id').limit(1).single();
    if (rows) {
      const { error } = await supabase.from('about_us').update({ content } as any).eq('id', rows.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from('about_us').insert({ content } as any);
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    toast.success('Conteúdo do "Sobre Nós" atualizado!');
  };

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Editar Sobre Nós</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Use **texto** para negrito. Cada linha será um parágrafo.</p>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={15}
          className="min-h-[300px] font-mono text-sm"
        />
        <Button variant="gold" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminAboutUs;
