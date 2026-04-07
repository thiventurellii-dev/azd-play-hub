import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';

interface BloodScript {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  image_url: string | null;
  victory_conditions: string[];
}

interface BloodCharacter {
  id: string;
  script_id: string;
  name: string;
  name_en: string;
  team: 'good' | 'evil';
  role_type: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  description: string | null;
  icon_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: BloodScript | null;
  onSaved: () => void;
  /** If true, shows character management (admin mode). Default false. */
  showCharacters?: boolean;
}

const teamLabels: Record<string, string> = { good: 'Bem', evil: 'Mal' };
const roleTypeLabels: Record<string, string> = { townsfolk: 'Cidadão', outsider: 'Forasteiro', minion: 'Lacaio', demon: 'Demônio' };

const roleColor = (rt: string) => {
  if (rt === 'demon') return 'text-red-500';
  if (rt === 'minion') return 'text-orange-400';
  if (rt === 'outsider') return 'text-cyan-400';
  return 'text-blue-300';
};

const EditBloodScriptDialog = ({ open, onOpenChange, script, onSaved, showCharacters = false }: Props) => {
  const { notify } = useNotification();

  // Script form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [victoryConditions, setVictoryConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState('');

  // Characters (only loaded when showCharacters=true)
  const [characters, setCharacters] = useState<BloodCharacter[]>([]);
  const [allCharacters, setAllCharacters] = useState<BloodCharacter[]>([]);
  const [allScripts, setAllScripts] = useState<{ id: string; name: string }[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Add existing character
  const [addExistingCharId, setAddExistingCharId] = useState('');

  // New character form
  const [newCharOpen, setNewCharOpen] = useState(false);
  const [charName, setCharName] = useState('');
  const [charNameEn, setCharNameEn] = useState('');
  const [charTeam, setCharTeam] = useState<'good' | 'evil'>('good');
  const [charRoleType, setCharRoleType] = useState<BloodCharacter['role_type']>('townsfolk');
  const [charDesc, setCharDesc] = useState('');

  // Edit character
  const [editCharOpen, setEditCharOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<BloodCharacter | null>(null);
  const [editCharForm, setEditCharForm] = useState({ name: '', name_en: '', team: 'good' as 'good' | 'evil', role_type: 'townsfolk' as BloodCharacter['role_type'], description: '' });

  useEffect(() => {
    if (!script || !open) return;
    setName(script.name);
    setDescription(script.description || '');
    setImageUrl(script.image_url || '');
    setVictoryConditions(Array.isArray(script.victory_conditions) ? [...script.victory_conditions] : []);
    setNewCondition('');

    if (showCharacters) {
      fetchCharacters();
    }
  }, [script, open]);

  const fetchCharacters = async () => {
    if (!script) return;
    const [charsRes, allCharsRes, scriptsRes] = await Promise.all([
      supabase.from('blood_characters').select('*').eq('script_id', script.id).order('team, role_type, name'),
      supabase.from('blood_characters').select('*').order('team, role_type, name'),
      supabase.from('blood_scripts').select('id, name').order('name'),
    ]);
    setCharacters((charsRes.data || []) as BloodCharacter[]);
    setAllCharacters((allCharsRes.data || []) as BloodCharacter[]);
    setAllScripts((scriptsRes.data || []) as { id: string; name: string }[]);
  };

  const handleSave = async () => {
    if (!script) return;
    const { error } = await supabase.from('blood_scripts').update({
      name,
      description: description || null,
      image_url: imageUrl || null,
      victory_conditions: victoryConditions as any,
    }).eq('id', script.id);
    if (error) return notify('error', error.message);
    notify('success', 'Script atualizado!');
    onOpenChange(false);
    onSaved();
  };

  // Character handlers
  const handleCreateChar = async () => {
    if (!script || !charName || !charNameEn) return notify('error', 'Preencha nome (PT) e nome (EN)');
    const { error } = await supabase.from('blood_characters').insert({
      name: charName, name_en: charNameEn, team: charTeam, role_type: charRoleType,
      script_id: script.id, description: charDesc || null,
    });
    if (error) return notify('error', error.message);
    notify('success', 'Personagem criado!');
    setCharName(''); setCharNameEn(''); setCharDesc('');
    setNewCharOpen(false);
    fetchCharacters();
    onSaved();
  };

  const handleDeleteChar = async (id: string) => {
    const { error } = await supabase.from('blood_characters').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Personagem removido');
    fetchCharacters();
    onSaved();
  };

  const openEditChar = (c: BloodCharacter) => {
    setEditingChar(c);
    setEditCharForm({ name: c.name, name_en: c.name_en, team: c.team, role_type: c.role_type, description: c.description || '' });
    setEditCharOpen(true);
  };

  const handleEditCharSave = async () => {
    if (!editingChar) return;
    const { error } = await supabase.from('blood_characters').update({
      name: editCharForm.name, name_en: editCharForm.name_en,
      team: editCharForm.team, role_type: editCharForm.role_type,
      description: editCharForm.description || null,
    }).eq('id', editingChar.id);
    if (error) return notify('error', error.message);
    notify('success', 'Personagem atualizado!');
    setEditCharOpen(false);
    fetchCharacters();
    onSaved();
  };

  const handleAddExistingChar = async () => {
    if (!script || !addExistingCharId) return notify('error', 'Selecione um personagem');
    const { error } = await supabase.from('blood_characters').update({ script_id: script.id }).eq('id', addExistingCharId);
    if (error) return notify('error', error.message);
    notify('success', 'Personagem adicionado ao script!');
    setAddExistingCharId('');
    fetchCharacters();
    onSaved();
  };

  const otherChars = allCharacters.filter(c => c.script_id !== script?.id);
  const goodChars = characters.filter(c => c.team === 'good');
  const evilChars = characters.filter(c => c.team === 'evil');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Script</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>URL da Imagem</Label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.png" />
            </div>
            <div className="space-y-2">
              <Label>Condições de Vitória Especiais</Label>
              <div className="space-y-2">
                {victoryConditions.map((vc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={vc} onChange={e => {
                      const updated = [...victoryConditions];
                      updated[i] = e.target.value;
                      setVictoryConditions(updated);
                    }} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setVictoryConditions(victoryConditions.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="Ex: Vitória pelo Prefeito" />
                  <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => {
                    if (newCondition.trim()) {
                      setVictoryConditions([...victoryConditions, newCondition.trim()]);
                      setNewCondition('');
                    }
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Character management */}
            {showCharacters && (
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Personagens ({characters.length})</Label>
                  <Button variant="outline" size="sm" onClick={() => setNewCharOpen(!newCharOpen)}>
                    <Plus className="h-3 w-3 mr-1" /> Novo Personagem
                  </Button>
                </div>

                {newCharOpen && (
                  <div className="border border-border rounded-lg p-3 space-y-3">
                    <div className="grid gap-3 grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome (PT)</Label>
                        <Input value={charName} onChange={e => setCharName(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome (EN)</Label>
                        <Input value={charNameEn} onChange={e => setCharNameEn(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Time</Label>
                        <Select value={charTeam} onValueChange={v => setCharTeam(v as 'good' | 'evil')}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Bem</SelectItem>
                            <SelectItem value="evil">Mal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={charRoleType} onValueChange={v => setCharRoleType(v as BloodCharacter['role_type'])}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="townsfolk">Cidadão</SelectItem>
                            <SelectItem value="outsider">Forasteiro</SelectItem>
                            <SelectItem value="minion">Lacaio</SelectItem>
                            <SelectItem value="demon">Demônio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={charDesc} onChange={e => setCharDesc(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <Button variant="gold" size="sm" onClick={handleCreateChar}>Criar</Button>
                  </div>
                )}

                {/* Good team */}
                {goodChars.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-400 mb-1">👼 Bem ({goodChars.length})</p>
                    <div className="space-y-1">
                      {goodChars.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded px-2 py-1.5">
                          <div>
                            <span className={`text-xs font-medium ${roleColor(c.role_type)}`}>{c.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({c.name_en}) · {roleTypeLabels[c.role_type]}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditChar(c)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteChar(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evil team */}
                {evilChars.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1">😈 Mal ({evilChars.length})</p>
                    <div className="space-y-1">
                      {evilChars.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded px-2 py-1.5">
                          <div>
                            <span className={`text-xs font-medium ${roleColor(c.role_type)}`}>{c.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({c.name_en}) · {roleTypeLabels[c.role_type]}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditChar(c)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteChar(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {characters.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum personagem neste script.</p>}

                {/* Add existing character */}
                {otherChars.length > 0 && (
                  <div className="border-t border-border pt-2">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1"><UserPlus className="h-3 w-3" /> Mover personagem para este script</p>
                    <div className="flex items-center gap-2">
                      <Select value={addExistingCharId} onValueChange={setAddExistingCharId}>
                        <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {otherChars.map(c => {
                            const fromScript = allScripts.find(s => s.id === c.script_id);
                            return (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.name_en}) — {teamLabels[c.team]}/{roleTypeLabels[c.role_type]} {fromScript ? `[${fromScript.name}]` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button variant="gold" size="sm" className="h-8" onClick={handleAddExistingChar}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button variant="gold" onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Character sub-dialog */}
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
    </>
  );
};

export default EditBloodScriptDialog;
