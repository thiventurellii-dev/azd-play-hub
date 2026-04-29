import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Search, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabaseExternal';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export const InvitePlayerDialog = ({ open, onOpenChange, campaignId }: Props) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, nickname, avatar_url')
      .or(`nickname.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(8);
    setResults(data || []);
    setLoading(false);
  };

  const invite = async (playerId: string) => {
    const { error } = await supabase.from('rpg_campaign_players').upsert(
      {
        campaign_id: campaignId,
        player_id: playerId,
        status: 'invited',
      } as any,
      { onConflict: 'campaign_id,player_id' },
    );
    if (error) toast.error('Erro: ' + error.message);
    else toast.success('Convite enviado!');
  };

  const generateLink = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('rpg_campaign_invites')
      .insert({
        campaign_id: campaignId,
        created_by: user.id,
      } as any)
      .select('token')
      .single();
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    const url = `${window.location.origin}/campanhas/convite/${(data as any).token}`;
    setInviteUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Link copiado!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar jogador</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="search">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-2 mt-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por @nickname ou nome..."
                className="pl-9"
                value={search}
                onChange={(e) => doSearch(e.target.value)}
              />
            </div>
            {loading && <p className="text-xs text-muted-foreground">Buscando…</p>}
            {results.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-md border border-border p-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.nickname && (
                    <p className="text-[11px] text-muted-foreground truncate">@{p.nickname}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => invite(p.id)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Convidar
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="link" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Gere um link compartilhável. Qualquer pessoa com o link pode pedir entrada.
            </p>
            <Button onClick={generateLink} className="w-full">
              Gerar link de convite
            </Button>
            {inviteUrl && (
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    toast.success('Copiado!');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InvitePlayerDialog;
