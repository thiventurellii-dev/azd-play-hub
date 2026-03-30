import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface Season {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
}

const AdminSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('upcoming');

  const fetchSeasons = async () => {
    const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false });
    setSeasons(data || []);
  };

  useEffect(() => { fetchSeasons(); }, []);

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return toast.error('Preencha todos os campos');
    const { error } = await supabase.from('seasons').insert({ name, description, start_date: startDate, end_date: endDate, status });
    if (error) return toast.error(error.message);
    toast.success('Season criada!');
    setName(''); setDescription(''); setStartDate(''); setEndDate('');
    fetchSeasons();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Season removida');
    fetchSeasons();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Nova Season</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Season 1" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Em breve</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da season" />
          </div>
          <Button variant="gold" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Criar Season</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {seasons.map(s => (
          <Card key={s.id} className="bg-card border-border">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.status} • {s.start_date} — {s.end_date}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminSeasons;
