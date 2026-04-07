

# Migration Plan: Full Supabase Persistence

## Summary

The project already has all necessary tables in Supabase and all pages already fetch data from Supabase. There are **no mock data files or JSON fixtures**. The main gaps are:

1. **Pages use raw `useState`/`useEffect` instead of React Query** — none of the page files use `useQuery`/`useMutation` (only `useDashboardData` hook was migrated)
2. **Local asset images** (6 game/script images in `src/assets/`) should move to Supabase Storage
3. **MMR/rating recalculation runs entirely on the frontend** — should be an RPC function
4. **RLS policies are already comprehensive** — no gaps found
5. **Cleanup** — remove unused asset files after migration

## What Does NOT Need Migration

- **Database tables**: All entities (games, seasons, matches, blood_scripts, rpg_systems, rpg_adventures, match_rooms, profiles, etc.) already exist with proper columns
- **RLS policies**: Already configured correctly (public read, admin write, creator can edit rooms)
- **Storage buckets**: `match-images`, `community-docs`, `avatars` already exist

---

## Step 1: Upload Local Assets to Supabase Storage

Create a `game-assets` storage bucket and upload the 6 local images:
- `brass-birmingham-cover.png`, `brass-birmingham-logo.png`
- `ruins-of-arnak-cover.png`, `ruins-of-arnak-logo.png`
- `trouble-brewing.jpg`, `bad-moon-rising.jpg`, `over-the-river.png`

Update the `image_url` column in `games` and `blood_scripts` tables to point to public Storage URLs. The `azd-logo.png` stays local (it's the app logo, not game data).

**Migration SQL**: Create `game-assets` bucket with public access + RLS for admin uploads.

---

## Step 2: Migrate Pages to React Query

Convert all pages from `useState`/`useEffect` pattern to `useQuery`/`useMutation`. Files to migrate (in priority order):

| File | Current Pattern | Change |
|------|----------------|--------|
| `Games.tsx` | 10+ useStates, fetchData useEffect | Extract `useGamesData()` hook with `useQuery` |
| `GameDetail.tsx` | 8+ useStates, fetchGame useEffect | Extract `useGameDetail(slug)` hook |
| `Seasons.tsx` | 8+ useStates, fetchData useEffect | Extract `useSeasonsData()` hook |
| `SeasonDetail.tsx` | Multiple useStates | Extract `useSeasonDetail(id)` hook |
| `Rankings.tsx` | 4+ useStates | Extract `useRankingsData(seasonId)` hook |
| `Players.tsx` | 2 useStates | Extract `usePlayersData()` hook |
| `PlayerProfile.tsx` | Many useStates | Extract `usePlayerProfile(id)` hook |
| `MatchRooms.tsx` | 3+ useStates | Extract `useMatchRooms()` hook |
| `Documents.tsx` | 2 useStates | Extract `useDocuments()` hook |
| `ScriptDetail.tsx` | Multiple useStates | Extract `useScriptDetail(slug)` hook |

Each hook goes in `src/hooks/` and uses `useQuery` with proper `queryKey` for caching and auto-refetch.

Create/update/delete operations in admin components and forms already use `useMutation` (from the previous refactoring). Any remaining raw `supabase.from().insert/update/delete` calls in admin panels will also be wrapped.

---

## Step 3: Move MMR Calculation to Database RPC

Move the ELO/MMR calculation logic from `src/lib/mmrRecalculation.ts` and `src/lib/bloodRatings.ts` into two Supabase database functions:

1. **`recalculate_boardgame_mmr(p_season_id, p_game_id)`** — replays all matches and updates `mmr_ratings`
2. **`recalculate_blood_ratings(p_season_id)`** — replays all blood matches and updates `blood_mmr_ratings`

Both as `SECURITY DEFINER` functions callable via `supabase.rpc()`. The frontend files become thin wrappers that just call the RPC.

---

## Step 4: Cleanup

- Delete unused asset files from `src/assets/` (keep only `azd-logo.png`)
- Remove the `fetchData`/`useEffect` patterns replaced by hooks
- Ensure all `any` types in query results are replaced with proper interfaces from `src/types/database.ts`

---

## Technical Details

### New hooks directory structure
```text
src/hooks/
  useDashboardData.ts    (already exists)
  useGamesData.ts        (new)
  useGameDetail.ts       (new)
  useSeasonsData.ts      (new)
  useSeasonDetail.ts     (new)
  useRankingsData.ts     (new)
  usePlayersData.ts      (new)
  usePlayerProfile.ts    (new)
  useMatchRooms.ts       (new)
  useDocuments.ts        (new)
  useScriptDetail.ts     (new)
```

### Migration SQL needed
1. Create `game-assets` public storage bucket
2. Create `recalculate_boardgame_mmr` and `recalculate_blood_ratings` database functions

### Execution order
1. SQL migrations (bucket + RPC functions)
2. Upload assets and update DB image URLs
3. Create React Query hooks (can be done in batches)
4. Update pages to use hooks
5. Cleanup old files

This is a large refactoring — I recommend implementing it in 2-3 batches to keep changes reviewable.

