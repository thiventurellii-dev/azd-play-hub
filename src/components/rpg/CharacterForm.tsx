import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseExternal';
import { useUpsertCharacter, useDeleteCharacter, type CharacterInput } from '@/hooks/useRpgCharacters';
import type { RpgCharacter } from '@/types/rpg';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface Props {
  character?: RpgCharacter | null;
  onSuccess?: (id: string) => void;
}

export const CharacterForm = ({ character, onSuccess }: Props) => {
  const upsert = useUpsertCharacter();
  const remove = useDeleteCharacter();
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<CharacterInput>({
    id: character?.id,
    name: character?.name ?? '',
    race: character?.race ?? '',
    class: character?.class ?? '',
    level: character?.level ?? 1,
    system_id: character?.system_id ?? null,
    portrait_url: character?.portrait_url ?? '',
    backstory: character?.backstory ?? '',
    alignment: character?.alignment ?? '',
    traits: character?.traits ?? '',
    gear: character?.gear ?? '',
    external_url: character?.external_url ?? '',
    is_public: character?.is_public ?? true,
  });

  useEffect(() => {
    supabase
      .from('rpg_systems')
      .select('id, name')
      .order('name')
      .then(({ data }) => setSystems((data || []) as any));
  }, []);

  const update = <K extends keyof CharacterInput>(key: K, value: CharacterInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Dê um nome ao personagem');
      return;
    }
    try {
      const id = await upsert.mutateAsync(form);
      toast.success(form.id ? 'Personagem atualizado!' : 'Personagem criado!');
      onSuccess?.(id);
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || ''));
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!confirm('Apagar este personagem? Esta ação não pode ser desfeita.')) return;
    try {
      await remove.mutateAsync(form.id);
      toast.success('Personagem apagado.');
      onSuccess?.(form.id);
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || ''));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Raça</Label>
          <Input value={form.race ?? ''} onChange={(e) => update('race', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Classe</Label>
          <Input value={form.class ?? ''} onChange={(e) => update('class', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Nível</Label>
          <Input
            type="number"
            min={1}
            value={form.level ?? 1}
            onChange={(e) => update('level', Number(e.target.value) || 1)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Alinhamento</Label>
          <Input value={form.alignment ?? ''} onChange={(e) => update('alignment', e.target.value)} placeholder="Ex.: Neutro Bom" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Sistema</Label>
          <Select value={form.system_id ?? 'none'} onValueChange={(v) => update('system_id', v === 'none' ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhum —</SelectItem>
              {systems.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>URL do retrato</Label>
          <Input
            value={form.portrait_url ?? ''}
            onChange={(e) => update('portrait_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Backstory</Label>
          <Textarea
            value={form.backstory ?? ''}
            onChange={(e) => update('backstory', e.target.value)}
            rows={4}
            placeholder="Conte a história do personagem em poucas linhas."
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Traços marcantes</Label>
          <Textarea
            value={form.traits ?? ''}
            onChange={(e) => update('traits', e.target.value)}
            rows={2}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Equipamento</Label>
          <Textarea
            value={form.gear ?? ''}
            onChange={(e) => update('gear', e.target.value)}
            rows={2}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Mais informações (URL externa)</Label>
          <Input
            value={form.external_url ?? ''}
            onChange={(e) => update('external_url', e.target.value)}
            placeholder="LegendKeeper, D&D Beyond, Google Doc..."
          />
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Personagem público</p>
            <p className="text-[11px] text-muted-foreground">
              Aparece no Hall de Heróis e em campanhas que você participa.
            </p>
          </div>
          <Switch
            checked={form.is_public ?? true}
            onCheckedChange={(v) => update('is_public', v)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {form.id ? (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Apagar
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={submit} disabled={upsert.isPending}>
          {form.id ? 'Salvar alterações' : 'Criar personagem'}
        </Button>
      </div>
    </div>
  );
};

export default CharacterForm;
