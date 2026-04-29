import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sword, Users, Calendar, Globe, Lock } from 'lucide-react';
import type { RpgCampaignSummary } from '@/types/rpg';

const statusLabel: Record<string, string> = {
  planning: 'Em preparação',
  active: 'Ativa',
  completed: 'Concluída',
  abandoned: 'Abandonada',
};
const statusColor: Record<string, string> = {
  planning: 'bg-secondary text-foreground',
  active: 'bg-gold/20 text-gold border-gold/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  abandoned: 'bg-destructive/15 text-destructive border-destructive/30',
};

interface Props {
  campaign: RpgCampaignSummary;
}

export const CampaignCard = ({ campaign: c }: Props) => {
  const slug = c.slug || c.id;
  return (
    <Link to={`/campanhas/${slug}`}>
      <Card className="overflow-hidden border-border bg-card hover:border-gold/40 transition-colors h-full flex flex-col">
        <div className="aspect-[16/9] bg-gradient-to-br from-gold/15 via-secondary to-background relative">
          {c.image_url ? (
            <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Sword className="h-10 w-10 text-gold/40" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <Badge className={statusColor[c.status] || ''} variant="outline">
              {statusLabel[c.status] || c.status}
            </Badge>
            {c.is_public ? (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" /> Pública
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Privada
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground line-clamp-1">{c.name}</h3>
            {c.adventure?.name && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Aventura: {c.adventure.name}
              </p>
            )}
            {c.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6">
                <AvatarImage src={c.master?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {c.master?.name?.[0] ?? 'M'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                Mestre {c.master?.nickname || c.master?.name || '—'}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {c.party_count ?? 0}/{c.max_players ?? '∞'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {c.session_count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CampaignCard;
