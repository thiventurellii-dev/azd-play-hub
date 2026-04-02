import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Edit3, Save, X } from 'lucide-react';

const Rules = () => {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('community_rules')
        .select('*')
        .limit(1)
        .single();
      if (data) setContent(data.content);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('community_rules')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .not('id', 'is', null); // update all (single row)
    if (error) {
      toast.error(error.message);
    } else {
      setContent(editContent);
      setEditing(false);
      toast.success('Regras atualizadas!');
    }
    setSaving(false);
  };

  const startEditing = () => {
    setEditContent(content);
    setEditing(true);
  };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold mt-4 mb-2 text-foreground">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium mt-3 mb-1 text-foreground">{line.slice(4)}</h3>;
      if (line.trim() === '') return <br key={i} />;
      // Bold
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  if (loading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Regras</h1>
          <p className="text-muted-foreground mt-1">Regras da comunidade AzD</p>
        </div>
      </div>

      {editing ? (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle>Editando Regras</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Use markdown: # Título, ## Subtítulo, **negrito**"
            />
            <div className="flex gap-2">
              <Button variant="gold" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-6">
            {renderContent(content)}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Rules;
