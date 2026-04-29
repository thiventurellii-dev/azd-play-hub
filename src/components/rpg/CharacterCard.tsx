import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skull, Heart, UserMinus, Lock } from 'lucide-react';
import type { RpgCharacter, RpgCharacterCampaignStatus } from '@/types/rpg';

interface Props {
  character: RpgCharacter;
  /** Optional override status (vindo de uma campanha). 'active' = normal, 'dead' = caído, etc. */
  status?: RpgCharacterCampaignStatus;
  /** Sub-text extra: ex. nome da campanha onde caiu */
  hint?: string;
}

export const CharacterCard = ({ character, status = 'active', hint }: Props) => {
  const isDead = status === 'dead';
  const isInactive = status !== 'active';

  return (
    <Link
      to={`/rpg/personagens/${character.id}`}
      className={`group relative block rounded-xl border bg-card overflow-hidden transition-all
        ${
          isDead
            ? 'border-destructive/40 hover:border-destructive/70'
            : 'border-border hover:border-gold/50'
        }`}
    >
      {/* Portrait area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {character.portrait_url ? (
          <img
            src={character.portrait_url}
            alt={character.name}
            className={`h-full w-full object-cover transition-all
              ${isDead ? 'grayscale brightness-75' : 'group-hover:scale-105'}
              ${isInactive && !isDead ? 'opacity-60 grayscale' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{character.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {!character.is_public && (
            <Badge variant="outline" className="text-[10px] bg-card/80 backdrop-blur gap-1">
              <Lock className="h-2.5 w-2.5" /> Privado
            </Badge>
          )}
          {status === 'dead' && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <Skull className="h-3 w-3" /> Caído
            </Badge>
          )}
          {status === 'retired' && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Heart className="h-3 w-3" /> Aposentado
            </Badge>
          )}
          {status === 'left' && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <UserMinus className="h-3 w-3" /> Saiu
            </Badge>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p
            className={`font-bold text-sm leading-tight truncate ${
              isDead ? 'text-destructive line-through decoration-destructive/60' : ''
            }`}
          >
            {character.name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {[character.race, character.class].filter(Boolean).join(' • ') || 'Aventureiro'}
            {character.level ? ` • Nv. ${character.level}` : ''}
          </p>
          {hint && (
            <p className="text-[10px] text-destructive/80 mt-0.5 truncate italic">{hint}</p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CharacterCard;
