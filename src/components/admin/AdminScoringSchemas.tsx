import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react';

interface Game { id: string; name: string; }
interface Subcategory { key: string; label: string; type: string; }
interface Category { key: string; label: string; type: string; subcategories?: Subcategory[]; }

const AdminScoringSchemas = () => {
  const { notify } = useNotification();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingSchemas, setExistingSchemas] = useState<Record<string, Category[]>>({});
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [gamesRes, schemasRes] = await Promise.all([
        supabase.from('games').select('id, name').order('name'),
        supabase.from('game_scoring_schemas').select('game_id, schema'),
      ]);
      setGames(gamesRes.data || []);
      const map: Record<string, Category[]> = {};
      for (const s of (schemasRes.data || [])) {
        map[s.game_id] = (s.schema as any)?.categories || [];
      }
      setExistingSchemas(map);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedGame && existingSchemas[selectedGame]) {
      setCategories(JSON.parse(JSON.stringify(existingSchemas[selectedGame])));
    } else {
      setCategories([]);
    }
    setExpandedCats({});
  }, [selectedGame, existingSchemas]);

  const generateKey = (label: string) =>
    label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const addCategory = () => setCategories([...categories, { key: '', label: '', type: 'category', subcategories: [] }]);

  const removeCategory = (i: number) => setCategories(categories.filter((_, idx) => idx !== i));

  const updateCategory = (i: number, label: string) => {
    const updated = [...categories];
    updated[i] = { ...updated[i], label, key: generateKey(label) };
    setCategories(updated);
  };

  const addSubcategory = (catIdx: number) => {
    const updated = [...categories];
    const subs = updated[catIdx].subcategories || [];
    updated[catIdx] = { ...updated[catIdx], subcategories: [...subs, { key: '', label: '', type: 'number' }] };
    setCategories(updated);
    setExpandedCats({ ...expandedCats, [catIdx]: true });
  };

  const removeSubcategory = (catIdx: number, subIdx: number) => {
    const updated = [...categories];
    const subs = [...(updated[catIdx].subcategories || [])];
    subs.splice(subIdx, 1);
    updated[catIdx] = { ...updated[catIdx], subcategories: subs };
    setCategories(updated);
  };

  const updateSubcategory = (catIdx: number, subIdx: number, label: string) => {
    const updated = [...categories];
    const subs = [...(updated[catIdx].subcategories || [])];
    subs[subIdx] = { ...subs[subIdx], label, key: generateKey(label) };
    updated[catIdx] = { ...updated[catIdx], subcategories: subs };
    setCategories(updated);
  };

  const toggleCat = (i: number) => setExpandedCats({ ...expandedCats, [i]: !expandedCats[i] });

  const handleSave = async () => {
    if (!selectedGame) return notify('error', 'Selecione um jogo');
    setSaving(true);
    const schema = { categories };
    const existing = existingSchemas[selectedGame];
    let error;
    if (existing) {
      ({ error } = await supabase.from('game_scoring_schemas').update({ schema } as any).eq('game_id', selectedGame));
    } else {
      ({ error } = await supabase.from('game_scoring_schemas').insert({ game_id: selectedGame, schema } as any));
    }
    setSaving(false);
    if (error) return notify('error', error.message);
    notify('success', 'Schema salvo!');
    setExistingSchemas({ ...existingSchemas, [selectedGame]: categories });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle>Schemas de Pontuação</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Jogo</Label>
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger><SelectValue placeholder="Selecione um jogo" /></SelectTrigger>
            <SelectContent>{games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {selectedGame && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categorias (divisores visuais)</Label>
                <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-4 w-4 mr-1" /> Categoria</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Categorias são divisores visuais. Subcategorias são os campos onde os pontos são inseridos.
              </p>
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma categoria. A pontuação será um campo simples de total.</p>
              )}
              {categories.map((cat, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleCat(i)}>
                      {expandedCats[i] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <Input
                      value={cat.label}
                      onChange={e => updateCategory(i, e.target.value)}
                      placeholder="Nome da categoria (ex: Economia)"
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-[80px] truncate">{cat.key}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeCategory(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {expandedCats[i] && (
                    <div className="pl-8 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Subcategorias (campos de pontuação)</span>
                        <Button variant="ghost" size="sm" onClick={() => addSubcategory(i)}>
                          <Plus className="h-3 w-3 mr-1" /> Subcategoria
                        </Button>
                      </div>
                      {(cat.subcategories || []).map((sub, si) => (
                        <div key={si} className="flex items-center gap-2">
                          <Input
                            value={sub.label}
                            onChange={e => updateSubcategory(i, si, e.target.value)}
                            placeholder="Nome (ex: Canais)"
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-[80px] truncate">{sub.key}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeSubcategory(i, si)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {(!cat.subcategories || cat.subcategories.length === 0) && (
                        <p className="text-xs text-muted-foreground italic">Nenhuma subcategoria. Adicione para criar campos de pontuação.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="gold" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar Schema'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminScoringSchemas;
