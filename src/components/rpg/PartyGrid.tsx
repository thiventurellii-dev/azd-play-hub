import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skull, UserMinus, Heart, Crown } from 'lucide-react';
import type { RpgCampaignCharacter, RpgCharacter, PublicProfileLite } from '@/types/rpg';

interface PartyMember extends RpgCampaignCharacter {
  character: RpgCharacter | null;
  owner: PublicProfileLite | null;
}

interface Props {
  members: PartyMember[];
  masterId: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'dead':
      return (
        <Badge variant="destructive" className="gap-1 text-[10px]">
          <Skull className="h-3 w-3" /> Caído
        </Badge>
      );
    case 'retired':
      return (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Heart className="h-3 w-3" /> Aposentado
        </Badge>
      );
    case 'left':
      return (
        <Badge variant="outline" className="gap-1 text-[10px]">
          <UserMinus className="h-3 w-3" /> Saiu
        </Badge>
      );
    default:
      return null;
  }
};

export const PartyGrid = ({ members, masterId }: Props) => {
  if (members.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum personagem foi vinculado a esta campanha ainda.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {members.map((m) => {
        const ch = m.character;
        const owner = m.owner;
        const isMaster = owner?.id === masterId;
        const dimmed = m.status !== 'active';
        return (
          <div
            key={m.id}
            className={`relative rounded-lg border border-border bg-card p-3 flex flex-col gap-2 ${
              dimmed ? 'opacity-60 grayscale' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={ch?.portrait_url || undefined} alt={ch?.name} />
                <AvatarFallback>{ch?.name?.[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm truncate">{ch?.name ?? '—'}</p>
                  {isMaster && (
                    <Crown className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[ch?.race, ch?.class].filter(Boolean).join(' • ') || 'Personagem'}
                </p>
                {ch?.level != null && (
                  <p className="text-[10px] text-gold">Nv. {ch.level}</p>
                )}
              </div>
            </div>

            {owner && (
              <Link
                to={`/perfil/${owner.nickname || owner.id}`}
                className="text-[11px] text-muted-foreground hover:text-foreground truncate"
              >
                @{owner.nickname || owner.name}
              </Link>
            )}

            {statusBadge(m.status) && (
              <div className="absolute top-2 right-2">{statusBadge(m.status)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PartyGrid;
