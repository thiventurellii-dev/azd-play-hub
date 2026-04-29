import { useMemo } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { InterestUser } from '@/hooks/useRpgAdventureDetail';

interface Props {
  interests: InterestUser[];
  hasInterest: boolean;
  onToggle: () => Promise<void> | void;
  loading?: boolean;
  className?: string;
}

const initials = (u: InterestUser) => {
  const base = u.nickname || u.name || '?';
  return base.slice(0, 2).toUpperCase();
};

const AdventureInterestCard = ({ interests, hasInterest, onToggle, loading, className }: Props) => {
  const { user } = useAuth();
  const count = interests.length;
  const displayed = useMemo(() => interests.slice(0, 6), [interests]);

  return (
    <div
      className={cn(
        'rounded-xl border p-5 flex flex-col gap-4',
        'bg-gradient-to-br from-gold/10 via-gold/5 to-transparent',
        'border-gold/30 shadow-lg shadow-gold/5',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gold/80 font-semibold">Interesse</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-1">{count}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {count === 1 ? 'aventureiro quer jogar' : 'aventureiros querem jogar'}
          </p>
        </div>
        <Heart
          className={cn(
            'h-10 w-10 transition-all',
            hasInterest ? 'fill-gold text-gold' : 'text-gold/40'
          )}
        />
      </div>

      {displayed.length > 0 && (
        <div className="flex items-center">
          {displayed.map((u, i) => (
            <div
              key={u.user_id}
              className="h-8 w-8 rounded-full border-2 border-background overflow-hidden flex items-center justify-center bg-secondary text-[10px] font-semibold text-gold"
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: displayed.length - i }}
              title={u.nickname || u.name}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initials(u)}</span>
              )}
            </div>
          ))}
          {count > displayed.length && (
            <span className="ml-2 text-xs text-muted-foreground">+{count - displayed.length}</span>
          )}
        </div>
      )}

      <Button
        variant={hasInterest ? 'outline' : 'gold'}
        className={cn('w-full gap-2', hasInterest && 'border-gold/40 text-gold hover:bg-gold/10')}
        onClick={() => onToggle()}
        disabled={!user || loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={cn('h-4 w-4', hasInterest && 'fill-current')} />
        )}
        {hasInterest ? 'Remover interesse' : 'Tenho interesse'}
      </Button>
      {!user && (
        <p className="text-[10px] text-muted-foreground text-center">Faça login para marcar interesse</p>
      )}
    </div>
  );
};

export default AdventureInterestCard;
