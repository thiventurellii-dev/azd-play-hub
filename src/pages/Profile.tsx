import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseExternal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotification } from '@/components/NotificationDialog';
import { Pencil, Lock, Camera, Mail, UserCheck } from 'lucide-react';
import { brazilianStates, formatPhone } from '@/lib/brazil-data';
import FriendsList from '@/components/friendlist/FriendsList';
import XpBadge from '@/components/shared/XpBadge';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { PlayerTagsBadges, PlayerTag } from '@/components/profile/PlayerTagsSelector';
import { useProfileTags } from '@/hooks/useProfileTags';
import { MyCampaignsCard } from '@/components/rpg/MyCampaignsCard';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { ClaimGuestDialog } from '@/components/profile/ClaimGuestDialog';
import { PostSignupGuestMatchDialog } from '@/components/profile/PostSignupGuestMatchDialog';

const Profile = () => {
  const { user, role } = useAuth();
  const { notify } = useNotification();
  useProfileCompletion();
  const [editing, setEditing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [autoMatchOpen, setAutoMatchOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', country_code: '+55', state: '', city: '', birth_date: '', gender: '', pronouns: '', email: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tags: playerTags, setTags: setPlayerTags } = useProfileTags(user?.id);

  // Email change
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);

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

  // Auto-sugestão de reivindicação de guests (uma vez por usuário)
  useEffect(() => {
    if (!user) return;
    const key = `azd:guest-match-checked:${user.id}`;
    if (localStorage.getItem(key)) return;
    supabase.rpc('find_matching_guests', { p_profile_id: user.id }).then(({ data, error }) => {
      if (error) { console.warn('find_matching_guests error', error); return; }
      const matches = (data as any[]) || [];
      if (matches.length > 0) setAutoMatchOpen(true);
      localStorage.setItem(key, '1');
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
              <Button variant="outline" size="sm" onClick={() => setClaiming(true)}>
                <UserCheck className="h-4 w-4 mr-1" /> Reivindicar Convidado
              </Button>
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

      {user && (
        <EditProfileDialog
          open={editing}
          onOpenChange={setEditing}
          userId={user.id}
          initialProfile={profile}
          initialTags={playerTags}
          onSaved={handleProfileSaved}
        />
      )}

      <ClaimGuestDialog open={claiming} onOpenChange={setClaiming} />
      {user && (
        <PostSignupGuestMatchDialog
          open={autoMatchOpen}
          onOpenChange={setAutoMatchOpen}
          profileId={user.id}
        />
      )}
    </div>
  );
};

export default Profile;
