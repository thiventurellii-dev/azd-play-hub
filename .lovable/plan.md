

# Plan: RPG Fixes, BotC Script Detail Page, and Character Icons

## Summary

1. Fix the RPG "Adicionar Aventura" button click issue
2. Add Separator between Systems and Adventures sections in RPG
3. Create a new BotC Script detail page at `/scripts/:scriptId` with rich stats and character grid
4. Add `victory_conditions` column to `blood_scripts` table
5. Add `icon_url` column to `blood_characters` for character images
6. Fetch character icons from the BotC wiki CDN based on `name_en`

---

## Technical Details

### Database Migration

```sql
-- Add victory conditions to scripts (JSONB array of strings)
ALTER TABLE blood_scripts ADD COLUMN victory_conditions jsonb DEFAULT '[]'::jsonb;

-- Add icon_url to characters for cached icon URLs
ALTER TABLE blood_characters ADD COLUMN icon_url text;

-- Add slug to blood_scripts for URL routing
ALTER TABLE blood_scripts ADD COLUMN slug text;
```

Update existing scripts with slugs: `trouble-brewing`, `bad-moon-rising`, `over-the-river`.

### Step 1: RPG Bug Fix (`Games.tsx`)

The "Adicionar Aventura" button at line 553 likely has a z-index or event propagation issue. Fix by ensuring the button is not inside a clickable card container, or by stopping propagation. Also verify `disabled` logic works when systems exist.

Add a `<Separator />` between the Systems grid and Adventures section within each expanded system card.

### Step 2: New Script Detail Page

**New file**: `src/pages/ScriptDetail.tsx`

Route: `/scripts/:slug` (add to `App.tsx`)

**Sections**:
1. **Header**: Script name, description, edit button (admin). Victory conditions editor in edit dialog.

2. **Quick Stats Bar**: 4 cards showing:
   - Total play time (sum of `duration_minutes` from `blood_matches` for this script)
   - Average match duration
   - Good win % (blue) — from `blood_matches.winning_team`
   - Evil win % (red) — from `blood_matches.winning_team`

3. **Character Grid** grouped by `role_type`:
   - **Townsfolk** (blue section header)
   - **Outsiders** (blue, lighter)
   - **Minions** (red section header)
   - **Demons** (red, darker)
   
   Each character card shows:
   - Icon (from `icon_url` or fetched from CDN: `https://wiki.bloodontheclocktower.com/images/...`)
   - Name (PT) + Name (EN) subtitle
   - Description/ability text
   - Stats: times played (from `blood_match_players`), top 3 players who played this character

4. **Aggregators Section**:
   - "Demônios Cruéis": players who played demon characters the most in this script
   - "Prefeitos Leais": count of mayor victory conditions marked (requires victory_conditions tracking per match)

5. **Match History**: Recent matches for this script with results

### Step 3: Character Icon Integration

Use the BotC wiki as CDN source. The pattern is:
`https://wiki.bloodontheclocktower.com/images/thumb/{Hash}/{Name}_Icon.png`

Since wiki URLs are unpredictable, instead:
- Add an `icon_url` field to `blood_characters`
- Provide a utility in the admin panel to batch-set icon URLs
- Use a known GitHub source: `https://raw.githubusercontent.com/Covre912/TradutorDeScriptsBotC/main/` or similar for images
- Fallback: use `name_en` to generate a placeholder icon with initials

### Step 4: Script Navigation from Games Page

Update the BotC script cards in `Games.tsx` to link to `/scripts/:slug` when clicked, similar to how boardgame cards navigate to `/jogos/:slug`.

### Step 5: Admin Edit for Victory Conditions

In the script detail page edit dialog:
- Add a dynamic list for victory conditions (add/remove text entries)
- Save to `blood_scripts.victory_conditions` as JSONB array

---

## Files to Create
- `src/pages/ScriptDetail.tsx` — full detail page for BotC scripts

## Files to Modify
- `src/App.tsx` — add `/scripts/:slug` route
- `src/pages/Games.tsx` — fix RPG button bug, add Separator, link scripts to detail page
- `src/components/admin/AdminBloodScripts.tsx` — add victory_conditions and icon_url editing

## Migration
- Add `victory_conditions`, `slug` to `blood_scripts`; add `icon_url` to `blood_characters`
- Update existing script slugs via insert tool

