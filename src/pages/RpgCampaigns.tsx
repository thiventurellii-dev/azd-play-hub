import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sword, Search, Plus, Sparkles, X, Filter, ArrowUpDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'planning' | 'abandoned';
type SortKey = 'last_activity' | 'name' | 'most_sessions';

const RpgCampaigns = () => {
  const { user } = useAuth();
  const { data: campaigns = [], isLoading } = useRpgCampaigns();
  const { data: isMestre } = useIsMestre();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [masterFilter, setMasterFilter] = useState<string>('all');
  const [adventureFilter, setAdventureFilter] = useState<string>('all');
  const [systemFilter, setSystemFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('last_activity');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    document.title = 'Campanhas RPG | Amizade AzD';
  }, []);

  // Listas únicas para os selects
  const masters = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    campaigns.forEach((c) => {
      if (c.master) {
        map.set(c.master.id, {
          id: c.master.id,
          label: c.master.nickname || c.master.name,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [campaigns]);

  const adventures = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    campaigns.forEach((c) => {
      if (c.adventure) map.set(c.adventure.id, { id: c.adventure.id, label: c.adventure.name });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [campaigns]);

  const systems = useMemo(() => {
    const ids = new Set<string>();
    campaigns.forEach((c) => {
      const sid = c.adventure?.system_id;
      if (sid) ids.add(sid);
    });
    return Array.from(ids);
  }, [campaigns]);

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

    if (statusFilter !== 'all') {
      if (statusFilter === 'in_progress') {
        list = list.filter((c) => c.status === 'planning' || c.status === 'active');
      } else {
        list = list.filter((c) => c.status === statusFilter);
      }
    }

    if (openSeatsOnly) {
      list = list.filter(
        (c) =>
          c.open_join &&
          c.max_players != null &&
          (c.party_count ?? 0) < c.max_players &&
          (c.status === 'planning' || c.status === 'active'),
      );
    }

    if (mineOnly && user?.id) {
      list = list.filter(
        (c) => c.is_master || c.my_membership_status === 'accepted' || c.my_membership_status === 'invited',
      );
    }

    if (masterFilter !== 'all') {
      list = list.filter((c) => c.master_id === masterFilter);
    }

    if (adventureFilter !== 'all') {
      list = list.filter((c) => c.adventure_id === adventureFilter);
    }

    if (systemFilter !== 'all') {
      list = list.filter((c) => c.adventure?.system_id === systemFilter);
    }

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'most_sessions') {
      list.sort((a, b) => (b.session_count ?? 0) - (a.session_count ?? 0));
    } else {
      // last_activity (default)
      list.sort((a, b) => {
        const ai = a.last_activity_at || a.updated_at;
        const bi = b.last_activity_at || b.updated_at;
        return bi.localeCompare(ai);
      });
    }

    return list;
  }, [
    campaigns,
    search,
    statusFilter,
    openSeatsOnly,
    mineOnly,
    user?.id,
    masterFilter,
    adventureFilter,
    systemFilter,
    sortBy,
  ]);

  const hasActiveFilter =
    statusFilter !== 'all' ||
    openSeatsOnly ||
    mineOnly ||
    masterFilter !== 'all' ||
    adventureFilter !== 'all' ||
    systemFilter !== 'all' ||
    sortBy !== 'last_activity' ||
    !!search.trim();

  const clearAll = () => {
    setSearch('');
    setStatusFilter('all');
    setOpenSeatsOnly(false);
    setMineOnly(false);
    setMasterFilter('all');
    setAdventureFilter('all');
    setSystemFilter('all');
    setSortBy('last_activity');
  };

  return (
    <div className="container py-6 space-y-6 pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Sword className="h-6 w-6 text-purple-300" />
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

      {/* Search + filters bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, aventura ou descrição..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface p-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-1" />

            {/* Status quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: 'in_progress', label: 'Em curso' },
                  { key: 'completed', label: 'Concluídas' },
                ] as const
              ).map((opt) => {
                const active = statusFilter === opt.key;
                return (
                  <Button
                    key={opt.key}
                    type="button"
                    variant={active ? 'secondary' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-8 px-3 rounded-full text-xs',
                      active && 'border-purple-400/60 text-purple-200 bg-purple-500/15',
                    )}
                    onClick={() => setStatusFilter(active ? 'all' : opt.key)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
              <Button
                type="button"
                variant={openSeatsOnly ? 'secondary' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 px-3 rounded-full text-xs',
                  openSeatsOnly && 'border-gold/60 text-gold bg-gold/15',
                )}
                onClick={() => setOpenSeatsOnly((v) => !v)}
              >
                Vagas abertas
              </Button>
              {user && (
                <Button
                  type="button"
                  variant={mineOnly ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-8 px-3 rounded-full text-xs',
                    mineOnly && 'border-emerald-400/60 text-emerald-200 bg-emerald-500/15',
                  )}
                  onClick={() => setMineOnly((v) => !v)}
                >
                  Minhas campanhas
                </Button>
              )}
            </div>

            <div className="hidden sm:block w-px h-5 bg-border mx-1" />

            {masters.length > 0 && (
              <Select value={masterFilter} onValueChange={setMasterFilter}>
                <SelectTrigger
                  className={cn(
                    'h-8 w-auto min-w-[140px] text-xs',
                    masterFilter !== 'all' && 'text-purple-200 border-purple-400/40',
                  )}
                >
                  <SelectValue placeholder="Mestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os mestres</SelectItem>
                  {masters.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {adventures.length > 0 && (
              <Select value={adventureFilter} onValueChange={setAdventureFilter}>
                <SelectTrigger
                  className={cn(
                    'h-8 w-auto min-w-[150px] text-xs',
                    adventureFilter !== 'all' && 'text-purple-200 border-purple-400/40',
                  )}
                >
                  <SelectValue placeholder="Aventura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as aventuras</SelectItem>
                  {adventures.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {systems.length > 1 && (
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger
                  className={cn(
                    'h-8 w-auto min-w-[120px] text-xs',
                    systemFilter !== 'all' && 'text-purple-200 border-purple-400/40',
                  )}
                >
                  <SelectValue placeholder="Sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sistemas</SelectItem>
                  {systems.map((s) => (
                    <SelectItem key={s} value={s}>
                      {/* O nome do sistema não está carregado na lista enxuta;
                         mostramos o ID curto para facilitar identificação */}
                      Sistema #{s.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="hidden sm:block w-px h-5 bg-border mx-1" />

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger
                  className={cn(
                    'h-8 w-auto min-w-[160px] text-xs',
                    sortBy !== 'last_activity' && 'text-purple-200 border-purple-400/40',
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_activity">Última atividade</SelectItem>
                  <SelectItem value="most_sessions">Mais sessões</SelectItem>
                  <SelectItem value="name">Nome (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={clearAll}
              >
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
        </div>
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
            {hasActiveFilter
              ? 'Nenhuma campanha bate com esses filtros.'
              : 'Nenhuma campanha encontrada. Que tal iniciar uma a partir de uma aventura?'}
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
