import { Link } from 'react-router-dom';
import { useRpgCampaigns } from '@/hooks/useRpgCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sword, ArrowRight, Users, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const statusLabel: Record<string, string> = {
  planning: 'Em prep.',
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

/**
 * Card "Minhas campanhas" para Profile.tsx — atalho rápido pro que importa pra cada jogador.
 */
export const MyCampaignsCard = () => {
  const { data: campaigns = [], isLoading } = useRpgCampaigns();

  const mine = campaigns.filter(
    (c) => c.is_master || c.my_membership_status === 'accepted' || c.my_membership_status === 'invited',
  );

  // Ordena por última atividade
  const sorted = [...mine].sort((a, b) => {
    const ai = a.last_activity_at || a.updated_at;
    const bi = b.last_activity_at || b.updated_at;
    return bi.localeCompare(ai);
  });
  const top = sorted.slice(0, 4);

  return (
    <Card className="bg-card border-border mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sword className="h-4 w-4 text-purple-300" />
            Minhas campanhas
            {mine.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({mine.length})</span>
            )}
          </CardTitle>
          {mine.length > 0 && (
            <Link
              to="/campanhas"
              className="text-xs text-purple-300 hover:text-purple-200 transition-colors inline-flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <div className="text-center py-4">
            <Sword className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              Você ainda não está em nenhuma campanha.
            </p>
            <Link
              to="/campanhas"
              className="text-xs text-purple-300 hover:text-purple-200 transition-colors inline-flex items-center gap-1"
            >
              Explorar campanhas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {top.map((c) => (
              <Link
                key={c.id}
                to={`/campanhas/${c.slug || c.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 hover:border-purple-500/40 hover:bg-card transition-colors p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    {c.is_master && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 border-gold/40 text-gold">
                        Mestre
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.adventure?.name || 'Sem aventura vinculada'} · {c.session_count ?? 0} sessões
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                  <span className="hidden sm:flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {c.party_count ?? 0}/{c.max_players ?? '∞'}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 px-1.5 h-4 ${statusTone[c.status] ?? ''}`}
                  >
                    {statusLabel[c.status] ?? c.status}
                  </Badge>
                </div>
              </Link>
            ))}
            {mine.length > top.length && (
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                +{mine.length - top.length} outras
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyCampaignsCard;
