import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useNotification } from '@/components/NotificationDialog';
import { Shield, User, Pencil, Search, Lock, Crown, Plus, Check, XCircle, Trash2, CalendarIcon } from 'lucide-react';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';
interface PlayerWithRole {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  country_code: string;
  state: string;
  city: string;
  birth_date: string;
  gender: string;
  pronouns: string;
  role: string;
  status: string;
}

const emptyForm = { name: '', nickname: '', email: '', phone: '', country_code: '+55', state: '', city: '', birth_date: '', gender: '', pronouns: '', password: '' };

const statusLabels: Record<string, string> = { pending: 'Cadastro Pendente', pending_approval: 'Aguardando Aprovação', active: 'Ativo', disabled: 'Desativado', approved: 'Cadastro Pendente' };
const statusColors: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-400', pending_approval: 'bg-orange-500/20 text-orange-400', active: 'bg-green-500/20 text-green-400', disabled: 'bg-red-500/20 text-red-400', approved: 'bg-yellow-500/20 text-yellow-400' };

const AdminPlayers = () => {
  const { notify } = useNotification();
  const { role: currentRole, user } = useAuth();
  const isSuperAdmin = currentRole === 'super_admin';
  const [players, setPlayers] = useState<PlayerWithRole[]>([]);
  const [search, setSearch] = useState('');

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithRole | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editRole, setEditRole] = useState('player');
  const [editStatus, setEditStatus] = useState('active');

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);

  // Reset password
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPlayerId, setResetPlayerId] = useState('');
  const [resetPlayerName, setResetPlayerName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const cities = useMemo(() => citiesByState[form.state] || [], [form.state]);
  const createCities = useMemo(() => citiesByState[createForm.state] || [], [createForm.state]);

  const fetchPlayers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('name');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    const roleMap: Record<string, string> = {};
    for (const r of (roles || [])) roleMap[r.user_id] = r.role;

    setPlayers((profiles || []).map(p => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname || '',
      email: p.email || '',
      phone: p.phone || '',
      country_code: p.country_code || '+55',
      state: p.state || '',
      city: p.city || '',
      birth_date: p.birth_date || '',
      gender: p.gender || '',
      pronouns: (p as any).pronouns || '',
      role: roleMap[p.id] || 'player',
      status: (p as any).status || 'pending',
    })));
  };

  useEffect(() => { fetchPlayers(); }, []);

  const filteredPlayers = players.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.nickname || '').toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p: PlayerWithRole) => {
    setEditingPlayer(p);
    setForm({
      name: p.name,
      nickname: p.nickname,
      email: p.email,
      phone: formatPhone(p.phone),
      country_code: p.country_code,
      state: p.state,
      city: p.city,
      birth_date: p.birth_date,
      gender: p.gender,
      pronouns: p.pronouns,
      password: '',
    });
    setEditRole(p.role);
    setEditStatus(p.status);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingPlayer) return;

    // Update profile
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      nickname: form.nickname,
      email: form.email,
      phone: unformatPhone(form.phone),
      country_code: form.country_code,
      state: form.state,
      city: form.city,
      birth_date: form.birth_date || null,
      gender: form.gender,
      pronouns: form.pronouns,
      status: editStatus,
    } as any).eq('id', editingPlayer.id);
    if (error) return notify('error', error.message);

    // Update auth email if changed
    if (form.email !== editingPlayer.email) {
      const { data: emailData, error: emailError } = await invokeEdgeFunction('admin-update-email', {
        user_id: editingPlayer.id, email: form.email,
      });
      if (emailError || emailData?.error) {
        notify('error', emailData?.error || emailError?.message || 'Erro ao atualizar e-mail de login');
      }
    }

    // Update role (only if allowed)
    if (editingPlayer.role !== editRole) {
      if (editingPlayer.role === 'super_admin' && !isSuperAdmin) {
        notify('error', 'Apenas super admins podem alterar o role de super admins');
      } else {
        await supabase.from('user_roles').upsert({ user_id: editingPlayer.id, role: editRole } as any, { onConflict: 'user_id' });
      }
    }

    notify('success', 'Jogador atualizado!');
    setEditDialogOpen(false);
    fetchPlayers();
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.nickname || !createForm.password) {
      return notify('error', 'E-mail, nick e senha são obrigatórios');
    }
    if (createForm.password.length < 8) return notify('error', 'Senha deve ter no mínimo 8 caracteres');

    const { data, error } = await invokeEdgeFunction('bulk-create-users', {
      users: [{ nick: createForm.nickname, email: createForm.email, password: createForm.password }],
    });
    if (error) return notify('error', error.message);

    const result = data?.[0];
    if (result?.error) return notify('error', result.error);

    if (result?.id) {
      await supabase.from('profiles').update({
        name: createForm.name || createForm.nickname,
        phone: unformatPhone(createForm.phone),
        country_code: createForm.country_code,
        state: createForm.state,
        city: createForm.city,
        birth_date: createForm.birth_date || null,
        gender: createForm.gender,
        pronouns: createForm.pronouns,
      } as any).eq('id', result.id);
    }
    notify('success', 'Jogador criado!');
    setCreateDialogOpen(false);
    setCreateForm(emptyForm);
    fetchPlayers();
  };

  const openResetPassword = (p: PlayerWithRole) => {
    setResetPlayerId(p.id);
    setResetPlayerName(p.nickname || p.name);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) return notify('error', 'Preencha ambos os campos');
    if (newPassword !== confirmPassword) return notify('error', 'As senhas não coincidem');
    if (newPassword.length < 8) return notify('error', 'Mínimo 8 caracteres');
    if (!/[A-Z]/.test(newPassword)) return notify('error', 'Inclua ao menos uma letra maiúscula');
    if (!/[a-z]/.test(newPassword)) return notify('error', 'Inclua ao menos uma letra minúscula');
    if (!/[^A-Za-z0-9]/.test(newPassword)) return notify('error', 'Inclua ao menos um caractere especial');

    setResetting(true);
    const { data, error } = await invokeEdgeFunction('admin-reset-password', {
      user_id: resetPlayerId, new_password: newPassword,
    });
    setResetting(false);
    if (error || data?.error) return notify('error', data?.error || error?.message || 'Erro ao resetar senha');
    notify('success', `Senha de ${resetPlayerName} resetada!`);
    setResetPasswordOpen(false);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin') return <Crown className="h-3 w-3 mr-1" />;
    if (role === 'admin') return <Shield className="h-3 w-3 mr-1" />;
    return <User className="h-3 w-3 mr-1" />;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    return 'Player';
  };

  const handleApprove = async (player: PlayerWithRole) => {
    const { error } = await supabase.from('profiles').update({ status: 'active' } as any).eq('id', player.id);
    if (error) return notify('error', error.message);
    notify('success', `${player.nickname || player.name} aprovado!`);
    fetchPlayers();
  };

  const handleReject = async (player: PlayerWithRole) => {
    const { error } = await supabase.from('profiles').update({ status: 'disabled' } as any).eq('id', player.id);
    if (error) return notify('error', error.message);
    notify('success', `${player.nickname || player.name} rejeitado.`);
    fetchPlayers();
  };

  const handleDisableAccount = async (player: PlayerWithRole) => {
    const { error } = await supabase.from('profiles').update({ status: 'disabled' } as any).eq('id', player.id);
    if (error) return notify('error', error.message);
    notify('success', `Conta de ${player.nickname || player.name} desativada.`);
    setEditDialogOpen(false);
    fetchPlayers();
  };

  const handleRequestDisable = async (player: PlayerWithRole) => {
    const { error } = await supabase.from('account_disable_requests' as any).insert({
      target_user_id: player.id,
      requested_by: user?.id,
      reason: '',
      status: 'pending',
    } as any);
    if (error) return notify('error', error.message);
    notify('success', `Solicitação de desativação enviada para aprovação de Super Admin.`);
    setEditDialogOpen(false);
    fetchDisableRequests();
  };

  const handleDeleteAccount = async (player: PlayerWithRole) => {
    // Delete related data first, then profile
    await supabase.from('user_roles').delete().eq('user_id', player.id);
    await supabase.from('friendships').delete().or(`user_id.eq.${player.id},friend_id.eq.${player.id}`);
    await supabase.from('match_room_players').delete().eq('player_id', player.id);
    await supabase.from('push_subscriptions').delete().eq('user_id', player.id);
    await supabase.from('notifications').delete().eq('user_id', player.id);
    const { error } = await supabase.from('profiles').delete().eq('id', player.id);
    if (error) return notify('error', error.message);
    notify('success', `Conta de ${player.nickname || player.name} excluída permanentemente.`);
    setEditDialogOpen(false);
    fetchPlayers();
  };

  // Disable requests (super admin)
  const [disableRequests, setDisableRequests] = useState<any[]>([]);

  const fetchDisableRequests = async () => {
    const { data } = await supabase.from('account_disable_requests' as any).select('*').eq('status', 'pending');
    if (data) setDisableRequests(data);
  };

  const handleApproveDisable = async (req: any) => {
    await supabase.from('profiles').update({ status: 'disabled' } as any).eq('id', req.target_user_id);
    await supabase.from('account_disable_requests' as any).update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any).eq('id', req.id);
    notify('success', 'Conta desativada com sucesso.');
    fetchDisableRequests();
    fetchPlayers();
  };

  const handleRejectDisable = async (req: any) => {
    await supabase.from('account_disable_requests' as any).update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any).eq('id', req.id);
    notify('success', 'Solicitação de desativação rejeitada.');
    fetchDisableRequests();
  };

  useEffect(() => { fetchDisableRequests(); }, []);

  const pendingApprovalPlayers = players.filter(p => p.status === 'pending_approval');

  return (
    <div className="space-y-6">
      {/* Pending Disable Requests for Super Admins */}
      {isSuperAdmin && disableRequests.length > 0 && (
        <Card className="bg-card border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Solicitações de Desativação ({disableRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disableRequests.map((req: any) => {
              const targetPlayer = players.find(p => p.id === req.target_user_id);
              const requester = players.find(p => p.id === req.requested_by);
              return (
                <div key={req.id} className="flex items-center justify-between rounded-lg border border-destructive/20 p-3">
                  <div>
                    <p className="font-semibold">{targetPlayer?.nickname || targetPlayer?.name || 'Jogador'}</p>
                    <p className="text-xs text-muted-foreground">Solicitado por: {requester?.nickname || requester?.name || 'Admin'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleApproveDisable(req)}>
                      <Check className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleRejectDisable(req)}>
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending Approval Section */}
      {pendingApprovalPlayers.length > 0 && (
        <Card className="bg-card border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400">Aguardando Aprovação ({pendingApprovalPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovalPlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-orange-500/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-gold font-bold">
                    {(p.nickname || p.name)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{p.nickname || p.name}</p>
                    {p.name && p.nickname && <p className="text-xs text-muted-foreground">{p.name}</p>}
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleApprove(p)}>
                    <Check className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleReject(p)}>
                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gerenciar Jogadores</CardTitle>
            <Button variant="gold" size="sm" onClick={() => { setCreateForm(emptyForm); setCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Jogador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou nick..." className="pl-10" />
          </div>

          <div className="space-y-3">
            {filteredPlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-gold font-bold">
                    {(p.nickname || p.name)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{p.nickname || p.name}</p>
                    {p.name && p.nickname && <p className="text-xs text-muted-foreground">{p.name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={p.role === 'super_admin' ? 'default' : p.role === 'admin' ? 'default' : 'secondary'} className={`text-xs ${p.role === 'super_admin' ? 'bg-gold text-black' : ''}`}>
                        {getRoleIcon(p.role)}{getRoleLabel(p.role)}
                      </Badge>
                      <Badge className={`text-xs ${statusColors[p.status] || statusColors.pending}`}>
                        {statusLabels[p.status] || p.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Jogador</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="flex gap-2">
                <Select value={form.country_code} onValueChange={v => setForm({ ...form, country_code: v })}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="flex-1" value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.state} onValueChange={v => setForm({ ...form, state: v, city: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
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
                <Label>Data de Nascimento</Label>
                <div className="relative">
                  <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} className="pr-10" />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gênero</Label>
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
              <Label>Pronomes</Label>
              <Select value={form.pronouns} onValueChange={v => setForm({ ...form, pronouns: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {pronounsOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editRole}
                  onValueChange={setEditRole}
                  disabled={editingPlayer?.role === 'super_admin' && !isSuperAdmin}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                <SelectItem value="pending">Cadastro Pendente</SelectItem>
                    <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="disabled">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button variant="gold" onClick={handleEditSave} className="w-full">Salvar Alterações</Button>

            <Separator />

            <Button variant="outline" className="w-full" onClick={() => { setEditDialogOpen(false); openResetPassword(editingPlayer!); }}>
              <Lock className="h-4 w-4 mr-1" /> Resetar Senha
            </Button>

            {editingPlayer && editingPlayer.status !== 'disabled' && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (isSuperAdmin) {
                    handleDisableAccount(editingPlayer);
                  } else {
                    handleRequestDisable(editingPlayer);
                  }
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {isSuperAdmin ? 'Desativar Conta' : 'Solicitar Desativação'}
              </Button>
            )}

            {isSuperAdmin && editingPlayer && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full border-destructive/50 bg-destructive/10 hover:bg-destructive/20">
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir Conta Permanentemente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação é irreversível. Todos os dados de <strong>{editingPlayer.nickname || editingPlayer.name}</strong> serão removidos permanentemente, incluindo amizades, notificações e inscrições em salas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteAccount(editingPlayer)}>
                      Excluir Permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Jogador</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="jogador@azd.com.br" />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nickname *</Label>
                <Input value={createForm.nickname} onChange={e => setCreateForm({ ...createForm, nickname: e.target.value })} placeholder="Apelido" />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nome" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="flex gap-2">
                <Select value={createForm.country_code} onValueChange={v => setCreateForm({ ...createForm, country_code: v })}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="flex-1" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={createForm.state} onValueChange={v => setCreateForm({ ...createForm, state: v, city: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Select value={createForm.city} onValueChange={v => setCreateForm({ ...createForm, city: v })} disabled={!createForm.state}>
                  <SelectTrigger><SelectValue placeholder={createForm.state ? 'Selecione' : 'Selecione o estado'} /></SelectTrigger>
                  <SelectContent>
                    {createCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="gold" onClick={handleCreate} className="w-full">Criar Jogador</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resetar Senha — {resetPlayerName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite novamente" />
            </div>
            <Button variant="gold" onClick={handleResetPassword} disabled={resetting} className="w-full">
              {resetting ? 'Resetando...' : 'Resetar Senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlayers;
