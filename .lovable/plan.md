
# Plan: Multi-Category Architecture (Boardgames, BotC, RPG)

This is a large restructuring that touches match registration, room creation, the games page, and player profiles. The work is split into 6 logical steps.

---

## Summary

- Add a **category selector** (Boardgame / BotC / RPG) as the entry point for creating rooms and registering matches
- Create a dedicated **NewMatchBotcFlow** component reusing existing `AdminBloodMatches` logic (scripts, teams, characters, winning team)
- Filter out `upcoming` and `finished` seasons from all registration selectors
- Add an **RPG section** to the Games page with Systems and Adventures/Worlds
- Segment the **Player Profile** stats into Boardgames / BotC / RPG tabs/carousel
- Keep all data writing DRY — BotC flow writes to existing `blood_matches` + `blood_match_players` tables

---

## Technical Details

### Database Changes (1 migration)

New tables for RPG:
- **`rpg_systems`** — `id`, `name`, `description`, `image_url`, `rules_url`, `video_url`, `created_at` (admin-managed, public-read)
- **`rpg_adventures`** — `id`, `system_id` (FK to rpg_systems), `name`, `description`, `tag` (enum: 'official' | 'homebrew'), `image_url`, `created_at` (admin-managed, public-read)

No changes to existing blood/boardgame tables.

### Step 0: Season Filter Fix
**Files**: `NewMatchFlow.tsx`, `EditMatchDialog.tsx`, `AdminBloodMatches.tsx`, `CreateRoomDialog.tsx`

- Add `.neq('status', 'upcoming')` alongside existing `.neq('status', 'finished')` in all season fetch queries
- AdminBloodMatches currently has no status filter — add both `.neq('status', 'finished').neq('status', 'upcoming')`

### Step 1: Category Selector
**Files**: `NewMatchFlow.tsx`, `CreateRoomDialog.tsx`

- Add a `category` state (`'boardgame' | 'botc' | 'rpg'`) as **Step 0** before the current Step 1
- Three styled cards/buttons for category selection
- In `NewMatchFlow`: if `boardgame` → current flow; if `botc` → render `NewMatchBotcFlow`; if `rpg` → placeholder/future
- In `CreateRoomDialog`: filter games list based on category (BotC games by slug, RPG games by new flag, or boardgames by default)

### Step 2: NewMatchBotcFlow Component
**File**: `src/components/matches/NewMatchBotcFlow.tsx` (new)

Reuses logic from `AdminBloodMatches`:
- **Step 1 — Script & Header**: Season selector (blood type only), Script selector, Date/Time, Duration
- **Step 2 — Players**: Storyteller selector, Good team players (player + character), Evil team players (player + character). No position/score fields. Visual layout similar to AdminBloodMatches player selectors.
- **Step 3 — Result**: Winning team selector (Good: "Execução do Demônio" / Evil: "Vitória do Demônio"), confirmation summary

**Submit logic**: Extracted as a shared function from `AdminBloodMatches` — inserts into `blood_matches`, `blood_match_players`, calls `recalculateSeasonRatings`. The `recalculateSeasonRatings` function will be extracted to a shared util (`src/lib/bloodRatings.ts`).

### Step 3: RPG Section in Games Page
**File**: `src/pages/Games.tsx`

- Add a third tab: "🎭 RPG"
- Render RPG Systems as cards (name, description, image, rules/video links)
- Each system expands to show linked Adventures/Worlds with Official/Homebrew badges
- Admin-only buttons to add/edit systems and adventures
- Create/Edit dialogs for systems (name, description, image_url, rules_url, video_url) and adventures (name, description, system_id, tag, image_url)

### Step 4: Player Profile Segmented Stats
**File**: `src/pages/PlayerProfile.tsx`

- Fetch BotC stats from `blood_mmr_ratings` and `blood_match_players` for the player
- Add a **Tabs** or **Carousel** component with 3 sections:
  - **Boardgames**: existing stats (total games, unique games, performance table, chart)
  - **BotC**: games played, wins as good, wins as evil, storyteller count, favorite characters
  - **RPG**: placeholder for future (sessions attended, systems played)
- Use `Carousel` component (already exists) for mobile-friendly navigation between categories

### Step 5: Conditional Rendering in Match Registration
**File**: `src/components/matches/NewMatchFlow.tsx`

- After category selection, use a switch statement:
  ```
  switch(category) {
    case 'boardgame': return <existing boardgame steps>
    case 'botc': return <NewMatchBotcFlow />
    case 'rpg': return <placeholder>
  }
  ```

---

## Files to Create
- `src/components/matches/NewMatchBotcFlow.tsx`
- `src/lib/bloodRatings.ts` (extracted shared rating logic)
- Migration SQL for `rpg_systems` and `rpg_adventures` tables

## Files to Modify
- `src/components/matches/NewMatchFlow.tsx` — category selector + conditional render
- `src/components/matches/EditMatchDialog.tsx` — season filter
- `src/components/matchrooms/CreateRoomDialog.tsx` — category selector
- `src/components/admin/AdminBloodMatches.tsx` — import shared rating logic, season filter
- `src/pages/Games.tsx` — RPG tab
- `src/pages/PlayerProfile.tsx` — segmented stats

## No Changes Needed
- Existing blood_matches/blood_match_players tables stay as-is
- Existing rankings/season detail pages auto-reflect new data
