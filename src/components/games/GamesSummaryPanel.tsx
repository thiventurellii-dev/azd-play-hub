import { Dices, Zap, BarChart3, Clock } from "lucide-react";

interface Props {
  totalGames: number;
  activeCount: number;
  totalMatches: number;
  totalPlaytimeMin: number;
}

const Stat = ({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-gold/70 shrink-0" />
    <div className="leading-tight">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  </div>
);

const GamesSummaryPanel = ({ totalGames, activeCount, totalMatches, totalPlaytimeMin }: Props) => {
  const hours = Math.round(totalPlaytimeMin / 60);
  return (
    <div className="rounded-xl bg-card/60 border border-border/40 px-4 py-2.5 flex items-center gap-5 backdrop-blur-sm">
      <Stat icon={Dices} value={totalGames} label="jogos" />
      <div className="h-7 w-px bg-border/60" />
      <Stat icon={Zap} value={activeCount} label="ativos" />
      <div className="h-7 w-px bg-border/60" />
      <Stat icon={BarChart3} value={totalMatches} label="partidas" />
      <div className="h-7 w-px bg-border/60" />
      <Stat icon={Clock} value={`${hours}h`} label="jogadas" />
    </div>
  );
};

export default GamesSummaryPanel;
