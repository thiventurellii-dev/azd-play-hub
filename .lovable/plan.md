# Sistema de Comunidades — Plano de Implementação

## Visão geral

Comunidades são hubs/clãs que agrupam jogadores em torno de jogos, torneios e discussões. Toda partida, sala, torneio e discussão poderá (opcionalmente) pertencer a uma comunidade, possibilitando rankings internos, partidas exclusivas e identidade visual própria. Implementação faseada — começamos com o **núcleo (listagem + página da comunidade + membros + partidas vinculadas)** e deixamos torneios/discussões/mídia como fases seguintes.

## Como integra com o que já existe


| Sistema atual               | Integração                                                                                                                                                 | &nbsp; | &nbsp; |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| `match_rooms`               | Coluna opcional `community_id`. Salas podem ser "exclusivas da comunidade" (só membros entram) ou abertas.                                                 | &nbsp; | &nbsp; |
| `matches` / `blood_matches` | Coluna opcional `community_id` (preenchida quando a sala que originou a partida tinha comunidade). Permite calcular "partidas realizadas pela comunidade". | &nbsp; | &nbsp; |
| &nbsp;                      | &nbsp;                                                                                                                                                     | &nbsp; | &nbsp; |
| `profiles`                  | Inalterado. Vínculo via tabela de membros.                                                                                                                 | &nbsp; | &nbsp; |
| `seasons`                   | Coluna opcional `community_id` para torneios/temporadas internas (fase 2).                                                                                 | &nbsp; | &nbsp; |
| `user_favorites`            | Reaproveitado: adicionamos `community` ao enum para permitir favoritar comunidades (estrela já vista nos mockups).                                         | &nbsp; | &nbsp; |
| Sidebar / BottomNav         | Novo item "Comunidades" no nav principal e no drawer mobile.                                                                                               | &nbsp; | &nbsp; |


## Arquitetura de dados (Supabase externo `npinawelxdtsrcvzzvvs`)

### Novas tabelas

`**communities**`

- `id` uuid pk
- `slug` text unique
- `name` text
- `tagline` text — frase curta ("Jogar, competir e evoluir juntos")
- `description` text
- `logo_url` text — escudo/ícone
- `cover_url` text — banner do header
- `country` text default `'BR'`
- `language` text default `'pt-BR'`
- `visibility` enum `public|private|invite_only`
- `join_policy` enum `open|approval|invite_only`
- `community_type` enum `boardgame|botc|rpg|mixed`
- `created_by` uuid
- `created_at`, `updated_at`

`**community_members**`

- `id`, `community_id`, `user_id`
- `role` enum `leader|moderator|member`
- `status` enum `active|pending|banned`
- `xp` integer default 0 — alimenta "Membros em destaque" / Ranking interno
- `joined_at`

`**community_join_requests**` (quando `join_policy='approval'`)

- `id`, `community_id`, `user_id`, `message`, `status (pending|approved|rejected)`, `reviewed_by`, timestamps

`**community_tags**` + `**community_tag_links**`

- Tags livres ("Estratégia", "Casual", "Competitivo") exibidas nos cards.

`**community_games**`

- `community_id`, `game_id` — "Jogos principais" para o filtro da listagem.

`**community_discussions**` (fase 2 — incluído no schema, UI fica para depois)

- `id`, `community_id`, `author_id`, `title`, `body`, `game_id?`, `tags[]`, `views`, timestamps

`**community_discussion_replies**` (fase 2)

- `id`, `discussion_id`, `author_id`, `body`, timestamps

### Alterações em tabelas existentes

- `match_rooms`: adicionar `community_id uuid null` + `community_only bool default false`.
- `matches`, `blood_matches`: adicionar `community_id uuid null` (preenchido por trigger ao fechar a sala).
- `seasons`: adicionar `community_id uuid null` (torneios internos vs. globais).
- `user_favorites`: estender enum `favorite_entity_type` com `'community'`.

### RLS (resumo)

- `communities`: SELECT público para `visibility='public'`; demais somente para membros ativos. UPDATE/DELETE só para `leader` (verificado via função `has_community_role(user, community, role)` SECURITY DEFINER, mesmo padrão do `has_role` para evitar recursão).
- `community_members`: SELECT membros ativos da própria comunidade; INSERT pelo próprio usuário (com `status='pending'` quando `join_policy='approval'`); UPDATE/DELETE de outros membros só por leader/moderator.
- `community_join_requests`: leader/moderator gerenciam; usuário vê as próprias.
- `match_rooms` com `community_only=true`: SELECT/INSERT exigem ser membro ativo.

### Função e view auxiliares

- `has_community_role(_user uuid, _community uuid, _role text)` SECURITY DEFINER.
- `community_stats` view: agrega contagem de membros, partidas, torneios e ranking geral por comunidade (consumida pela home e pelo card lateral "Comunidades populares").

## Frontend

### Rotas novas (App.tsx)

- `/comunidades` → `Communities.tsx` (listagem — primeira imagem)
- `/comunidades/:slug` → `CommunityDetail.tsx` (página da comunidade — segunda imagem)
- `/comunidades/nova` → criação (modal/page) para usuários autenticados

### Componentes novos

```
src/pages/
  Communities.tsx
  CommunityDetail.tsx
src/components/communities/
  CommunityCard.tsx              — usado em "destaque" e "todas as comunidades"
  CommunityListRow.tsx           — variação enxuta da listagem
  CommunityHero.tsx              — header com logo, cover, tags, botão editar
  CommunityStatsRow.tsx          — 4 caixas (Membros, Partidas, Torneios, Ranking)
  CommunityTabs.tsx              — Visão geral | Membros | Partidas | Torneios | Discussões | Mídia
  CommunityUpcomingMatches.tsx   — reaproveita MatchRoomCard filtrado por community_id
  CommunityActiveTournaments.tsx — fase 2 (placeholder no fase 1)
  CommunityAboutCard.tsx         — descrição + regras principais
  CommunityFeaturedMembers.tsx   — top 5 por XP com badge "Líder"
  CommunityRecentActivity.tsx    — feed (joins, partidas criadas, etc.)
  CommunityFiltersSidebar.tsx    — busca + jogos + idioma + tipo
  CreateCommunityDialog.tsx
  JoinCommunityButton.tsx        — comportamento depende de join_policy
src/hooks/
  useCommunities.ts              — listagem + filtros + paginação
  useCommunityDetail.ts          — fetch agregado da comunidade + stats
  useCommunityMembership.ts      — estado do usuário (membro? pendente? leader?)
```

### Reaproveitamentos

- `FavoriteButton` já cobrirá `entity_type='community'` (estrela ao lado do nome — visível nos mocks).
- `MatchRoomCard` (já existe) usado em "Próximas partidas" da comunidade.
- `EntityEditButton` / `EntitySheet` para o botão "Editar comunidade" (padrão das outras entidades).
- `RankingCards` para o bloco de membros em destaque.

### Navegação

- Adicionar "Comunidades" ao `BottomNav` (substituindo provavelmente "Jogadores" no slot principal — confirmar) e ao drawer "Mais".
- Adicionar entrada na `Navbar` desktop.

## Fases sugeridas

**Fase 1 — Núcleo (escopo deste plano para implementar agora)**

- Migração SQL completa (tabelas, enums, RLS, função, view, alterações em `match_rooms`/`matches`/`blood_matches`/`seasons`/`user_favorites`).
- Páginas `/comunidades` e `/comunidades/:slug` com: hero, stats, tabs **Visão geral + Membros + Partidas**.
- Criação de comunidade, ingresso (open/approval), edição pelo líder.
- Vínculo opcional ao criar `match_rooms` (campo "Comunidade" no `CreateRoomDialog`).
- Filtro de comunidades + favoritar comunidade.

**Fase 2 — depois de validar fase 1**

- Aba Torneios (seasons internas) + Discussões + Mídia.
- Feed de "Atividade recente" e "Membros em destaque" com XP automatizado por triggers.
- Convites diretos, banimento, transferência de liderança.

## Pontos para confirmar antes de implementar

1. **Escopo da fase 1**: confirmo apenas Núcleo (Visão geral / Membros / Partidas), deixando Torneios/Discussões/Mídia como placeholders "Em breve" nas tabs? [Sim]
2. **Slot no BottomNav mobile**: substituir "Jogadores" por "Comunidades", ou manter ambos (Comunidades vai para o drawer "Mais")? [Sim]
3. **Vínculo de partidas**: ao criar uma sala dentro de uma comunidade, ela deve ser **sempre exclusiva** dos membros, ou o criador escolhe entre "exclusiva" vs. "aberta a todos com a tag da comunidade"? [Criador Escolhe]
4. **Múltiplas comunidades por usuário**: usuário pode pertencer a várias (recomendado) — confirmar. [Sim]  
  
O sistema de XP vai ser Global e não atrelado especificamente a comunidade. Depois vamos pensar em um sistema para integrar isto.

Após sua aprovação e respostas, sigo com a migração SQL no banco externo + implementação da fase 1.