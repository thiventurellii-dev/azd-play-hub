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
- MatchRoomForm.tsx (match rooms)
- RpgSystemForm.tsx (RPG systems)
- RpgAdventureForm.tsx (RPG adventures)

Legacy EditActionButton still exists but is being phased out.

**Migrated**: AdminGames.tsx ✅
**Pending migration**: Games.tsx, GameDetail.tsx, ScriptDetail.tsx (still use old Dialog pattern)
