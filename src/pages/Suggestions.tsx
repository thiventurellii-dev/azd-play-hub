import { useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotification } from '@/components/NotificationDialog';
import { Lightbulb, Send } from 'lucide-react';

const Suggestions = () => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      notify('error', 'Descreva sua sugestão antes de enviar.');
      return;
    }
    if (trimmed.length > 2000) {
      notify('error', 'A sugestão deve ter no máximo 2000 caracteres.');
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from('suggestions')
      .insert({ text: trimmed, author_name: name.trim() || 'Anônimo' });
    if (error) {
      notify('error', 'Erro ao enviar sugestão.');
    } else {
      notify('success', 'Sugestão enviada com sucesso! Obrigado.');
      setText('');
      setName('');
    }
    setSending(false);
  };

  return (
    <div className="container py-10 max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sugestões</h1>
          <p className="text-sm text-muted-foreground">Envie sua sugestão para a comunidade AzD</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Nova Sugestão</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome (opcional)</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Como quer ser identificado?"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestion">Sugestão *</Label>
              <Textarea
                id="suggestion"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Descreva sua sugestão para a comunidade..."
                className="min-h-[150px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{text.length}/2000</p>
            </div>
            <Button variant="gold" type="submit" disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar Sugestão'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Suggestions;
