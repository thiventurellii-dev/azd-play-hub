## Plan: UI Improvements, Scrollbar Styling, Cards, Notifications, and Game Page Fixes

### 1. Ghost Scrollbars (Desktop)

**File: `src/index.css**`

- Add custom scrollbar CSS using `::-webkit-scrollbar` and `scrollbar-color` properties
- Default state: transparent track, invisible thumb
- On hover (`:hover`): reveal thumb with subtle color matching mobile scrollbar (gray/muted)
- Apply globally to all scrollable containers

### 2. Fixed-size Cards for Rooms and BotC Scripts

**File: `src/components/matchrooms/MatchRoomCard.tsx**`

- Set fixed card height (`h-[380px]` or similar) with `overflow-hidden`
- Hide partially comments section by default behind a "Ver mais comentários" toggle button
- When toggled, expand the card or show comments inline with scroll
- Truncate description with `line-clamp-2`

**File: `src/pages/Games.tsx**` (Blood scripts section)

- Apply fixed card dimensions to BotC script cards
- Truncate character lists with a "Ver Personagens" expand toggle. Dont expand all cards, only the one clicked by the user.

### 3. Notification Bell (Central de Notificações)

**File: `src/components/Navbar.tsx**`

- Add a `Bell` icon (from lucide-react) to the right of the user avatar in the navbar
- Create a dropdown/popover showing past notifications
- Initially: show a placeholder "Sem notificações" state (no backend table needed yet — future-ready)
- Badge counter for unread notifications (static 0 for now)

### 4. Steam Icon Fix

**File: `src/pages/PlayerProfile.tsx**`

- Replace the current custom SVG path (which doesn't look like Steam) with the proper Steam logo SVG icon — the well-known Steam Valve logo

### 5. Fix Room Deep Link (Black Screen)

**Root cause**: The `deepLinkRoom` modal renders a `MatchRoomCard` inside a `DialogContent`, but if the room data is stale or the modal renders before `rooms` are loaded, it shows nothing. Also, the dialog might close immediately if `deepLinkRoom` is set before rooms finish loading.

**Implementation Steps to Solve:**

1. **Direct Single-Record Fetching:**
  - In src/pages/MatchRooms.tsx, implement a secondary, isolated Supabase query that triggers when ?room=ID is detected in the URL.
  - Use .select('*').eq('id', roomId).single() to fetch the specific room data independently of the main rooms list.
2. **Robust Loading States (Skeleton UI):**
  - Modify the RoomDetailModal to immediately open when a roomId param exists.
  - Implement a **Skeleton Loader** or **Loading Spinner** inside the DialogContent. Do not attempt to render the MatchRoomCard until the specific fetch is successful.
3. **Defensive Rendering (Optional Chaining):**
  - Apply **Optional Chaining (?.)** across the MatchRoomCard and its sub-components (Comments, Players, Game Info) to handle null or undefined data during the transition phase.
  - Ensure that any mathematical calculations (scoring averages) provide a fallback value (e.g., ?? 0) to prevent NaN errors.
4. **Error Handling & Graceful Fallback:**
  - If the direct fetch returns no data (404), trigger a "Room not found" Toast and programmatically close the Dialog.
  - Upon closing the Modal, use useSearchParams to clean the URL (remove the room param) without triggering a full page reload.
5. **Interactive Card Integration:**
  - Ensure the Modal-centric view supports all core interactions (Joining, Leaving, Commenting) by passing the freshly fetched data to the existing card logic.
  - Fix the layout issue where Room Cards in the main grid have inconsistent heights; force a uniform card size with an expandable section for long comment threads.

### 6. WhatsApp Emoji Fix

**File: `src/lib/matchNotification.ts**`

- The emojis in the message are Unicode characters that should work fine with `encodeURIComponent`
- The issue is likely that the `encodeURIComponent` is double-encoding or the `wa.me` URL is malforming
- Verify the emoji characters are standard Unicode (🎲, 🎮, 📅, ✅, 👉) — these are already correct in the code
- Test: the current code looks correct. The issue might be browser/OS specific. No code change needed unless testing reveals a specific encoding issue.

### 7. Fix Edit Match Button (Game Detail History)

**File: `src/pages/GameDetail.tsx**` (line ~908)

- The Pencil button currently has `/* TODO: edit match */` — it does nothing
- Implement: add state for `editingMatch` and a Dialog with fields to edit the match (date, duration, player results)
- Reuse similar logic from `AdminMatches.tsx` for the edit form
- On save: update `matches` and `match_results` tables, then refresh the history

### 8. Average Game Duration in Header

**File: `src/pages/GameDetail.tsx**` (line ~489, inside the hero banner stats)

- Calculate average duration from `allMatches` using `duration_minutes`
- Add a `Clock` icon + "~Xmin" next to the player count in the header
- Calculation: `Math.round(sum(duration_minutes) / count_with_duration)`

### Technical Details

**Files to modify:**

- `src/index.css` — ghost scrollbar styles
- `src/components/Navbar.tsx` — notification bell
- `src/components/matchrooms/MatchRoomCard.tsx` — fixed card + collapsible comments
- `src/pages/MatchRooms.tsx` — remove deep link modal, use scroll+highlight only
- `src/pages/GameDetail.tsx` — edit match button, avg duration in header
- `src/pages/PlayerProfile.tsx` — Steam icon SVG
- `src/pages/Games.tsx` — fixed BotC script card sizes
- `src/lib/matchNotification.ts` — verify emoji encoding (likely no change needed)

**No database changes required.**