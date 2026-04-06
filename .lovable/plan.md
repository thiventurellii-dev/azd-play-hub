

## Plan: Fix Deep Link Crash, Scoring Bug, Player Search UX, Notifications & Social

### 1. Deep Link Crash Fix (`src/pages/MatchRooms.tsx`)

**Root cause**: The `onUpdate` callback in the deep link modal calls `fetchRooms()` which triggers a realtime channel refetch, and the `useEffect` watching `searchParams` re-fires because `searchParams` object reference changes after `fetchRooms` updates state. This creates an infinite loop of fetches where `deepLinkRoom` gets reset.

**Fix**:
- Extract `roomParam` once on mount using `useRef` so the deep link fetch only runs once
- In the `onUpdate` callback, wrap `setDeepLinkRoom` with a guard: only update if data is non-null (never overwrite with null)
- Add optional chaining on all `deepLinkRoom` accesses in JSX
- Add `catch` to the `.then()` chain to prevent unhandled promise errors

### 2. ScoringSheet Input Bug (`src/components/matches/ScoringSheet.tsx`)

**Root cause**: The `useEffect` on line 39-48 runs with `[players]` dependency. When `NewMatchFlow` re-derives `scoringPlayers` (line 127-130) on every render (it's not memoized), a new array reference is created, triggering the useEffect which resets `playerScores` to empty — erasing typed values.

**Fix**:
- In `NewMatchFlow.tsx`: memoize `scoringPlayers` with `useMemo` so the reference is stable
- In `ScoringSheet.tsx`: change the `useEffect` to only initialize scores when the player list actually changes (compare player IDs, not array reference). Use a ref to track previous player IDs and skip reinitialization if unchanged

### 3. Remove Separate Search Filter in NewMatchFlow Step 2

**Current**: A standalone "Filtrar jogadores" `Input` above the entries list filters the Select dropdown options.

**Fix** (`src/components/matches/NewMatchFlow.tsx`):
- Remove the standalone search input (lines 413-424)
- Replace the `Select` for player selection with a `Popover` + `Command` (cmdk) combobox pattern — the search is built into the dropdown itself
- This eliminates the external filter and gives a native searchable-select UX

### 4. BotC Script Selection

**Files**: `src/components/matches/NewMatchFlow.tsx`, `src/components/matchrooms/CreateRoomDialog.tsx`

- After game selection, check if the game name contains "Blood" or slug matches `blood-on-the-clocktower`
- If yes, fetch `blood_scripts` and show a "Selecionar Script" Select field
- Store the selected `script_id` in state; on submit, save it alongside the match/room data (use `description` field or a new column — check if `match_rooms` already has a script field)
- For NewMatchFlow: the script selection appears in Step 1 below the game selector

### 5. FriendButton Click Propagation on /players Page

**Root cause**: The `FriendButton` is inside a `<Link to={/perfil/...}>` wrapper (Players.tsx line 78). Clicking the button triggers the Link navigation.

**Fix** (`src/pages/Players.tsx`):
- Add `onClick={(e) => e.preventDefault()}` wrapper around the `FriendButton` div, or move `FriendButton` outside the `<Link>` element
- Best approach: restructure the card so only the player name/avatar area is the Link, and the FriendButton sits outside the clickable Link zone

### 6. Remove Notification Badge from Username Button

**Fix** (`src/components/Navbar.tsx`):
- Remove the badge span (lines 261-265) inside the username button
- Keep only the Bell icon badge (lines 271-275)

### 7. Instant Friend Status Update After Accept/Reject

**Fix**:
- In `Navbar.tsx`: after `handleAcceptFriend` / `handleRejectFriend`, the `fetchFriendRequests()` call already re-fetches. This is correct but needs to also broadcast a state change
- In `FriendButton.tsx`: add a realtime subscription on `friendships` table filtered to the current user, so when a friendship status changes (from Navbar), the button re-fetches automatically
- Alternative simpler approach: use a custom event (`window.dispatchEvent`) after accept/reject in Navbar, and listen for it in FriendButton to re-fetch

### Technical Summary

**Files to modify (5)**:
- `src/pages/MatchRooms.tsx` — deep link crash fix (ref-based fetch, null guard)
- `src/components/matches/ScoringSheet.tsx` — prevent score reset on re-render
- `src/components/matches/NewMatchFlow.tsx` — memoize scoringPlayers, replace search with combobox, add BotC script field
- `src/pages/Players.tsx` — move FriendButton outside Link to prevent navigation
- `src/components/Navbar.tsx` — remove badge from username button
- `src/components/matchrooms/CreateRoomDialog.tsx` — add BotC script selector
- `src/components/friendlist/FriendButton.tsx` — add realtime listener for instant status updates

**No database changes required.**

