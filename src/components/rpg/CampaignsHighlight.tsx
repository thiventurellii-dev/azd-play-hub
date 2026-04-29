import { Link } from 'react-router-dom';
import { useRpgCampaigns } from '@/hooks/useRpgCampaigns';
import { Sword, ArrowRight, Users, Calendar, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

/**
 * Bloco de destaque para a tab RPG em /games.
 * Headline com contadores + 1-3 mini-cards das campanhas mais relevantes
 * + CTA "Ver todas →" para /campanhas.
 *
 * Não duplica criação (isso vive na página da Aventura).
 */
const statusLabel: Record<string, string> = {
  planning: 'Em preparação',
  active: 'Ativa',
  completed: 'Concluída',
  abandoned: 'Abandonada',
};

const statusTone: Record<string, string> = {
  planning: 'bg-secondary/40 text-muted-foreground border-border',
  active: 'bg-gold/15 text-gold border-gold/30',
  completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  abandoned: 'bg-destructive/10 text-destructive border-destructive/25',
};

export const CampaignsHighlight = () => {
  const { data: campaigns = [], isLoading } = useRpgCampaigns();

  const active = campaigns.filter(
    (c) => c.status === 'active' || c.status === 'planning',
  );
  const withOpenSeats = active.filter(
    (c) => c.open_join && (c.party_count ?? 0) < (c.max_players ?? 99),
  );

  // Ordena: vagas abertas > active > planning, depois mais recente
  const sorted = [...active].sort((a, b) => {
    const aOpen =
      a.open_join && (a.party_count ?? 0) < (a.max_players ?? 99) ? 1 : 0;
    const bOpen =
      b.open_join && (b.party_count ?? 0) < (b.max_players ?? 99) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const featured = sorted.slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/15 via-card to-card p-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Sword className="h-5 w-5 text-purple-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              Campanhas
            </h2>
            {isLoading ? (
              <Skeleton className="h-4 w-48 mt-1" />
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {active.length === 0 ? (
                  <>Nenhuma campanha ativa ainda — abra uma aventura para começar.</>
                ) : (
                  <>
                    <span className="text-foreground font-medium">
                      {active.length}
                    </span>{' '}
                    {active.length === 1 ? 'campanha ativa' : 'campanhas ativas'}{' '}
                    no AzD
                    {withOpenSeats.length > 0 && (
                      <>
                        {' · '}
                        <span className="text-gold font-medium">
                          {withOpenSeats.length}
                        </span>{' '}
                        com vagas abertas
                      </>
                    )}
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        <Link
          to="/campanhas"
          className="text-xs text-purple-300 hover:text-purple-200 transition-colors inline-flex items-center gap-1 self-center"
        >
          Ver todas as campanhas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : featured.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Quando alguém criar a primeira campanha, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => {
            const slug = c.slug || c.id;
            const seatsLeft = (c.max_players ?? 0) - (c.party_count ?? 0);
            const hasOpenSeats =
              c.open_join && seatsLeft > 0 && c.max_players != null;
            return (
              <Link
                key={c.id}
                to={`/campanhas/${slug}`}
                className="group rounded-lg border border-border bg-card/60 hover:border-purple-500/40 hover:bg-card transition-all p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-purple-200 transition-colors">
                    {c.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 px-1.5 h-4 flex-shrink-0 ${statusTone[c.status] ?? ''}`}
                  >
                    {statusLabel[c.status] ?? c.status}
                  </Badge>
                </div>

                {c.adventure?.name && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {c.adventure.name}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={c.master?.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {c.master?.name?.[0] ?? 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {c.master?.nickname || c.master?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Users className="h-3 w-3" />
                      {c.party_count ?? 0}/{c.max_players ?? '∞'}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {c.session_count ?? 0}
                    </span>
                  </div>
                </div>

                {hasOpenSeats && (
                  <div className="text-[10px] text-gold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {seatsLeft === 1 ? '1 vaga aberta' : `${seatsLeft} vagas abertas`}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </motion.section>
  );
};

export default CampaignsHighlight;
