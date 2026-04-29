import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMyCharacters } from '@/hooks/useRpgCharacters';
import { useAttachCharacterToCampaign } from '@/hooks/useRpgCampaignDetail';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  excludeCharacterIds?: string[];
}

export const AttachCharacterDialog = ({
  open,
  onOpenChange,
  campaignId,
  excludeCharacterIds = [],
}: Props) => {
  const { data: chars = [], isLoading } = useMyCharacters();
  const attach = useAttachCharacterToCampaign();
  const [selected, setSelected] = useState<string | null>(null);
  const available = chars.filter((c) => !excludeCharacterIds.includes(c.id));

  const submit = async () => {
    if (!selected) return;
    try {
      await attach.mutateAsync({ campaign_id: campaignId, character_id: selected });
      toast.success('Personagem entrou na campanha!');
      onOpenChange(false);
      setSelected(null);
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || ''));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular personagem à campanha</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : available.length === 0 ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem personagens disponíveis.
            </p>
            <Link to="/profile">
              <Button variant="outline" size="sm">
                Criar personagem
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {available.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                  selected === c.id
                    ? 'border-gold bg-gold/10'
                    : 'border-border hover:border-gold/40'
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.portrait_url || undefined} />
                  <AvatarFallback>{c.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[c.race, c.class].filter(Boolean).join(' • ') || 'Personagem'}
                    {c.level ? ` • Nv. ${c.level}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!selected || attach.isPending}>
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachCharacterDialog;
