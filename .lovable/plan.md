

## Plan: Unified Match Editing, Activity Logs, Room UX Fixes & Deep Link Refactor

### 1. Unified Match Editing Flow

**Current state**: Match editing exists in 3 places — `AdminMatches.tsx`, `GameDetail.tsx` (edit match dialog), and `NewMatchFlow.tsx` (creation only). Each has its own UI/logic.

**Approach**:
- Create a reusable `EditMatchDialog` component (`src/components/matches/EditMatchDialog.tsx`) that wraps `NewMatchFlow`-like step UI but pre-populated with existing match data
- Admins: direct save to `matches` + `match_results` tables
- Regular users: save to a new `match_edit_proposals` table with status `pending`, admin reviews and approves

**Database migration**: Create `match_edit_proposals` table:
```sql
CREATE TABLE match_edit_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  proposed_by uuid NOT NULL,
  proposed_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE match_edit_proposals ENABLE ROW LEVEL SECURITY;
-- RLS: users see own proposals, admins see all
```

**Files**:
- Create `src/components/matches/EditMatchDialog.tsx` — unified edit component
- Modify `src/pages/GameDetail.tsx` — replace inline edit dialog with `EditMatchDialog`
- Modify `src/components/admin/AdminMatches.tsx` — use same `EditMatchDialog`
- Modify `src/pages/Admin.tsx` — add "Propostas de Edição" section for admin review

### 2. Activity Logs (Admin)

**Database migration**: Create `activity_logs` table:
```sql
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'create', 'update', 'delete'
  entity_type text NOT NULL, -- 'room', 'match', 'game', 'player', etc.
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
-- Only admins can read
```

**Files**:
- Create `src/components/admin/AdminLogs.tsx` — log viewer with filters (entity type, user, date range)
- Modify `src/pages/Admin.tsx` — add "Logs" menu item under a new "Sistema" group
- Create `src/lib/activityLog.ts` — helper `logActivity(userId, action, entityType, entityId, oldData?, newData?)` that inserts into `activity_logs`
- Instrument key operations: room CRUD in `MatchRoomCard.tsx`, match creation in `NewMatchFlow.tsx`, game editing in `GameDetail.tsx`, player status changes in `AdminPlayers.tsx`

### 3. MatchRoom Comments UX Fix

**Problem**: Comments are hidden behind toggle but when opened, buttons get blocked.

**Changes in `src/components/matchrooms/MatchRoomCard.tsx`**:
- Remove fixed `h-[340px]` from Card — use `min-h-[340px]` instead so the card can grow when comments open
- Show comments open by default (set `showComments` initial state to `true`)
- Keep `max-h-60 overflow-y-auto` on comment list to cap height
- Ensure action buttons (Sair, Compartilhar, Fechar) remain above the comments section and never get overlapped — move comments BELOW the action buttons in DOM order

### 4. Room Deep Link — Modal with Direct Fetch

**Problem**: Current scroll+highlight approach doesn't feel premium; previous modal approach had black screen due to race condition.

**Changes in `src/pages/MatchRooms.tsx`**:
- Remove scroll/highlight logic entirely
- When `?room=ID` detected, immediately open a Dialog
- Inside Dialog: show a Skeleton loader, then fire an isolated Supabase query `.select('*').eq('id', roomId).maybeSingle()`
- On success: render a full `MatchRoomCard` inside the Dialog with all interactions (join, leave, comment)
- On failure (null): show toast "Sala não encontrada", close dialog, clean URL params
- On dialog close: clean `?room` from URL via `setSearchParams`
- Apply optional chaining throughout `MatchRoomCard` to handle partial data gracefully

### 5. WhatsApp Emoji Fix

**Root cause**: The emojis in `matchNotification.ts` are standard Unicode and `encodeURIComponent` handles them correctly. The `�` replacement character suggests the file might have been saved with incorrect encoding, or there's a build-time transformation stripping non-ASCII.

**Fix in `src/lib/matchNotification.ts`**:
- Replace emoji literals with their Unicode escape sequences to avoid encoding issues:
  - `\u{1F3B2}` for 🎲, `\u{1F3AE}` for 🎮, `\u{1F4C5}` for 📅, `\u2705` for ✅, `\u{1F449}` for 👉
- This ensures consistent encoding regardless of file save format

### Technical Summary

**New files** (4):
- `src/components/matches/EditMatchDialog.tsx`
- `src/components/admin/AdminLogs.tsx`
- `src/lib/activityLog.ts`
- Migration: `match_edit_proposals` + `activity_logs` tables

**Modified files** (6):
- `src/components/matchrooms/MatchRoomCard.tsx` — comments open by default, flexible card height
- `src/pages/MatchRooms.tsx` — modal-based deep link with direct fetch + skeleton
- `src/pages/GameDetail.tsx` — use unified `EditMatchDialog`
- `src/pages/Admin.tsx` — add Logs + Edit Proposals menu items
- `src/components/admin/AdminMatches.tsx` — use unified `EditMatchDialog`
- `src/lib/matchNotification.ts` — Unicode escape sequences for emojis

