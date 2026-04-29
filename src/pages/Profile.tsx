import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseExternal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useNotification } from '@/components/NotificationDialog';
import { Pencil, Lock, Camera, Mail } from 'lucide-react';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';
import FriendsList from '@/components/friendlist/FriendsList';
import XpBadge from '@/components/shared/XpBadge';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import PlayerTagsSelector, { PlayerTagsBadges, PlayerTag } from '@/components/profile/PlayerTagsSelector';
import { useProfileTags, saveProfileTags } from '@/hooks/useProfileTags';
import { MyCampaignsCard } from '@/components/rpg/MyCampaignsCard';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';

const Profile = () => {
  const { user, role } = useAuth();
  const { notify } = useNotification();
  useProfileCompletion();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', country_code: '+55', state: '', city: '', birth_date: '', gender: '', pronouns: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tags: playerTags, setTags: setPlayerTags } = useProfileTags(user?.id);
  const [editTags, setEditTags] = useState<PlayerTag[]>([]);

  // Email change
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);

  const cities = citiesByState[form.state] || [];

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({
          name: data.name || '',
          nickname: (data as any).nickname || '',
          phone: formatPhone((data as any).phone || ''),
          country_code: (data as any).country_code || '+55',
          state: (data as any).state || '',
          city: (data as any).city || '',
          birth_date: (data as any).birth_date || '',
          gender: (data as any).gender || '',
          pronouns: (data as any).pronouns || '',
          email: (data as any).email || user.email || '',
        });
      }
    });
  }, [user]);

  // Save handler now lives in EditProfileDialog. The dialog calls onSaved with
  // the updated profile + tags so we can refresh local state without a refetch.
  const handleProfileSaved = (updated: any, newTags: PlayerTag[]) => {
    setProfile({ ...profile, ...updated });
    setPlayerTags(newTags);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return notify('error', 'Preencha ambos os campos de senha');
    if (newPassword !== confirmPassword) return notify('error', 'As senhas não coincidem');
    if (newPassword.length < 8) return notify('error', 'Mínimo 8 caracteres');
    if (!/[A-Z]/.test(newPassword)) return notify('error', 'Inclua ao menos uma letra maiúscula');
    if (!/[a-z]/.test(newPassword)) return notify('error', 'Inclua ao menos uma letra minúscula');
    if (!/[^A-Za-z0-9]/.test(newPassword)) return notify('error', 'Inclua ao menos um caractere especial');

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return notify('error', error.message);
    notify('success', 'Senha alterada com sucesso!');
    setChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return notify('error', 'Digite o novo e-mail');
    if (newEmail === (user?.email || form.email)) return notify('error', 'O novo e-mail deve ser diferente do atual');

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: window.location.origin }
    );
    setSavingEmail(false);
    if (error) return notify('error', error.message);

    setEmailChangeRequested(true);
    notify('success', 'Um link de confirmação foi enviado para o novo e-mail. Verifique sua caixa de entrada.');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return notify('error', 'Imagem deve ter no máximo 2MB');
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    
    const { data: existing } = await supabase.storage.from('avatars').list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage.from('avatars').remove(existing.map(f => `${user.id}/${f.name}`));
    }
    
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { setUploadingAvatar(false); return notify('error', uploadError.message); }
    
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    
    await supabase.from('profiles').update({ avatar_url: avatarUrl } as any).eq('id', user.id);
    setProfile({ ...profile, avatar_url: avatarUrl });
    setUploadingAvatar(false);
    notify('success', 'Foto atualizada!');
  };

  const genderLabels: Record<string, string> = {
    masculino: 'Masculino', feminino: 'Feminino', nao_binario: 'Não-binário', 'nao-binario': 'Não-binário', outro: 'Outro', prefiro_nao_dizer: 'Prefiro não dizer', 'prefiro-nao-dizer': 'Prefiro não dizer',
  };

  const pronounsLabels: Record<string, string> = {
    'ele/dele': 'Ele/Dele', 'ela/dela': 'Ela/Dela', 'elu/delu': 'Elu/Delu', prefiro_nao_dizer: 'Prefiro não dizer',
  };

  return (
    <div className="container py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        {profile?.nickname && (
          <Link to={`/perfil/${profile.nickname}`}>
            <Button variant="outline" size="sm">Ver perfil público</Button>
          </Link>
        )}
      </div>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-gold font-bold text-2xl">
                    {(profile?.nickname || profile?.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </div>
              <div>
                <CardTitle>{profile?.name || 'Sem nome'}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {profile?.nickname && <span>@{profile.nickname}</span>}
                  {profile?.pronouns && pronounsLabels[profile.pronouns] && (
                    <>
                      <span className="opacity-50">•</span>
                      <span>{pronounsLabels[profile.pronouns]}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {role === 'admin' && <Badge variant="default">Admin</Badge>}
                  <PlayerTagsBadges tags={playerTags} />
                  <XpBadge userId={user?.id} variant="compact" />
                </div>
                <div className="mt-3 max-w-[260px]">
                  <XpBadge userId={user?.id} variant="full" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar Perfil
              </Button>
              {!changingPassword && (
                <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
                  <Lock className="h-4 w-4 mr-1" /> Resetar Senha
                </Button>
              )}
              {!changingEmail && !changingPassword && (
                <Button variant="outline" size="sm" onClick={() => { setChangingEmail(true); setNewEmail(''); setEmailChangeRequested(false); }}>
                  <Mail className="h-4 w-4 mr-1" /> Alterar E-mail
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{profile?.email || user?.email}</span></div>
            <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{profile?.country_code} {profile?.phone ? formatPhone(profile.phone) : '—'}</span></div>
            <div><span className="text-muted-foreground">Estado:</span> <span className="font-medium">{brazilianStates.find(s => s.uf === profile?.state)?.name || profile?.state || '—'}</span></div>
            <div><span className="text-muted-foreground">Cidade:</span> <span className="font-medium">{profile?.city || '—'}</span></div>
            <div><span className="text-muted-foreground">Nascimento:</span> <span className="font-medium">{profile?.birth_date ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
            <div><span className="text-muted-foreground">Gênero:</span> <span className="font-medium">{genderLabels[profile?.gender] || '—'}</span></div>
            <div><span className="text-muted-foreground">Pronomes:</span> <span className="font-medium">{pronounsLabels[profile?.pronouns] || '—'}</span></div>
            <div><span className="text-muted-foreground">Membro desde:</span> <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
          </div>

          {editing ? (
            <div className="space-y-4">
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
                <Label>E-mail</Label>
                <Input value={form.email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Use o botão "Alterar E-mail" para mudar</p>
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
              <div className="space-y-2">
                <Label>Como você joga? * <span className="text-xs text-muted-foreground font-normal">(escolha pelo menos uma)</span></Label>
                <PlayerTagsSelector selected={editTags} onChange={setEditTags} />
              </div>
              <div className="flex gap-2">
                <Button variant="gold" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{profile?.email || user?.email}</span></div>
              <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{profile?.country_code} {profile?.phone ? formatPhone(profile.phone) : '—'}</span></div>
              <div><span className="text-muted-foreground">Estado:</span> <span className="font-medium">{brazilianStates.find(s => s.uf === profile?.state)?.name || profile?.state || '—'}</span></div>
              <div><span className="text-muted-foreground">Cidade:</span> <span className="font-medium">{profile?.city || '—'}</span></div>
              <div><span className="text-muted-foreground">Nascimento:</span> <span className="font-medium">{profile?.birth_date ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
              <div><span className="text-muted-foreground">Gênero:</span> <span className="font-medium">{genderLabels[profile?.gender] || '—'}</span></div>
              <div><span className="text-muted-foreground">Pronomes:</span> <span className="font-medium">{pronounsLabels[profile?.pronouns] || '—'}</span></div>
              <div><span className="text-muted-foreground">Membro desde:</span> <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
            </div>
          )}

          {/* Email change section */}
          {changingEmail && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Alterar E-mail</h3>
                {emailChangeRequested ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Um link de confirmação foi enviado para <strong>{newEmail}</strong>. 
                      Clique no link no e-mail para confirmar a alteração.
                    </p>
                    <Button variant="outline" onClick={() => { setChangingEmail(false); setEmailChangeRequested(false); }}>Fechar</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>E-mail atual</Label>
                      <Input value={user?.email || form.email} disabled className="opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <Label>Novo E-mail</Label>
                      <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="novo@email.com" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="gold" onClick={handleChangeEmail} disabled={savingEmail}>
                        {savingEmail ? 'Enviando...' : 'Enviar confirmação'}
                      </Button>
                      <Button variant="outline" onClick={() => setChangingEmail(false)}>Cancelar</Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Password change section */}
          {changingPassword && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Alterar Senha</h3>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite a senha novamente" />
                </div>
                <div className="flex gap-2">
                  <Button variant="gold" onClick={handleChangePassword} disabled={savingPassword}>
                    {savingPassword ? 'Salvando...' : 'Alterar Senha'}
                  </Button>
                  <Button variant="outline" onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}>Cancelar</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <MyCampaignsCard />

      <div className="mt-6">
        <FriendsList />
      </div>
    </div>
  );
};

export default Profile;
