import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayerTagsSelector, { PlayerTag } from '@/components/profile/PlayerTagsSelector';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';
import { supabase } from '@/lib/supabaseExternal';
import { saveProfileTags } from '@/hooks/useProfileTags';
import { useNotification } from '@/components/NotificationDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialProfile: any;
  initialTags: PlayerTag[];
  onSaved: (updated: any, tags: PlayerTag[]) => void;
}

export const EditProfileDialog = ({ open, onOpenChange, userId, initialProfile, initialTags, onSaved }: Props) => {
  const { notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', nickname: '', phone: '', country_code: '+55',
    state: '', city: '', birth_date: '', gender: '', pronouns: '', bio: '',
  });
  const [tags, setTags] = useState<PlayerTag[]>([]);

  useEffect(() => {
    if (open && initialProfile) {
      setForm({
        name: initialProfile.name || '',
        nickname: initialProfile.nickname || '',
        phone: formatPhone(initialProfile.phone || ''),
        country_code: initialProfile.country_code || '+55',
        state: initialProfile.state || '',
        city: initialProfile.city || '',
        birth_date: initialProfile.birth_date || '',
        gender: initialProfile.gender || '',
        pronouns: initialProfile.pronouns || '',
        bio: initialProfile.bio || '',
      });
      setTags(initialTags);
    }
  }, [open, initialProfile, initialTags]);

  const cities = citiesByState[form.state] || [];

  const handleSave = async () => {
    if (!form.name || !form.nickname || !form.phone || !form.state || !form.city || !form.birth_date || !form.gender || !form.pronouns) {
      return notify('error', 'Preencha todos os campos obrigatórios');
    }
    if (tags.length === 0) {
      return notify('error', 'Escolha pelo menos uma tag de jogador');
    }
    setSaving(true);
    const updates = {
      name: form.name,
      nickname: form.nickname,
      phone: unformatPhone(form.phone),
      country_code: form.country_code,
      state: form.state,
      city: form.city,
      birth_date: form.birth_date,
      gender: form.gender,
      pronouns: form.pronouns,
      bio: form.bio.trim() || null,
    };
    const { error } = await supabase.from('profiles').update(updates as any).eq('id', userId);
    if (error) { setSaving(false); return notify('error', error.message); }
    try {
      await saveProfileTags(userId, tags);
    } catch (e: any) {
      setSaving(false);
      return notify('error', 'Erro ao salvar tags: ' + (e.message || ''));
    }
    setSaving(false);
    notify('success', 'Perfil atualizado!');
    onSaved({ ...initialProfile, ...updates }, tags);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize seus dados pessoais e como você aparece para a comunidade.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nickname *</Label>
                <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefone *</Label>
              <div className="flex gap-2">
                <Select value={form.country_code} onValueChange={v => setForm({ ...form, country_code: v })}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="(11) 99999-9999"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={form.state} onValueChange={v => setForm({ ...form, state: v, city: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Select value={form.city} onValueChange={v => setForm({ ...form, city: v })} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? 'Selecione' : 'Selecione o estado'} /></SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Nascimento *</Label>
                <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gênero *</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="nao_binario">Não-binário</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Como devo me referir a você? *</Label>
              <Select value={form.pronouns} onValueChange={v => setForm({ ...form, pronouns: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione seus pronomes" /></SelectTrigger>
                <SelectContent>
                  {pronounsOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label>
                Como você joga? *{' '}
                <span className="text-xs text-muted-foreground font-normal">(escolha pelo menos uma)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Estas tags definem o que você pode fazer na plataforma — por exemplo, marcar a tag <strong>Mestre</strong> libera a criação de campanhas de RPG.
              </p>
              <PlayerTagsSelector selected={tags} onChange={setTags} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border bg-card">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
