

## Plan: Bug Fixes — NewMatchFlow Focus, Deep Link Crash, UI/UX, Notifications, Search, Admin

### 1. NewMatchFlow — Fix Input Focus Loss

**Root cause**: The player search `Input` at line 421-427 is inside a `SelectContent` which re-renders when `playerSearch` state changes, causing the Select dropdown to re-mount. Also, `entries.map((e, i) => ...)` uses `key={i}` (index-based) which causes remount when entries change.

**Fix in `src/components/matches/NewMatchFlow.tsx`**:
- Change `key={i}` on player entry rows (line 414) to `key={e.player_id || \`entry-${i}\`}` for stable keys
- Move the `playerSearch` input **outside** the `SelectContent` — place it above the Select as a standalone filter input, so typing doesn't cause the Select dropdown to re-render
- This avoids the Radix Select dropdown trapping/losing focus on state change

### 2. Deep Link — Fix Crash After Load

**Root cause**: The `MatchRoomCard` inside the deep link Dialog accesses `room.game.name`, `room.game.image_url` etc. without optional chaining. When `onUpdate` triggers a re-fetch and `deepLinkRoom` briefly becomes stale or the re-fetch returns a different shape, it crashes.

**Fix in `src/pages/MatchRooms.tsx`**:
- Add optional chaining in the deep link modal: `deepLinkRoom?.game?.name`
- Wrap the `onUpdate` callback to catch errors and not set null data
- Add a guard: if `deepLinkRoom` becomes null during re-fetch, keep the old data until new data arrives (use a ref or conditional set)

**Fix in `src/components/matchrooms/MatchRoomCard.tsx`**:
- Add optional chaining throughout: `room?.game?.name`, `room?.game?.image_url`, `room?.scheduled_at`
- Guard `fetchPlayers` against undefined `room.id`

**Logged-out access**: Already handled — `/partidas` uses `ProtectedRoute` which redirects to `/login`. The `?room=ID` param is preserved in the URL after redirect.

### 3. Comments Scroll — Remove Double Scroll

**Fix in `src/components/matchrooms/MatchRoomCard.tsx`**:
- The card has `overflow-hidden` on `CardContent` AND the comments section has `max-h-[200px] overflow-y-auto` — this is correct but the `RoomComments` component also has `max-h-60 overflow-y-auto` internally (line 101 of RoomComments.tsx). Remove the outer `max-h-[200px] overflow-y-auto` from MatchRoomCard's comments wrapper (line 283), let only RoomComments handle its own scroll
- Add smooth transition for comments expand/collapse using CSS transition on max-height

### 4. WhatsApp Emojis

**Root cause**: The current code uses `\u{1F3B2}` Unicode escapes which should work. The issue may be that the `wa.me` link is opened with `window.open` which in some browsers double-encodes. 

**Fix in `src/lib/matchNotification.ts`**:
- Change from `https://wa.me/?text=` to `https://api.whatsapp.com/send?text=` which handles Unicode better
- Verify the escapes are correct (they are)

### 5. Room Capacity Validation

**Fix in `src/components/matchrooms/CreateRoomDialog.tsx`**:
- Fetch `max_players` from the selected game when `gameId` changes
- Set `maxPlayers` default to the game's `max_players` when a game is selected
- Validate that the entered `maxPlayers` doesn't exceed the game's `max_players` on submit

**Fix in `src/components/matchrooms/MatchRoomCard.tsx`**:
- In `handleJoin`, the existing check `isFull = confirmed.length >= room.max_players` already enforces this at join time — no change needed here

### 6. Notification Bell — Friend Requests

**Fix in `src/components/Navbar.tsx`**:
- Replace the static "Sem notificações" with actual friend request data
- Fetch pending friend requests (where `friend_id === user.id` and `status === 'pending'`) with requester profile info
- Display each request with Accept/Reject buttons inline (no navigation)
- On accept/reject, update the friendship and re-fetch the list immediately
- Show the pending count as a badge on the Bell icon

### 7. Player Search Bar

**Fix in `src/pages/Players.tsx`**:
- Add a `search` state and an `Input` with search icon above the player grid
- Filter `players` by `name` or `nickname` matching the search query (case-insensitive)

### 8. Admin Match Edit — Unified + Delete

**Status**: `EditMatchDialog` already exists and is used in `GameDetail.tsx`. `AdminMatches.tsx` still has its own inline edit logic.

**Fix in `src/components/admin/AdminMatches.tsx`**:
- Import and use `EditMatchDialog` instead of the inline edit dialog
- Remove duplicated edit form code

**Fix in `src/components/matches/EditMatchDialog.tsx`**:
- Add a "Excluir Partida" button (admin-only) with confirmation dialog
- On confirm: delete from `match_results` where `match_id`, then delete from `matches`
- Log the deletion via `logActivity`

### Technical Summary

**Files to modify (9)**:
- `src/components/matches/NewMatchFlow.tsx` — stable keys, move search outside Select
- `src/pages/MatchRooms.tsx` — optional chaining in deep link modal
- `src/components/matchrooms/MatchRoomCard.tsx` — optional chaining, remove double scroll
- `src/lib/matchNotification.ts` — use api.whatsapp.com URL
- `src/components/matchrooms/CreateRoomDialog.tsx` — capacity validation from game
- `src/components/Navbar.tsx` — friend requests in notification bell
- `src/pages/Players.tsx` — search bar
- `src/components/admin/AdminMatches.tsx` — use EditMatchDialog
- `src/components/matches/EditMatchDialog.tsx` — add delete button

**No database changes required.**

