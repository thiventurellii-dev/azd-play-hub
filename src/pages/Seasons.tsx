import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Season {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finished: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  upcoming: 'Em breve',
  finished: 'Finalizada',
};

const Seasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      setSeasons(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Seasons</h1>
      <p className="text-muted-foreground mb-8">Temporadas de competição da comunidade</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : seasons.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma season criada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="bg-card border-border hover:border-gold/20 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{s.name}</CardTitle>
                    <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {s.description && <p className="text-sm text-muted-foreground mb-4">{s.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(s.start_date).toLocaleDateString('pt-BR')} — {new Date(s.end_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Seasons;
