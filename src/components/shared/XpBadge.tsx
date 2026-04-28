import { Sparkles } from "lucide-react";
import { useUserXp } from "@/hooks/useUserXp";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface XpBadgeProps {
  userId?: string;
  variant?: "compact" | "full";
  className?: string;
}

const XpBadge = ({ userId, variant = "compact", className }: XpBadgeProps) => {
  const { data } = useUserXp(userId);
  if (!data) return null;

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold border border-gold/30",
          className
        )}
        title={`Nível ${data.level} • ${data.totalXp} XP totais`}
      >
        <Sparkles className="h-3 w-3" /> Nv {data.level}
      </span>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gold inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Nível {data.level}
        </span>
        <span className="text-muted-foreground">
          {data.xpInLevel}/{data.xpForNext} XP
        </span>
      </div>
      <Progress value={data.pct} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">
        {data.totalXp.toLocaleString("pt-BR")} XP totais
      </p>
    </div>
  );
};

export default XpBadge;
