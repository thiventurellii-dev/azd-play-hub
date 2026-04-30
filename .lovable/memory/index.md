# Project Memory

## Core
Dark theme, bg black (#0A0A0A), gold accents (#FFB800). Font: Inter.
Community name: Amizade (AzD). Board game ranking with ELO/MMR.
App lê dados da instância EXTERNA (npinawelxdtsrcvzzvvs) via src/lib/supabaseExternal.ts. Lovable Cloud existe mas não é a fonte de dados. Migrações novas precisam ser aplicadas manualmente no SQL Editor externo.
Logo: src/assets/azd-logo.png (white on black, use invert class).
Badges: SEMPRE texto branco (text-white). Diferenciar por border/bg, nunca por cor de texto.

## Memories
- [Design tokens](mem://design/tokens) — Dark theme with gold/amber accents, semantic tokens
- [Badges](mem://design/badges) — Regra: todas as badges com texto branco
- [Database schema](mem://features/schema) — profiles, user_roles, seasons, games, matches, match_results, mmr_ratings
- [Auth flow](mem://features/auth) — Email+password, auto profile+role on signup, admin promotion via panel
- [RPG Campaigns](mem://features/rpg-campaigns) — Campanhas, personagens, mural, convites, timeline ligada a match_rooms
