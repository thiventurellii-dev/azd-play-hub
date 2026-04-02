# Project Memory

## Core
Dark theme, bg black (#0A0A0A), gold accents (#FFB800). Font: Inter.
Community name: Amizade (AzD). Board game ranking with ELO/MMR.
Lovable Cloud enabled. Roles in user_roles table (admin/player).
Logo: src/assets/azd-logo.png (white on black, use invert class).
Seasons have type: boardgame or blood (Blood on the Clocktower).

## Memories
- [Design tokens](mem://design/tokens) — Dark theme with gold/amber accents, semantic tokens
- [Database schema](mem://features/schema) — profiles, user_roles, seasons, games, matches, match_results, mmr_ratings, blood_scripts, blood_characters, blood_matches, blood_match_players, blood_mmr_ratings, season_blood_scripts
- [Auth flow](mem://features/auth) — Email+password, auto profile+role on signup, admin promotion via panel
- [Blood scoring](mem://features/blood-scoring) — Points: games×1 + evil_wins×2 + good_wins×1. Storyteller = 1pt (no bonus). Prize: 1-3rd R$75, 4-6th R$50, 7-10th R$30
