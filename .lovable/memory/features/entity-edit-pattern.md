---
name: Entity Edit Pattern
description: Standardized pattern for editing entities using EntityEditButton + EntitySheet + Form components
type: preference
---
Always use `EntityEditButton` (src/components/shared/EntityEditButton.tsx) for edit buttons.
It's self-contained: checks permissions, renders a Sheet with the correct form as children.

Usage:
```tsx
<EntityEditButton entityType="boardgame" title="Editar Jogo" widthClass="sm:max-w-2xl">
  {(onClose) => <GameForm game={data} onSuccess={onClose} />}
</EntityEditButton>
```

Available forms in src/components/forms/:
- GameForm.tsx (boardgames, with tags + scoring schema)
- BloodScriptForm.tsx (blood scripts, victory conditions)
- MatchRoomForm.tsx (match rooms)
- RpgSystemForm.tsx (RPG systems, supports create + edit)
- RpgAdventureForm.tsx (RPG adventures, supports create + edit)

Extracted UI components in src/components/games/:
- BoardgameCard.tsx (card with edit button)
- BloodScriptCard.tsx (card with edit button)
- GameStatsCarousel.tsx (personal/general/detailed stats)
- GameMatchHistory.tsx (filtered match history with pagination)
- BloodMatchEditDialog.tsx (edit blood match via EntitySheet)

**Migrated**: AdminGames.tsx ✅, Games.tsx ✅, GameDetail.tsx ✅, ScriptDetail.tsx ✅
