import type { UserRole } from "@/contexts/AuthContext";

export type EntityType = "boardgame" | "blood_script" | "match" | "match_room" | "rpg";

interface PermissionContext {
  role: UserRole | null;
  userId: string | null;
  createdBy?: string | null;
}

/**
 * Centralized permission check: determines if a user can edit a given entity.
 *
 * Rules:
 * - Games, Blood Scripts, RPGs: admin/super_admin only
 * - Matches: admin/super_admin can edit directly; players can propose edits
 * - Match Rooms: admin/super_admin OR the room creator
 */
export function canEdit(entityType: EntityType, ctx: PermissionContext): boolean {
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

  switch (entityType) {
    case "boardgame":
    case "blood_script":
    case "rpg":
      return isAdmin;

    case "match":
      // Everyone authenticated can propose; admins can edit directly
      return !!ctx.userId;

    case "match_room":
      return isAdmin || (!!ctx.userId && ctx.userId === ctx.createdBy);

    default:
      return false;
  }
}

/**
 * Whether the user's edit is a direct save or a proposal (for matches).
 */
export function isDirectEdit(entityType: EntityType, role: UserRole | null): boolean {
  const isAdmin = role === "admin" || role === "super_admin";
  if (entityType === "match") return isAdmin;
  return true;
}

/**
 * Returns a human-readable label for the entity type.
 */
export function getEntityLabel(entityType: EntityType): string {
  const labels: Record<EntityType, string> = {
    boardgame: "Jogo",
    blood_script: "Script",
    match: "Partida",
    match_room: "Sala",
    rpg: "RPG",
  };
  return labels[entityType];
}
