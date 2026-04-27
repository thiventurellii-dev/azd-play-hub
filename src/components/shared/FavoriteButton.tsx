import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorite, type FavoriteEntityType } from "@/hooks/useFavorite";

interface Props {
  entityType: FavoriteEntityType;
  entityId?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button";
  className?: string;
}

const sizeMap = {
  sm: { btn: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { btn: "h-9 w-9", icon: "h-4 w-4" },
  lg: { btn: "h-10 w-10", icon: "h-5 w-5" },
};

export const FavoriteButton = ({
  entityType,
  entityId,
  size = "md",
  variant = "icon",
  className,
}: Props) => {
  const { isFavorite, toggle, loading, canFavorite } = useFavorite(entityType, entityId);
  const s = sizeMap[size];

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading || !canFavorite}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        className={cn(isFavorite && "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20", className)}
        title={isFavorite ? "Remover dos favoritos" : "Marcar como favorito"}
      >
        <Star className={cn("h-4 w-4 mr-1", isFavorite && "fill-gold")} />
        {isFavorite ? "Favorito" : "Favoritar"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading || !canFavorite}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      title={isFavorite ? "Remover dos favoritos" : "Marcar como favorito"}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-colors",
        s.btn,
        isFavorite
          ? "border-gold/50 bg-gold/15 text-gold hover:bg-gold/25"
          : "border-border bg-background/80 text-muted-foreground hover:text-gold hover:border-gold/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <Star className={cn(s.icon, isFavorite && "fill-gold")} />
    </button>
  );
};

export default FavoriteButton;
