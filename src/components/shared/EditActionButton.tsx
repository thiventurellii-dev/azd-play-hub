import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { canEdit, type EntityType, getEntityLabel } from "@/utils/permissions";

interface EditActionButtonProps {
  entityType: EntityType;
  /** The user ID of the entity creator (for match_room permission). */
  createdBy?: string | null;
  onClick: () => void;
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon";
  /** Optional custom label */
  label?: string;
  className?: string;
}

/**
 * Unified edit button with built-in permission guard.
 * Renders nothing if the user lacks permission.
 * For matches, shows "Propor Edição" for non-admins.
 */
export const EditActionButton = ({
  entityType,
  createdBy,
  onClick,
  size = "icon",
  label,
  className = "",
}: EditActionButtonProps) => {
  const { user, role, isAdmin } = useAuth();

  const hasPermission = canEdit(entityType, {
    role,
    userId: user?.id ?? null,
    createdBy,
  });

  if (!hasPermission) return null;

  const entityLabel = getEntityLabel(entityType);
  const isProposal = entityType === "match" && !isAdmin;
  const tooltipText = isProposal ? `Propor edição de ${entityLabel}` : `Editar ${entityLabel}`;
  const buttonLabel = label ?? (isProposal ? "Propor Edição" : `Editar`);

  if (size === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${className}`} onClick={onClick}>
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button variant="outline" size={size} className={className} onClick={onClick}>
      <Pencil className="h-4 w-4 mr-1" />
      {buttonLabel}
    </Button>
  );
};
