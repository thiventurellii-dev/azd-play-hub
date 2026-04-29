import { cn } from '@/lib/utils';

interface Props {
  intensity?: Record<string, number> | null;
  className?: string;
}

const LABELS: { key: string; label: string }[] = [
  { key: 'combate', label: 'Combate' },
  { key: 'misterio', label: 'Mistério' },
  { key: 'exploracao', label: 'Exploração' },
  { key: 'roleplay', label: 'Roleplay' },
  { key: 'perigo', label: 'Perigo' },
];

const LEVEL_TEXT = ['—', 'Baixa', 'Média', 'Alta', 'Muito alta'];

const AdventureIntensityBars = ({ intensity, className }: Props) => {
  const data = intensity || {};
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2', className)}>
      {LABELS.map(({ key, label }) => {
        const lvl = Math.max(0, Math.min(4, Number(data[key] ?? 0)));
        const pct = (lvl / 4) * 100;
        const danger = key === 'perigo' && lvl >= 3;
        return (
          <div
            key={key}
            className="rounded-lg border border-border bg-card p-3 text-center hover:border-gold/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-semibold text-foreground mb-2">{LEVEL_TEXT[lvl]}</p>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', danger ? 'bg-gold' : 'bg-gold/60')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdventureIntensityBars;
