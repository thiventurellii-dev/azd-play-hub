import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotification } from '@/components/NotificationDialog';
import { Save, MessageCircle, Pencil, ExternalLink } from 'lucide-react';

const DiscordIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>
);

const AdminContato = () => {
  const { notify } = useNotification();
  const [discordUrl, setDiscordUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('contact_links').select('name, url');
      if (data) {
        for (const row of data) {
          if (row.name === 'discord') setDiscordUrl(row.url);
          if (row.name === 'whatsapp') setWhatsappUrl(row.url);
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error: e1 } = await supabase.from('contact_links').update({ url: discordUrl } as any).eq('name', 'discord');
    const { error: e2 } = await supabase.from('contact_links').update({ url: whatsappUrl } as any).eq('name', 'whatsapp');
    setSaving(false);
    if (e1 || e2) return notify('error', (e1 || e2)!.message);
    notify('success', 'Links atualizados!');
    setEditing(false);
  };

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Links de Contato</CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><DiscordIcon size={16} /> Link do Discord</Label>
              <Input value={discordUrl} onChange={e => setDiscordUrl(e.target.value)} placeholder="https://discord.gg/..." />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Link do WhatsApp</Label>
              <Input value={whatsappUrl} onChange={e => setWhatsappUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
            </div>
            <div className="flex gap-2">
              <Button variant="gold" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2 h-16 text-lg">
                <DiscordIcon size={24} />
                Discord
                <ExternalLink className="h-4 w-4 ml-auto opacity-50" />
              </Button>
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2 h-16 text-lg">
                <MessageCircle className="h-6 w-6" />
                WhatsApp
                <ExternalLink className="h-4 w-4 ml-auto opacity-50" />
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminContato;
