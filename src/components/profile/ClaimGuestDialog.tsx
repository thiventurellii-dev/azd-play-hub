import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseExternal';
import { useNotification } from '@/components/NotificationDialog';
import { UserCheck, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onClaimed?: () => void;
}

interface GhostPreview {
  id: string;
  display_name: string;
}

export const ClaimGuestDialog = ({ open, onOpenChange, onClaimed }: Props) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<GhostPreview | null>(null);

  const reset = () => {
    setCode('');
    setMessage('');
    setPreview(null);
  };

  const handleSearch = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return notify('error', 'Informe o código de convidado');
    setSearching(true);
    setPreview(null);
    // Lookup via RPC SECURITY DEFINER — claim_code não é mais legível via SELECT direto
    const { data, error } = await supabase.rpc('lookup_ghost_by_claim_code', {
      p_code: normalized,
    });
    setSearching(false);
    if (error) return notify('error', 'Erro ao buscar convidado');
    const row = Array.isArray(data) ? data[0] : (data as any);
    if (!row) return notify('error', 'Nenhum convidado encontrado com esse código');
    if (row.linked_profile_id || row.claimed_by_user_id)
      return notify('error', 'Este convidado já foi vinculado a outra conta');
    setPreview({ id: row.id, display_name: row.display_name });
  };

  const handleClaim = async () => {
    if (!user || !preview) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('claim_ghost_player', {
      p_ghost_id: preview.id,
      p_profile_id: user.id,
      p_claim_code: code.trim().toUpperCase(),
      p_message: message.trim() || null,
    });
    setSubmitting(false);

    if (error) return notify('error', error.message);
    const result = data as any;
    if (!result?.ok) {
      const map: Record<string, string> = {
        ghost_not_found: 'Convidado não encontrado.',
        already_linked: 'Este convidado já foi vinculado.',
        invalid_code: 'Código inválido.',
      };
      return notify('error', map[result?.error] || 'Não foi possível concluir o vínculo.');
    }

    const dedup = (result.dedup_boardgame || 0) + (result.dedup_blood || 0);
    notify(
      'success',
      `Conta vinculada! Histórico mesclado com sucesso.${dedup > 0 ? ` ${dedup} duplicata(s) consolidada(s).` : ''}`
    );
    reset();
    onOpenChange(false);
    onClaimed?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-gold" /> Reivindicar convidado
          </DialogTitle>
          <DialogDescription>
            Se você jogou partidas antes de criar sua conta, peça o código <code className="text-gold">AZD-XXXX</code> ao admin
            que registrou seus jogos. Ao reivindicar, todo o histórico do convidado será mesclado ao seu perfil e o MMR/ranking
            recalculado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Código do convidado</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setPreview(null);
                }}
                placeholder="AZD-XXXX"
                className="font-mono uppercase"
                maxLength={20}
                disabled={submitting}
              />
              <Button onClick={handleSearch} disabled={searching || submitting} variant="outline">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {preview && (
            <div className="rounded-md border border-gold/30 bg-gold/5 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Convidado encontrado:</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{preview.display_name}</span>
                <Badge variant="outline" className="border-amber-400/40 text-amber-400">
                  convidado
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem (opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Quer deixar uma nota para os admins? (opcional)"
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={handleClaim} disabled={!preview || submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Vinculando...</> : 'Reivindicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimGuestDialog;
