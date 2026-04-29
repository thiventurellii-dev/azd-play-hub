import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sword, Search, Plus, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRpgCampaigns, useIsMestre } from '@/hooks/useRpgCampaigns';
import { CampaignCard } from '@/components/rpg/CampaignCard';
import { CreateCampaignDialog } from '@/components/rpg/CreateCampaignDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const RpgCampaigns = () => {
  const { data: campaigns = [], isLoading } = useRpgCampaigns();
  const { data: isMestre } = useIsMestre();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    document.title = 'Campanhas RPG | Amizade AzD';
  }, []);

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.description ?? '').toLowerCase().includes(s) ||
          (c.adventure?.name ?? '').toLowerCase().includes(s),
      );
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    return list;
  }, [campaigns, search, statusFilter]);

  return (
    <div className="container py-6 space-y-6 pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <Sword className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Campanhas RPG</h1>
            <p className="text-sm text-muted-foreground">
              Histórias contínuas. Junte-se a uma mesa, deixe sua marca, sobreviva às lendas.
            </p>
          </div>
        </div>

        {isMestre ? (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova campanha
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button disabled variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Quero ser mestre
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Adicione a tag "Mestre" no seu perfil para criar campanhas.
            </TooltipContent>
          </Tooltip>
        )}
      </motion.div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="planning">Em preparação</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="abandoned">Abandonadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <Sword className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha encontrada. Que tal iniciar uma?
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default RpgCampaigns;
