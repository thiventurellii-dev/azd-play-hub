import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, Save } from 'lucide-react';

interface Game { id: string; name: string; }
interface Category { key: string; label: string; type: string; }

const AdminScoringSchemas = () => {
  const { notify } = useNotification();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingSchemas, setExistingSchemas] = useState<Record<string, Category[]>>({});

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
      setCategories([...existingSchemas[selectedGame]]);
    } else {
      setCategories([]);
    }
  }, [selectedGame, existingSchemas]);

  const addCategory = () => setCategories([...categories, { key: '', label: '', type: 'number' }]);
  const removeCategory = (i: number) => setCategories(categories.filter((_, idx) => idx !== i));
  const updateCategory = (i: number, field: keyof Category, value: string) => {
    const updated = [...categories];
    updated[i] = { ...updated[i], [field]: value };
    // Auto-generate key from label
    if (field === 'label') {
      updated[i].key = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }
    setCategories(updated);
  };

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
                <Label>Categorias de Pontuação</Label>
                <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-4 w-4 mr-1" /> Categoria</Button>
              </div>
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma categoria. A pontuação será um campo simples de total.</p>
              )}
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={cat.label} onChange={e => updateCategory(i, 'label', e.target.value)} placeholder="Nome da categoria (ex: Canais)" className="flex-1" />
                  <Input value={cat.key} disabled className="w-[140px] opacity-60" />
                  <Button variant="ghost" size="icon" onClick={() => removeCategory(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
