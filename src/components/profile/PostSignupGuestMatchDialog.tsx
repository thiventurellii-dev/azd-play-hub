import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseExternal';
import { useNotification } from '@/components/NotificationDialog';
import { Loader2, UserCheck, Mail, Phone, AtSign, IdCard } from 'lucide-react';

interface GuestMatch {
  id: string;
  display_name: string;
  nickname: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  claim_code: string;
  match_email: boolean;
  match_phone: boolean;
  match_nick: boolean;
  match_name: boolean;
  match_score: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  onDone?: () => void;
}

/**
 * Dialog mostrado logo após o signup quando há ghost_players cujos campos
 * (email/phone/nickname/name) batem com o profile recém-criado.
 * Permite reivindicação 1-clique (passa o claim_code automaticamente).
 */
export const PostSignupGuestMatchDialog = ({ open, onOpenChange, profileId, onDone }: Props) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<GuestMatch[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('find_matching_guests', { p_profile_id: profileId });
      if (cancelled) return;
      if (error) {
        console.error('find_matching_guests error', error);
        setMatches([]);
      } else {
        setMatches((data as GuestMatch[]) || []);
        // Notifica admins em background (sem bloquear UI)
        const ids = (data as GuestMatch[])?.map((m) => m.id) || [];
        if (ids.length > 0) {
          supabase.rpc('notify_admins_guest_matches', { p_profile_id: profileId, p_ghost_ids: ids });
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, profileId]);

  const handleClaim = async (m: GuestMatch) => {
    setClaimingId(m.id);
    const { data, error } = await supabase.rpc('claim_ghost_player', {
      p_ghost_id: m.id,
      p_profile_id: profileId,
      p_claim_code: m.claim_code,
      p_message: 'Auto-match no signup',
    });
    setClaimingId(null);

    if (error) return notify('error', error.message);
    const result = data as any;
    if (!result?.ok) return notify('error', result?.error || 'Falha ao vincular');

    const dedup = (result.dedup_boardgame || 0) + (result.dedup_blood || 0);
    notify('success', `Convidado "${m.display_name}" vinculado!${dedup ? ` ${dedup} duplicata(s) consolidada(s).` : ''}`);
    setMatches((prev) => prev.filter((x) => x.id !== m.id));
  };

  const handleClose = () => {
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-gold" /> Você já jogou conosco?
          </DialogTitle>
          <DialogDescription>
            Encontramos perfis de convidado com dados compatíveis com o seu cadastro. Reivindique para mesclar o histórico ao seu perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2 max-h-[55vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Buscando...
            </div>
          )}

          {!loading && matches.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum convidado com dados compatíveis encontrado.
            </p>
          )}

          {!loading && matches.map((m) => (
            <div key={m.id} className="rounded-md border border-gold/20 bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{m.display_name}</p>
                  {m.nickname && m.nickname !== m.display_name && (
                    <p className="text-xs text-muted-foreground">@{m.nickname}</p>
                  )}
                </div>
                <Badge variant="outline" className="border-amber-400/40 text-amber-400 font-mono text-xs">
                  {m.claim_code}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                {m.match_email && <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3"/>email</Badge>}
                {m.match_phone && <Badge variant="secondary" className="gap-1"><Phone className="h-3 w-3"/>telefone</Badge>}
                {m.match_nick &&  <Badge variant="secondary" className="gap-1"><AtSign className="h-3 w-3"/>nickname</Badge>}
                {m.match_name &&  <Badge variant="secondary" className="gap-1"><IdCard className="h-3 w-3"/>nome</Badge>}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => handleClaim(m)}
                  disabled={claimingId !== null}
                >
                  {claimingId === m.id ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/> Vinculando...</> : 'Sou eu, reivindicar'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3">
          <Button variant="outline" onClick={handleClose}>
            {matches.length > 0 ? 'Pular por enquanto' : 'Fechar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostSignupGuestMatchDialog;
