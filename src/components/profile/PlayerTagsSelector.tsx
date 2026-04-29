import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PlayerTag = 'boardgamer' | 'blood' | 'storyteller' | 'aventureiro' | 'mestre';

export const PLAYER_TAGS: { value: PlayerTag; label: string; emoji: string; description: string }[] = [
  { value: 'boardgamer', label: 'Boardgamer', emoji: '🎲', description: 'Jogos de tabuleiro' },
  { value: 'blood', label: 'Blood on the Clocktower', emoji: '🩸', description: 'Jogador de BotC' },
  { value: 'storyteller', label: 'Storyteller', emoji: '📖', description: 'Conta partidas de BotC' },
  { value: 'aventureiro', label: 'Aventureiro', emoji: '⚔️', description: 'Joga RPG de mesa' },
  { value: 'mestre', label: 'Mestre', emoji: '🎭', description: 'Mestra sessões de RPG' },
];

export const PLAYER_TAG_MAP = Object.fromEntries(PLAYER_TAGS.map(t => [t.value, t])) as Record<PlayerTag, typeof PLAYER_TAGS[number]>;

interface Props {
  selected: PlayerTag[];
  onChange: (tags: PlayerTag[]) => void;
  className?: string;
}

const PlayerTagsSelector = ({ selected, onChange, className }: Props) => {
  const toggle = (tag: PlayerTag) => {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag));
    else onChange([...selected, tag]);
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {PLAYER_TAGS.map(t => {
        const active = selected.includes(t.value);
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => toggle(t.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all',
              active
                ? 'bg-gold text-black border-gold font-semibold'
                : 'bg-secondary text-foreground border-border hover:border-gold/50'
            )}
            title={t.description}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const PlayerTagsBadges = ({ tags, className }: { tags: PlayerTag[]; className?: string }) => {
  if (!tags?.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map(t => {
        const meta = PLAYER_TAG_MAP[t];
        if (!meta) return null;
        return (
          <Badge key={t} variant="secondary" className="gap-1">
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </Badge>
        );
      })}
    </div>
  );
};

export default PlayerTagsSelector;
