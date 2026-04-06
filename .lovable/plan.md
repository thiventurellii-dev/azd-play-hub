

## Plan: Fix Critical Bugs & Add Steam Integration

### 1. Fix NewMatchFlow Step 2 Black Screen

**Root cause analysis**: The Step 2 rendering code at lines 405-481 looks structurally sound. The likely culprit is the `<SelectItem value="">Nenhuma</SelectItem>` at line 448 — Radix UI Select crashes when `value=""` is used. Additionally, if `filteredPlayers` is empty or `allPlayers` hasn't loaded yet, the Select dropdown may cause issues.

**Changes in `src/components/matches/NewMatchFlow.tsx`**:
- Replace `<SelectItem value="">Nenhuma</SelectItem>` with `<SelectItem value="none">Nenhuma</SelectItem>` for factions
- Add null/loading guards around Step 2 rendering — show a spinner if `allPlayers` is still loading
- Wrap the entire step rendering in an ErrorBoundary component to catch and display errors gracefully instead of white-screening
- Create `src/components/ErrorBoundary.tsx` — a simple class component that catches render errors and shows a fallback message with error details in dev mode

### 2. Steam Integration

**Database**: Add `steam_id` column (text, nullable) to `profiles` table via migration.

**Edge Function** `supabase/functions/steam-auth/index.ts`:
- Handles two flows:
  - `GET /steam-auth?action=login` → redirects to Steam OpenID login URL with `openid.return_to` pointing back to the app
  - `GET /steam-auth?action=callback&openid.claimed_id=...` → validates the Steam response, extracts the 17-digit Steam ID, returns it to the client
- The client will call this edge function and handle the redirect

**Frontend changes**:
- In `src/pages/PlayerProfile.tsx`: Add a "Vincular Steam" button in the edit profile section when `isOwnProfile`
  - On click, redirect to Steam OpenID via the edge function
- Create route `/auth/steam/callback` in `App.tsx` pointing to a new `src/pages/SteamCallback.tsx`
  - Extracts `openid.claimed_id` from URL params
  - Saves the Steam ID to the user's profile via Supabase
  - Redirects back to the user's profile
- Display a Steam icon (inline SVG) next to the player name when `steam_id` is present on the profile

### 3. Fix Deep Linking for Match Rooms

**Problem**: The deep link modal opens but may not find rooms in past/finished tabs, and the room data in the modal doesn't refresh.

**Changes in `src/pages/MatchRooms.tsx`**:
- When `?room=ID` is detected, search ALL rooms (not just active ones) for the matching ID
- Auto-switch to the correct tab (active vs past) based on the room's status
- Ensure the `deepLinkRoom` modal uses a fully functional `MatchRoomCard` with live player data
- Add a visual glow effect (`ring-2 ring-gold animate-pulse-gold`) to the highlighted card in the background

### 4. Refine WhatsApp Sharing

**Changes in `src/lib/matchNotification.ts`**:
- The `generateWhatsAppInvite` function already uses `encodeURIComponent` correctly (line 39)
- Add a new parameter `confirmedPlayers: string[]` to include in the message text
- Update message template: add `✅ Confirmados: Player1, Player2...` line

**Changes in `src/components/matchrooms/MatchRoomCard.tsx`**:
- Pass the confirmed players' display names to `generateWhatsAppInvite`
- Update `handleShare` to include the player list

### 5. Console Warning Fix (Bonus)

**Changes in `src/components/Navbar.tsx`**:
- Remove unused `DropdownMenu` imports (they're still used for nav menus, so keep those)
- The "Function components cannot be given refs" warning comes from DiscordIcon/WhatsAppIcon — wrap them with `React.forwardRef` or use them differently where they're passed as children

### Technical Details

**Files to create**:
- `src/components/ErrorBoundary.tsx`
- `src/pages/SteamCallback.tsx`
- `supabase/functions/steam-auth/index.ts`

**Files to modify**:
- `src/components/matches/NewMatchFlow.tsx` — SelectItem fix, loading guards, ErrorBoundary wrapper
- `src/pages/PlayerProfile.tsx` — Steam link button + icon display
- `src/pages/MatchRooms.tsx` — Deep link tab switching + glow effect
- `src/components/matchrooms/MatchRoomCard.tsx` — Pass player names to share
- `src/lib/matchNotification.ts` — Add confirmed players to WhatsApp message
- `src/App.tsx` — Add `/auth/steam/callback` route

**Migration**: Add `steam_id` text column to `profiles`

