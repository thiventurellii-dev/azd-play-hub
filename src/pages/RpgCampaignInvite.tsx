import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseExternal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const RpgCampaignInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?redirect=/campanhas/convite/${token}`);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('lookup_campaign_invite' as any, {
        _token: token,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row || !row.valid) {
        toast.error('Convite inválido ou expirado.');
        navigate('/campanhas');
        return;
      }
      const { error: joinErr } = await supabase.from('rpg_campaign_players').upsert(
        {
          campaign_id: row.campaign_id,
          player_id: user.id,
          status: 'pending_request',
        } as any,
        { onConflict: 'campaign_id,player_id' },
      );
      if (joinErr) {
        toast.error('Erro: ' + joinErr.message);
      } else {
        toast.success('Pedido enviado ao mestre!');
      }
      navigate(`/campanhas/${row.campaign_id}`);
    })();
  }, [token, user, loading, navigate]);

  return (
    <div className="container py-12 max-w-md text-center space-y-4">
      <Skeleton className="h-6 w-2/3 mx-auto" />
      <p className="text-sm text-muted-foreground">Processando convite…</p>
      <Button variant="ghost" onClick={() => navigate('/campanhas')}>
        Cancelar
      </Button>
    </div>
  );
};

export default RpgCampaignInvite;
