import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, Award } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  criteria: string | null;
  trigger_type: string;
  trigger_config: any;
}

const AdminAchievements = () => {
  const { notify } = useNotification();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [criteria, setCriteria] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [triggerConfig, setTriggerConfig] = useState('');

  const fetch = async () => {
    const { data } = await supabase.from('achievement_definitions').select('*').order('created_at');
    setAchievements((data || []) as Achievement[]);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!name) return notify('error', 'Nome obrigatório');
    const { error } = await supabase.from('achievement_definitions').insert({
      name,
      description: description || null,
      icon: icon || '🏆',
      criteria: criteria || null,
      trigger_type: triggerType,
      trigger_config: triggerConfig ? JSON.parse(triggerConfig) : null,
    } as any);
    if (error) return notify('error', error.message);
    notify('success', 'Achievement criado!');
    setName(''); setDescription(''); setIcon('🏆'); setCriteria(''); setTriggerType('manual'); setTriggerConfig('');
    fetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('achievement_definitions').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Removido');
    fetch();
  };

  // Grant achievement to a player
  const [grantPlayerId, setGrantPlayerId] = useState('');
  const [grantAchievementId, setGrantAchievementId] = useState('');
  const [players, setPlayers] = useState<{ id: string; name: string; nickname: string | null }[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, name, nickname').eq('status', 'active').order('name').then(({ data }) => {
      setPlayers((data || []) as any[]);
    });
  }, []);

  const handleGrant = async () => {
    if (!grantPlayerId || !grantAchievementId) return notify('error', 'Selecione jogador e achievement');
    const { error } = await supabase.from('player_achievements').insert({
      player_id: grantPlayerId,
      achievement_id: grantAchievementId,
    });
    if (error) {
      if (error.code === '23505') return notify('error', 'Jogador já possui este achievement');
      return notify('error', error.message);
    }
    notify('success', 'Achievement concedido!');
    setGrantPlayerId(''); setGrantAchievementId('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Novo Achievement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mestre dos Dados" />
            </div>
            <div className="space-y-2">
              <Label>Ícone (emoji)</Label>
              <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏆" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do achievement" />
          </div>
          <div className="space-y-2">
            <Label>Critério (visível para jogadores)</Label>
            <Input value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Ex: Vencer 10 partidas de Brass" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={triggerType}
                onChange={e => setTriggerType(e.target.value)}
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automático</option>
              </select>
            </div>
            {triggerType === 'automatic' && (
              <div className="space-y-2">
                <Label>Config JSON</Label>
                <Input value={triggerConfig} onChange={e => setTriggerConfig(e.target.value)} placeholder='{"type":"first_win"}' />
                <p className="text-xs text-muted-foreground">Tipos: first_win, total_games(n), win_streak(n), games_in_day(n)</p>
              </div>
            )}
          </div>
          <Button variant="gold" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Criar</Button>
        </CardContent>
      </Card>

      {/* Grant section */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Conceder Achievement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jogador</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={grantPlayerId}
                onChange={e => setGrantPlayerId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.nickname || p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Achievement</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={grantAchievementId}
                onChange={e => setGrantAchievementId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {achievements.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="gold" onClick={handleGrant}><Award className="h-4 w-4 mr-1" /> Conceder</Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {achievements.map(a => (
          <Card key={a.id} className="bg-card border-border">
            <CardContent className="py-4 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.icon} {a.name}</p>
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                {a.criteria && <p className="text-xs text-gold mt-1">📋 {a.criteria}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminAchievements;
