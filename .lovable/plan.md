## Redesign do Perfil do Jogador

Reconstrução do `src/pages/PlayerProfile.tsx` para mover de "performance dominante" para "identidade primeiro", aplicar paleta por domínio (gold = Boardgame, vermelho = BotC, roxo = RPG) e organizar conteúdo em tabs.

A página atual (1004 linhas) será substancialmente reescrita. O fetch de dados será reorganizado em hooks dedicados para manter o componente legível.

---

### 1. Banco — campos novos (mínimo viável)

Migração SQL no banco externo (`npinawelxdtsrcvzzvvs`):

- `profiles.bio` text nullable, max 140 chars (validação app-side).
- Nova tabela `profile_showcased_games (profile_id uuid, game_id uuid, display_order int, PK composto)` para a seção "Jogos em destaque" curada. Fase 1: a coluna existe mas o fallback é auto-populado pelos top 4 mais jogados; modal de edição entra como follow-up.
- A view/tabela `profile_activity_events` proposta no briefing **NÃO** entra agora — vou agregar a timeline em memória (achievements + last matches + RPG sessions + community joined + level ups) já que hoje é só ~5-6 itens. Se virar gargalo, migra pra view depois.

A migração será apresentada para aprovação via tool de migração.

### 2. Tokens de cor por domínio

Adicionar em `tailwind.config.ts` / `src/index.css`:

- `--domain-board: 43 96% 56%` (gold já existe)
- `--domain-botc: 0 73% 67%` (vermelho `#e57373`)
- `--domain-rpg: 261 100% 83%` (roxo `#c4a8ff`)
- `--domain-info: 207 100% 64%` (azul verificado)
- `--domain-positive: 142 76% 73%` (verde)

Usadas em borders, ring, badge bg/text e dot do timeline.

### 3. Componentes novos (em `src/components/profile/`)

- `ProfileHero.tsx` — avatar 96px com **anel circular de XP** (SVG `<circle>` com `strokeDasharray` baseado em `pct`), pílula "Nv X" no canto, nome + verificado, `@nickname` em gold + pronomes, até 3 badges contextuais (Admin, Mestre, Storyteller — derivados), bio em serif itálico, linha de metadata (localização · membro desde · chip da comunidade principal), botões à direita.
- `ProfileSpotlight.tsx` — faixa "Em destaque agora" com até 2 cards: Season ativa (gold) e Mestrando (roxo). Some inteira se nada aplicável.
- `ProfileUpcomingMatches.tsx` — 2-3 cards full-width com DateBlock colorido por domínio + CTA "Entrar na sala" (com filtro de privacidade).
- `ProfileRecentMatchesStrip.tsx` — 5 mini-cards horizontais (reaproveita `RecentMatchCardCompact` com pequeno ajuste).
- `ProfileDomainTabs.tsx` — wrapper com tabs (`Boardgames N · Blood on the Clocktower N · RPG N`), tab ativa pinta border-bottom 2px da cor do domínio. Default: Boardgames.
- `tabs/BoardgamesTab.tsx` — "Jogos em destaque" (4 cards capa) + "Joga muito com" (4 parceiros).
- `tabs/BotcTab.tsx` — "Como Storyteller / Como Aventureiro" (2 stats cards) + "Personagens favoritos" (4 cards) + "Joga muito com" (breakdown Bem/Mal).
- `tabs/RpgTab.tsx` — "Como Mestre / Como Aventureiro" (2 stats cards) + "Personagens" (showcase, reaproveita `HallOfHeroes` simplificado) + "Campanhas" (lista) + "Co-aventureiros" (4).
- `ProfileTimeline.tsx` — linha do tempo unificada (5-6 eventos + "Ver tudo"), bolinhas coloridas por tipo.
- `ProfileFooterGrid.tsx` — Amigos + Comunidades em 2 colunas.

### 4. Hooks novos (em `src/hooks/`)

- `usePlayerProfileData.ts` — agrupa o fetch grande hoje monolítico em queries via React Query, expondo: `profile`, `role`, `boardgameStats`, `botcStats`, `rpgStats`, `friends`, `communities`, `achievements`, `seasons`, `upcomingRooms`, `recentMatches`, `partners`, `timelineEvents`, `mainCommunity`, `isMaster`, `isStoryteller`. Cada subgrupo é uma `useQuery` separada para evitar re-fetch geral.
- `useProfileRpgData.ts` — campanhas como mestre/aventureiro, personagens, co-aventureiros, próxima sessão.
- `useProfileShowcasedGames.ts` — lê `profile_showcased_games`; se vazio, retorna top 4 auto-derivado.

### 5. Estrutura final renderizada

```text
ProfileHero
ProfileSpotlight        (some se vazio)
ProfileUpcomingMatches  (com privacidade)
ProfileRecentMatchesStrip
ProfileDomainTabs
  └── tab ativa (Boardgames | BotC | RPG)
ProfileTimeline
ProfileFooterGrid (Amigos · Comunidades)
EditProfileDialog (controlado, igual hoje)
```

### 6. Privacidade

- Próximas partidas: filtra por `is_public` da room OR visitante é amigo do dono OR é o próprio.
- Campanhas RPG privadas para visitante: mostra nome+status, oculta mestre/party/sessões.

### 7. Detalhes técnicos

- **Anel de XP no avatar**: SVG 112x112 com 2 círculos concêntricos; stroke-dasharray = circumference, stroke-dashoffset = circumference * (1 - pct/100). Aposenta o uso de `XpBadge variant="full"` no hero (mantém o componente para outros usos).
- **Badge "Mestre"**: derivado de `rpg_campaigns where master_id = profile.id and status = 'active'` (já temos hook).
- **Badge "Storyteller"**: derivado de `sum(games_as_storyteller) >= 3` (já temos `botcStats`).
- **EditProfileDialog**: adicionar campo "Bio" (textarea, maxLength 140, contador).
- **Backwards-compat**: o Hall dos Heróis atual (`HallOfHeroes.tsx`) é embebido dentro da `RpgTab` em vez de ser seção solta.

### 8. Fora do escopo desta entrega

- Modal de edição de "Jogos em destaque" com drag-and-drop (fase 2 — a tabela existe, pode ser editada manualmente; fallback automático funciona).
- View materializada `profile_activity_events` (agregação em memória por enquanto).
- Página "Ver tudo" da timeline (link aponta para futuro `/perfil/:nickname/atividade`, mas a rota fica como TODO se ainda não existir — botão pode ser stub).

### 9. Arquivos modificados

- **Novos**: 11 componentes em `src/components/profile/` + `src/components/profile/tabs/` + 3 hooks em `src/hooks/` + 1 SQL em `docs/sql/`.
- **Editados**: `src/pages/PlayerProfile.tsx` (reescrito), `src/components/profile/EditProfileDialog.tsx` (campo bio), `src/index.css` ou `tailwind.config.ts` (tokens de domínio), `src/types/database.ts` (se tipar bio/showcased).

Pronto para implementar quando aprovado.