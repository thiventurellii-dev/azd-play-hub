import { useState, ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { canEdit, type EntityType, getEntityLabel } from "@/utils/permissions";
import { EntitySheet } from "@/components/shared/EntitySheet";

interface EntityEditButtonProps {
  entityType: EntityType;
  /** The user ID of the entity creator (for match_room permission). */
  createdBy?: string | null;
  /** Render the form inside the Sheet. Receives a close callback. */
  children: (onClose: () => void) => ReactNode;
  /** Sheet title override */
  title?: string;
  /** Sheet description override */
  description?: string;
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon";
  /** Optional custom label */
  label?: string;
  className?: string;
  /** Width class for the Sheet */
  widthClass?: string;
}

/**
 * Self-contained edit button: checks permissions, opens an EntitySheet with
 * the correct form passed as children.
 *
 * Usage:
 * ```tsx
 * <EntityEditButton entityType="boardgame" title="Editar Jogo">
 *   {(onClose) => <GameForm game={game} onSuccess={onClose} />}
 * </EntityEditButton>
 * ```
 */
export const EntityEditButton = ({
  entityType,
  createdBy,
  children,
  title,
  description,
  size = "icon",
  label,
  className = "",
  widthClass,
}: EntityEditButtonProps) => {
  const { user, role, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const hasPermission = canEdit(entityType, {
    role,
    userId: user?.id ?? null,
    createdBy,
  });

  if (!hasPermission) return null;

  const entityLabel = getEntityLabel(entityType);
  const isProposal = entityType === "match" && !isAdmin;
  const tooltipText = isProposal ? `Propor edição de ${entityLabel}` : `Editar ${entityLabel}`;
  const buttonLabel = label ?? (isProposal ? "Propor Edição" : "Editar");
  const sheetTitle = title ?? (isProposal ? `Propor edição de ${entityLabel}` : `Editar ${entityLabel}`);

  const handleClose = () => setOpen(false);

  const button =
    size === "icon" ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${className}`} onClick={() => setOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      <Button variant="outline" size={size} className={className} onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-1" />
        {buttonLabel}
      </Button>
    );

  return (
    <>
      {button}
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title={sheetTitle}
        description={description}
        widthClass={widthClass}
      >
        {children(handleClose)}
      </EntitySheet>
    </>
  );
};
