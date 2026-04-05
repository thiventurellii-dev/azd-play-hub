

# Plano: Ecossistema Competitivo AzD — Registro, Estatísticas e Rankings

## Visão Geral

Transformar o sistema atual (registro simples de partidas no admin + pop-up de jogos + perfil básico) em um ecossistema completo inspirado no BG Stats, com pontuação dinâmica por jogo, páginas ricas de jogos e dashboard do jogador.

---

## PRIORIDADE 1 — Sistema Dinâmico de Registro de Partidas

### 1.1 Banco de Dados

**Nova tabela `game_scoring_schemas`** — Define as categorias de pontuação por jogo via JSON:
- `id`, `game_id` (ref games), `schema` (jsonb), `created_at`
- Exemplo de schema para Brass Birmingham:
```json
{
  "categories": [
    {"key": "canais", "label": "Canais", "type": "number"},
    {"key": "industrias", "label": "Indústrias", "type": "number"},
    {"key": "links", "label": "Links de Rede", "type": "number"},
    {"key": "dinheiro", "label": "Dinheiro", "type": "number"}
  ]
}
```

**Nova tabela `match_result_scores`** — Pontuação detalhada por categoria:
- `id`, `match_result_id` (ref match_results), `category_key` (text), `value` (numeric)
- Permite armazenar a pontuação granular (ex: Canais=15, Links=20)

**Novas colunas em `match_results`**:
- `seat_position` (int, posição na mesa)
- `faction` (text, facção/papel)
- `is_new_player` (boolean)

**Nova coluna em `games`**:
- `slug` (text unique) — Para URLs amigáveis como `/jogos/brass-birmingham`

### 1.2 Frontend — Novo Fluxo de Registro

**Refatorar `AdminMatches.tsx`** em um fluxo multi-step inteligente:

1. **Step 1 — Cabeçalho**: Season, Jogo (com busca), Data, Hora, Duração, Foto, vínculo com Ladder/Torneio
2. **Step 2 — Seleção de Jogadores**: Busca dinâmica na base, para cada um: posição na mesa, facção/papel, checkbox "Jogador Inicial", checkbox "Novo Jogador"
3. **Step 3 — Planilha de Pontuação Dinâmica**: 
   - Carrega o `game_scoring_schema` do jogo selecionado
   - Se não existir schema, mostra campo "Pontuação Total" simples (compatibilidade retroativa)
   - Se existir schema: tabela com linhas = categorias, colunas = jogadores
   - Total calculado em tempo real (soma das categorias)
   - Vencedor destacado automaticamente (borda dourada + ícone troféu)
   - Posições definidas automaticamente pelo total (maior = 1º)
4. **Step 4 — Confirmação**: Resumo visual antes de salvar

### 1.3 Integração com Agendamento

- No `MatchRoomCard`, quando a sala tem status "finished", mostrar botão "Registrar Resultado" que abre o fluxo de Nova Partida pré-preenchido com jogo e jogadores da sala
- Na criação de sala, o agendamento preenche apenas jogo e data futura

### 1.4 Admin

- Tela de gerenciamento de `game_scoring_schemas` no painel admin (CRUD do JSON de categorias por jogo)

---

## PRIORIDADE 2 — Páginas Individuais de Jogos

### 2.1 Nova rota `/jogos/:slug`

**Componente `GameDetail.tsx`** com seções:

1. **Hero Header**: Banner com imagem do jogo, nome, faixa de jogadores, tempo médio, botões "Ler Regras", "Ver Vídeo", "Registrar Partida" (admin), "Agendar Partida"

2. **Cards de Recordes** (4 cards em grid):
   - Maior pontuação histórica (nome do jogador + valor)
   - Pontuação média da comunidade
   - Total de partidas jogadas
   - Pior pontuação ganhadora (menor score com position=1)

3. **Gráfico de Atividade** (Recharts BarChart):
   - Volume de partidas nos últimos 6 meses (agrupado por mês)

4. **Leaderboard da Comunidade** (tabela):
   - Jogador, Vitórias, % Vitórias, Média de Pontos, Melhor Pontuação (Personal Best)
   - Calculado a partir de `match_results` filtrado pelo `game_id`

5. **Histórico de Partidas**:
   - Lista cronológica com filtro de período
   - Cada item mostra data, jogadores, pontuações, vencedor

### 2.2 Ajustes na página `/games`

- Cards de jogos agora linkam para `/jogos/:slug` ao invés de abrir dialog
- Manter dialog como fallback para jogos sem slug

---

## PRIORIDADE 3 — Dashboard do Jogador

### 3.1 Nova rota `/perfil/:nickname`

**Componente `PlayerProfile.tsx`** (página pública, diferente do `/profile` de edição):

1. **Header**: Avatar, nome, nickname, membro desde, badges (admin/player)

2. **Stats de Elite** (3-4 cards):
   - Total de Partidas (count de match_results)
   - Jogos Diferentes (distinct game_id via matches)
   - Win Rate Total (position=1 / total * 100)
   - Sequência de Vitórias atual (streak)

3. **Insights Visuais**:
   - Gráfico de barras horizontais "Principais Adversários" (jogadores com mais partidas em comum, com W/L ratio)

4. **Tabela de Performance por Jogo**:
   - Jogo | Partidas | Vitórias | % Vitória | Média Pontos | Recorde Pessoal
   - Dados calculados via query em match_results + matches

5. **Social**: Lista de amigos (reutilizar `FriendsList`)

6. **Próximas Partidas**: Cards de salas agendadas onde o jogador está confirmado (query match_room_players + match_rooms com status=open e scheduled_at > now)

### 3.2 Ajustes

- Na página `/players`, cada card linka para `/perfil/:nickname`
- No ranking, nome do jogador linka para o perfil
- `/profile` (privado) continua como página de edição, mas ganha link "Ver meu perfil público"

---

## Detalhes Técnicos

### Migration SQL (única)
```
-- game_scoring_schemas
-- match_result_scores  
-- ALTER games ADD slug
-- ALTER match_results ADD seat_position, faction, is_new_player
-- RLS: schemas viewable by all, managed by admins
-- RLS: match_result_scores viewable by all, managed by admins
```

### Arquivos Novos
- `src/pages/GameDetail.tsx` — Página individual do jogo
- `src/pages/PlayerProfile.tsx` — Dashboard público do jogador
- `src/components/matches/NewMatchFlow.tsx` — Fluxo multi-step de registro
- `src/components/matches/ScoringSheet.tsx` — Planilha dinâmica de pontuação
- `src/components/admin/AdminScoringSchemas.tsx` — CRUD de schemas

### Arquivos Modificados
- `src/App.tsx` — Novas rotas `/jogos/:slug` e `/perfil/:nickname`
- `src/pages/Games.tsx` — Links para página individual
- `src/pages/Players.tsx` — Links para perfil público
- `src/pages/Rankings.tsx` — Links nos nomes dos jogadores
- `src/pages/Profile.tsx` — Link para perfil público + seção "Próximas Partidas"
- `src/components/admin/AdminMatches.tsx` — Integrar novo fluxo de registro
- `src/components/matchrooms/MatchRoomCard.tsx` — Botão "Registrar Resultado"

### Ordem de Implementação
1. Migration (tabelas + colunas)
2. Fluxo de registro de partidas (Prioridade 1)
3. Admin de scoring schemas
4. Página individual de jogos (Prioridade 2)
5. Dashboard do jogador (Prioridade 3)
6. Links e integrações entre todas as páginas

