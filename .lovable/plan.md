# Redesign das Seasons

## Visão geral

Reformular `Seasons.tsx` (lista) e `SeasonDetail.tsx` (detalhe) seguindo os mockups, mantendo toda a lógica atual (boardgame/blood, criar/editar admin, MMR).

---

## 1. Migration: capa da season

Adicionar uma única coluna:
- `seasons.cover_url text NULL`

Helper de UI: se `cover_url` vazio, cair para `games.image_url` do primeiro `season_games` (boardgame) ou `blood_scripts.image_url` do primeiro `season_blood_scripts` (blood). Já temos esses dados em `useSeasonsData`.

Atualizar `Seasons.tsx` (form Criar/Editar) para incluir um campo "Imagem de capa (URL)" opcional.

---

## 2. `Seasons.tsx` — página de lista

Estrutura nova (top-down):

1. **Header** — título "Seasons", subtítulo "Competições oficiais da comunidade", botão "Criar Season" (admin) à direita, botão secundário "Entenda como funciona" (abre dialog curto explicando MMR/ranking — copy curta).
2. **Tabs `Abertas` / `Encerradas`** com contagem (`active+upcoming` vs `finished`).
3. **Calendário das Seasons** (novo componente `SeasonsTimeline.tsx`):
   - Visualizações: `Semana` / `Mês` / `Trimestre` (default Trimestre), com nav `‹ Hoje ›`.
   - Renderiza barras horizontais por season usando `start_date`/`end_date`, posicionadas via cálculo de % no range visível.
   - Linha "Hoje" tracejada vertical.
   - **Cor da barra**: cinza (`muted`) se o usuário logado **não tem partida** na season; senão cor por status (gold=ativa, purple=em breve, green=em andamento curto/intertemporada, blue=futura, gray=encerrada — usar paleta do mockup mas mapeada aos tokens).
   - Participação calculada uma vez via query: união de `match_results.player_id = user.id JOIN matches ON season_id` e `blood_match_players.player_id = user.id JOIN blood_matches ON season_id` → `Set<seasonId>`. Exposto por novo hook `useUserSeasonParticipation()`.
   - Legenda na base com bolinhas das cores.
4. **Seasons Ativas (N)** — grid 3 colunas de cards grandes com capa à esquerda (80–110px), nome + badge de status, jogo/script vinculado, datas, premiação total e contagem de participantes (count distinct de `mmr_ratings.player_id`/`blood_mmr_ratings.player_id` por season — adicionar ao `useSeasonsData`). Card todo clicável.
5. **Seasons Encerradas** — **collapsible** (`@/components/ui/collapsible`), fechado por padrão, mostrando linhas compactas (uma por season) com: ícone, nome, badge "Finalizada", jogo, datas, campeão (1º colocado do ranking — pegar do `mmr_ratings`/`blood_mmr_ratings` ordenado), premiação total. Clicável → detalhe.

Manter o dialog Criar/Editar atual + adicionar campo `cover_url`.

---

## 3. `SeasonDetail.tsx` — página de detalhe

Layout em duas colunas (desktop ≥ lg): **sidebar esquerda 280px** + **conteúdo direita**. No mobile vira coluna única.

### Header (topo, full-width)
- Link "← Voltar para Seasons".
- Linha 1: nome grande, badge tipo (Boardgame/Blood), badge status.
- Linha 2: ícone do jogo/script + nome do jogo/script vinculado.
- Linha 3: datas + "(N dias restantes)" se ativa, badge "Temporada oficial", badge "Ranking público".
- Botões à direita: **Compartilhar** (copia URL atual via `navigator.clipboard`, toast) e **Convidar jogadores** (botão visual; onClick mostra toast "Em breve" — placeholder).

### Sidebar esquerda
- Capa (imagem grande arredondada, usa `cover_url` ou fallback).
- Card "Premiação Total" com R$ X total e mini-cards 1º/2º/3º (boardgame) ou 1º-3º/4º-6º/7º-10º (blood).
- Bloco "Sistema de pontuação: MMR Global / Formato: Competitivo / Partidas válidas: Jogos ranqueados / Critério de desempate: Maior win rate, depois MMR" (estático por enquanto, copy fixa).
- Botão "Regulamento da temporada" → link externo (placeholder `#` por enquanto, ou rota `/rules`).

### KPIs (4 cards no topo do conteúdo)
1. **Participantes** — `count(distinct player_id)` em `mmr_ratings`/`blood_mmr_ratings` da season. Link "Ver todos" abre tab Ranking.
2. **Partidas realizadas** — `count(matches)` ou `count(blood_matches)`. Link "Ver partidas" abre tab Partidas.
3. **Win Rate médio** — média de `wins/games_played` entre rankings com `games_played > 0`.
4. **MMR médio** — média de `current_mmr` (boardgame) ou `total_points` (blood).

### Tabs (substituir Tabs atual)
`Ranking` | `Partidas` | `Estatísticas` | `Jogos` (boardgame só) | `Histórico`

- **Ranking** (default): tabela atual à esquerda + painel "Estatísticas da temporada" à direita (ver abaixo). Em mobile, painel vira card abaixo.
- **Partidas**: lista atual já existente.
- **Estatísticas**: tela cheia com tudo do painel + gráficos maiores.
- **Jogos**: tab atual (só boardgame).
- **Histórico**: feed cronológico simples (últimas 20 partidas em ordem reversa, formato similar a "Últimas partidas").

### Painel "Estatísticas da temporada" (lateral direita do Ranking)

Computado client-side a partir das matches já carregadas:

a. **Facções mais jogadas** (boardgame): agrupa `match_results.faction` (não-nulo) por season → barras horizontais com % e contagem. Top 5. Para Blood: usa `blood_match_players` agrupado por `team` (Mal/Bem/Storyteller).
b. **Jogadores com mais vitórias**: top 3 por `wins` (avatar + nick + número).
c. **Maior win rate**: top 3 por `wins/games_played` (mínimo 3 partidas).
d. **Outras estatísticas** (4 mini-cards):
   - Maior sequência de vitórias: itera matches por jogador em ordem cronológica, calcula maior streak de `position=1`.
   - Maior sequência de derrotas: idem, streak sem `position=1` (com pelo menos 1 partida).
   - Partida mais longa: `max(duration_minutes)` + nomes dos 2 primeiros colocados.
   - Maior pontuação: `max(score)` em `match_results` + nick do jogador.

### "Últimas partidas" (abaixo do Ranking)

Card resumo das 5 mais recentes: data/hora · jogador A vs jogador B (1º colocado vs 2º) · resultado verde/vermelho · variação de MMR. Link "Ver todas" abre tab Partidas.

---

## Estrutura técnica

```text
src/
  pages/
    Seasons.tsx                  (refatorado)
    SeasonDetail.tsx             (refatorado, dividido em subcomponentes)
  components/seasons/
    SeasonsTimeline.tsx          (novo)
    SeasonCardLarge.tsx          (novo, ativas)
    SeasonRowFinished.tsx        (novo, collapsible)
    SeasonHeader.tsx             (novo)
    SeasonSidebar.tsx            (novo)
    SeasonKpis.tsx               (novo)
    SeasonStatsPanel.tsx         (novo)
    SeasonRecentMatches.tsx      (novo)
  hooks/
    useSeasonsData.ts            (estende: cover_url, participants_count, champion_name)
    useUserSeasonParticipation.ts (novo)
    useSeasonStats.ts            (novo, computa KPIs e stats agregados)
```

Tokens: usar `text-gold`, `bg-card`, `border-border`, `text-muted-foreground`. Cores extras (purple/green/blue/red) vêm do tailwind padrão mas com opacidade `/20` `/30` no estilo do projeto.

---

## Fora do escopo

- Implementar de fato o "Convidar jogadores" (fica como toast "Em breve").
- Edição inline de regulamento (link estático).
- Drag/zoom real na timeline (usaremos botões Semana/Mês/Trimestre + ‹/›).
