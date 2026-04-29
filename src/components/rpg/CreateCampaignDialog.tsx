import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCampaign } from '@/hooks/useRpgCampaigns';
import { supabase } from '@/lib/supabaseExternal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-seleciona uma aventura quando o dialog é aberto a partir dela. */
  defaultAdventureId?: string;
  /** Esconde o seletor de aventura — útil quando já vem fixado pelo contexto. */
  lockAdventure?: boolean;
}

export const CreateCampaignDialog = ({
  open,
  onOpenChange,
  defaultAdventureId,
  lockAdventure,
}: Props) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adventureId, setAdventureId] = useState<string | undefined>(defaultAdventureId);
  const [adventures, setAdventures] = useState<{ id: string; name: string }[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [openJoin, setOpenJoin] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [imageUrl, setImageUrl] = useState('');
  const create = useCreateCampaign();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    if (defaultAdventureId) setAdventureId(defaultAdventureId);
    if (lockAdventure) return; // não precisa carregar lista
    supabase
      .from('rpg_adventures')
      .select('id, name')
      .order('name')
      .then(({ data }) => setAdventures((data as any) || []));
  }, [open, defaultAdventureId, lockAdventure]);

  const reset = () => {
    setName('');
    setDescription('');
    setAdventureId(defaultAdventureId);
    setIsPublic(true);
    setOpenJoin(false);
    setMaxPlayers(6);
    setImageUrl('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Dê um nome à campanha.');
      return;
    }
    try {
      const camp = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        adventure_id: adventureId || null,
        is_public: isPublic,
        open_join: openJoin,
        max_players: maxPlayers,
        image_url: imageUrl.trim() || null,
      });
      toast.success('Campanha criada!');
      onOpenChange(false);
      reset();
      navigate(`/campanhas/${camp.slug || camp.id}`);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('row-level security') || msg.includes('policy')) {
        toast.error('Apenas usuários com a tag "Mestre" podem criar campanhas.');
      } else {
        toast.error('Erro ao criar campanha: ' + msg);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A Maldição de Strahd"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Premissa, tom, expectativas..."
              rows={3}
            />
          </div>
          <div>
            <Label>Aventura (opcional)</Label>
            <Select value={adventureId} onValueChange={setAdventureId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma aventura" />
              </SelectTrigger>
              <SelectContent>
                {adventures.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>URL da imagem de capa</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Máx. de jogadores</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 6)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Pública</p>
              <p className="text-xs text-muted-foreground">
                Visível para todos no diretório.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Entrada livre</p>
              <p className="text-xs text-muted-foreground">
                Qualquer um entra até lotar (sem aprovação).
              </p>
            </div>
            <Switch checked={openJoin} onCheckedChange={setOpenJoin} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? 'Criando…' : 'Criar campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignDialog;
