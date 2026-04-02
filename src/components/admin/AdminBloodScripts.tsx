import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

interface BloodScript {
  id: string;
  name: string;
  description: string | null;
}

interface BloodCharacter {
  id: string;
  script_id: string;
  name: string;
  name_en: string;
  team: 'good' | 'evil';
  role_type: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  description: string | null;
}

const teamLabels: Record<string, string> = { good: 'Bem', evil: 'Mal' };
const roleTypeLabels: Record<string, string> = { townsfolk: 'Cidadão', outsider: 'Forasteiro', minion: 'Lacaio', demon: 'Demônio' };

const AdminBloodScripts = () => {
  const { notify } = useNotification();
  const [scripts, setScripts] = useState<BloodScript[]>([]);
  const [characters, setCharacters] = useState<BloodCharacter[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  // New script form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // New character form
  const [charName, setCharName] = useState('');
  const [charNameEn, setCharNameEn] = useState('');
  const [charTeam, setCharTeam] = useState<'good' | 'evil'>('good');
  const [charRoleType, setCharRoleType] = useState<'townsfolk' | 'outsider' | 'minion' | 'demon'>('townsfolk');
  const [charDesc, setCharDesc] = useState('');
  const [charScriptId, setCharScriptId] = useState('');

  // Edit script dialog
  const [editScriptOpen, setEditScriptOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<BloodScript | null>(null);
  const [editScriptForm, setEditScriptForm] = useState({ name: '', description: '' });

  // Edit character dialog
  const [editCharOpen, setEditCharOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<BloodCharacter | null>(null);
  const [editCharForm, setEditCharForm] = useState({ name: '', name_en: '', team: 'good' as 'good' | 'evil', role_type: 'townsfolk' as BloodCharacter['role_type'], description: '' });

  const fetchData = async () => {
    const [scriptsRes, charsRes] = await Promise.all([
      supabase.from('blood_scripts').select('*').order('name'),
      supabase.from('blood_characters').select('*').order('team, role_type, name'),
    ]);
    setScripts((scriptsRes.data || []) as BloodScript[]);
    setCharacters((charsRes.data || []) as BloodCharacter[]);
  };

  useEffect(() => { fetchData(); }, []);

  // Script CRUD
  const handleCreateScript = async () => {
    if (!newName) return notify('error', 'Nome obrigatório');
    const { error } = await supabase.from('blood_scripts').insert({ name: newName, description: newDesc || null });
    if (error) return notify('error', error.message);
    notify('success', 'Script criado!');
    setNewName(''); setNewDesc('');
    fetchData();
  };

  const handleDeleteScript = async (id: string) => {
    const hasChars = characters.some(c => c.script_id === id);
    if (hasChars) return notify('error', 'Remova os personagens antes de excluir o script');
    const { error } = await supabase.from('blood_scripts').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Script removido');
    fetchData();
  };

  const openEditScript = (s: BloodScript) => {
    setEditingScript(s);
    setEditScriptForm({ name: s.name, description: s.description || '' });
    setEditScriptOpen(true);
  };

  const handleEditScriptSave = async () => {
    if (!editingScript) return;
    const { error } = await supabase.from('blood_scripts').update({
      name: editScriptForm.name,
      description: editScriptForm.description || null,
    }).eq('id', editingScript.id);
    if (error) return notify('error', error.message);
    notify('success', 'Script atualizado!');
    setEditScriptOpen(false);
    fetchData();
  };

  // Character CRUD
  const handleCreateChar = async () => {
    if (!charName || !charNameEn || !charScriptId) return notify('error', 'Preencha nome (PT), nome (EN) e script');
    const { error } = await supabase.from('blood_characters').insert({
      name: charName,
      name_en: charNameEn,
      team: charTeam,
      role_type: charRoleType,
      script_id: charScriptId,
      description: charDesc || null,
    });
    if (error) return notify('error', error.message);
    notify('success', 'Personagem criado!');
    setCharName(''); setCharNameEn(''); setCharDesc('');
    fetchData();
  };

  const handleDeleteChar = async (id: string) => {
    const { error } = await supabase.from('blood_characters').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Personagem removido');
    fetchData();
  };

  const openEditChar = (c: BloodCharacter) => {
    setEditingChar(c);
    setEditCharForm({ name: c.name, name_en: c.name_en, team: c.team, role_type: c.role_type, description: c.description || '' });
    setEditCharOpen(true);
  };

  const handleEditCharSave = async () => {
    if (!editingChar) return;
    const { error } = await supabase.from('blood_characters').update({
      name: editCharForm.name,
      name_en: editCharForm.name_en,
      team: editCharForm.team,
      role_type: editCharForm.role_type,
      description: editCharForm.description || null,
    }).eq('id', editingChar.id);
    if (error) return notify('error', error.message);
    notify('success', 'Personagem atualizado!');
    setEditCharOpen(false);
    fetchData();
  };

  const getScriptChars = (scriptId: string) => characters.filter(c => c.script_id === scriptId);

  const teamColor = (team: string) => team === 'evil' ? 'text-red-400' : 'text-blue-400';
  const roleColor = (rt: string) => {
    if (rt === 'demon') return 'text-red-500';
    if (rt === 'minion') return 'text-orange-400';
    if (rt === 'outsider') return 'text-cyan-400';
    return 'text-blue-300';
  };

  return (
    <div className="space-y-6">
      {/* New Script */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Novo Script</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Script</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Sects & Violets" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Script avançado..." />
            </div>
          </div>
          <Button variant="gold" onClick={handleCreateScript}><Plus className="h-4 w-4 mr-1" /> Criar Script</Button>
        </CardContent>
      </Card>

      {/* New Character */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Novo Personagem</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Script</Label>
              <Select value={charScriptId} onValueChange={setCharScriptId}>
                <SelectTrigger><SelectValue placeholder="Selecione o script" /></SelectTrigger>
                <SelectContent>
                  {scripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome (PT)</Label>
              <Input value={charName} onChange={e => setCharName(e.target.value)} placeholder="Capeta" />
            </div>
            <div className="space-y-2">
              <Label>Nome (EN)</Label>
              <Input value={charNameEn} onChange={e => setCharNameEn(e.target.value)} placeholder="Imp" />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={charTeam} onValueChange={v => setCharTeam(v as 'good' | 'evil')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Bem</SelectItem>
                  <SelectItem value="evil">Mal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={charRoleType} onValueChange={v => setCharRoleType(v as BloodCharacter['role_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="townsfolk">Cidadão</SelectItem>
                  <SelectItem value="outsider">Forasteiro</SelectItem>
                  <SelectItem value="minion">Lacaio</SelectItem>
                  <SelectItem value="demon">Demônio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={charDesc} onChange={e => setCharDesc(e.target.value)} placeholder="Habilidade do personagem" />
            </div>
          </div>
          <Button variant="gold" onClick={handleCreateChar}><Plus className="h-4 w-4 mr-1" /> Adicionar Personagem</Button>
        </CardContent>
      </Card>

      {/* Scripts list with characters */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Scripts Cadastrados ({scripts.length})</h3>
        {scripts.map(s => {
          const chars = getScriptChars(s.id);
          const isExpanded = expandedScript === s.id;
          const goodChars = chars.filter(c => c.team === 'good');
          const evilChars = chars.filter(c => c.team === 'evil');
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => setExpandedScript(isExpanded ? null : s.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.description || 'Sem descrição'} · {chars.length} personagens</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditScript(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteScript(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    {/* Good team */}
                    {goodChars.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-blue-400 mb-2">👼 Time do Bem ({goodChars.length})</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {goodChars.map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2">
                              <div>
                                <span className={`text-sm font-medium ${roleColor(c.role_type)}`}>{c.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">({c.name_en})</span>
                                <p className="text-xs text-muted-foreground">{roleTypeLabels[c.role_type]}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditChar(c)}><Pencil className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteChar(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Evil team */}
                    {evilChars.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-400 mb-2">😈 Time do Mal ({evilChars.length})</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {evilChars.map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2">
                              <div>
                                <span className={`text-sm font-medium ${roleColor(c.role_type)}`}>{c.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">({c.name_en})</span>
                                <p className="text-xs text-muted-foreground">{roleTypeLabels[c.role_type]}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditChar(c)}><Pencil className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteChar(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {chars.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum personagem cadastrado neste script.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Script Dialog */}
      <Dialog open={editScriptOpen} onOpenChange={setEditScriptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Script</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editScriptForm.name} onChange={e => setEditScriptForm({ ...editScriptForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editScriptForm.description} onChange={e => setEditScriptForm({ ...editScriptForm, description: e.target.value })} />
            </div>
            <Button variant="gold" onClick={handleEditScriptSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Character Dialog */}
      <Dialog open={editCharOpen} onOpenChange={setEditCharOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Personagem</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome (PT)</Label>
                <Input value={editCharForm.name} onChange={e => setEditCharForm({ ...editCharForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome (EN)</Label>
                <Input value={editCharForm.name_en} onChange={e => setEditCharForm({ ...editCharForm, name_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={editCharForm.team} onValueChange={v => setEditCharForm({ ...editCharForm, team: v as 'good' | 'evil' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Bem</SelectItem>
                    <SelectItem value="evil">Mal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editCharForm.role_type} onValueChange={v => setEditCharForm({ ...editCharForm, role_type: v as BloodCharacter['role_type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="townsfolk">Cidadão</SelectItem>
                    <SelectItem value="outsider">Forasteiro</SelectItem>
                    <SelectItem value="minion">Lacaio</SelectItem>
                    <SelectItem value="demon">Demônio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editCharForm.description} onChange={e => setEditCharForm({ ...editCharForm, description: e.target.value })} />
            </div>
            <Button variant="gold" onClick={handleEditCharSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBloodScripts;
