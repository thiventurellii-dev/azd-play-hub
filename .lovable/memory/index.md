# Project Memory

## Core

Dark theme, bg black (#0A0A0A), gold accents (#FFB800). Font: Inter.
Community name: Amizade (AzD). Board game ranking with ELO/MMR.
Lovable Cloud enabled. Roles in user_roles table (admin/player).
Logo: src/assets/azd-logo.png (white on black, use invert class).
Public routes: /, /about, /login, /register, /complete-profile. All others protected.

## Memories

- [Design tokens](mem://design/tokens) — Dark theme with gold/amber accents, semantic tokens
- [Database schema](mem://features/schema) — profiles, user_roles, seasons, games, matches, match_results, mmr_ratings, match_rooms, match_room_players, friendships, match_room_comments
- [Auth flow](mem://features/auth) — Email+password, auto profile+role on signup, admin promotion via panel
- [Blood scoring](mem://features/blood-scoring) — BotC scoring system with recalculation
- [Match rooms](mem://features/match-rooms) — Salas de partida com realtime, waitlist, WhatsApp invite, webhook placeholder
- [Navbar structure](mem://features/navbar) — Dropdowns: Competitivo (Seasons, Torneios), Acervo (Regras, Coleção, Materiais), Nossas Redes. Partidas link direto com Calendar icon. Mobile: accordion.
