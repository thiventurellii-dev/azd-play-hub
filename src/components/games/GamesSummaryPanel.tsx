import { Dices, Zap, BarChart3, Clock, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  totalGames: number;
  activeCount: number;
  totalMatches: number;
  totalPlaytimeMin: number;
  totalLabel?: string;
  activeTooltip?: string;
}

const Stat = ({
  icon: Icon,
  value,
  label,
  tooltip,
}: {
  icon: any;
  value: string | number;
  label: string;
  tooltip?: string;
}) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-gold/70 shrink-0" />
    <div className="leading-tight">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-2.5 w-2.5 text-muted-foreground/70 hover:text-foreground transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </p>
    </div>
  </div>
);

const GamesSummaryPanel = ({
  totalGames,
  activeCount,
  totalMatches,
  totalPlaytimeMin,
  totalLabel = "jogos",
  activeTooltip = "Itens com Season ou Torneio ativo no momento.",
}: Props) => {
  const hours = Math.round(totalPlaytimeMin / 60);
  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl bg-card/60 border border-border/40 px-4 py-2.5 flex items-center gap-5 backdrop-blur-sm">
        <Stat icon={Dices} value={totalGames} label={totalLabel} />
        <div className="h-7 w-px bg-border/60" />
        <Stat icon={Zap} value={activeCount} label="ativos" tooltip={activeTooltip} />
        <div className="h-7 w-px bg-border/60" />
        <Stat icon={BarChart3} value={totalMatches} label="partidas" />
        <div className="h-7 w-px bg-border/60" />
        <Stat icon={Clock} value={`${hours}h`} label="jogadas" />
      </div>
    </TooltipProvider>
  );
};

export default GamesSummaryPanel;
