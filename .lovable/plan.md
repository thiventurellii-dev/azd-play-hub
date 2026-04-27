# Redesign da página /partidas

Vamos transformar a página atual (cards em grid 2-3 colunas com tabs Abertas/Encerradas) na nova versão proposta: layout centrado em um **calendário-carousel** semanal com **linhas horizontais** de salas filtradas pelo dia selecionado. Toda a lógica existente (RLS, realtime, deep-link, criar sala, registrar resultado, comentários, MMR médio, tags, BotC) é preservada — muda apenas a apresentação e a navegação por data.

## O que muda visualmente

1. **Header** — mantém ícone + título + subtítulo, com `Registrar Resultado` (outline) e `Agendar Partida` (gold) no canto direito.
2. **FilterBar horizontal compacta** — substitui a barra atual por uma única linha:
  - Select de Jogo (com dropdown nativo estilizado).
  - Chips toggle: Casual, Competitivo, Iniciante, Experiente, Novatos.
  - Botão "Limpar filtros" só aparece quando há filtros ativos.
3. **CalendarCarousel** — novo componente: 7 dias visíveis, "hoje" destacado, dia selecionado com borda dourada e fonte maior, contagem de salas por dia, dot dourado quando o dia tem salas do jogo filtrado, setas de navegação semanal e dots de paginação (4 semanas).
4. **Lista de salas em linhas (`RoomRow`)** — substitui o card atual nesta página:
  - Thumbnail do jogo à esquerda (imagem real do `games.image_url` quando existir, fallback para letra estilizada).
  - Coluna de info: título + botão editar inline, jogo · Season, tags (Competitivo / nível / MMR médio), data/hora, barra de slots (verde / âmbar quando lotada).
  - Coluna de jogadores: chips destacados — **dourado para o usuário logado**, **verde para amigos** (via tabela `friendships` com status `accepted`), neutro para os demais. Lista "Reserva" abaixo.
  - Coluna de ações: Entrar / Sair / Na reserva / Reserva (lotada), Compartilhar (WhatsApp), Ver Resultados / Inserir Resultado, toggle de Comentários com contador.
  - Painel de comentários expansível abaixo da linha (reusa `RoomComments` existente).
  - Borda esquerda colorida pelo status (verde aberta, âmbar lotada, cinza encerrada, vermelho cancelada).
5. **Cabeçalho do dia** — "Domingo, 27 de Abril" + badge HOJE + contagem de salas.
6. **Seção "Outras salas — [Jogo Favorito]"** — abaixo da lista do dia, mostra salas futuras abertas do jogo favorito do usuário (em outros dias). Só aparece se nenhum filtro de jogo estiver ativo.
7. **Legenda** ao final: Amigos / Você / Sem destaque.
8. **Mobile** — calendário vira scroll horizontal (snap), filtros viram drawer (já existe), linhas viram cards verticais empilhados (info → jogadores → ações).

## Funcionalidades novas que precisam de backend

### A. Jogo favorito do usuário (necessário para a seção "Outras salas")

Não existe `favorite_game_id` no schema atual. Duas opções:

- **(recomendado)** adicionar coluna `favorite_game_id uuid references games(id)` em `profiles`, editável na página `/perfil`. 
- alternativa sem migração: inferir o "favorito" como o jogo mais jogado pelo usuário nos últimos 90 dias via `match_results` (sem UI extra).

### B. Destaque de amigos nos chips

Já temos `friendships(user_id, friend_id, status)`. Vou buscar a lista de `accepted` do usuário logado uma vez no `MatchRooms.tsx` e propagar para os `RoomRow` via prop, para colorir os chips em verde.  [Alteração: Só colora as bordas de verde e não nome do jogador, se isso for possível, para ficar mais clean]

### C. Filtragem por dia selecionado

Puramente client-side sobre `rooms` já carregados — sem mudança de backend. O fetch atual continua trazendo todas as salas; agrupamos por `scheduled_at` no dia selecionado.

## Funcionalidades preservadas (sem alteração lógica)

- Auto-finalizar salas vencidas.
- Realtime + polling 15s.
- Deep-link `?room=ID` continua abrindo o `MatchRoomCard` original em modal (não migra para `RoomRow` para preservar o fluxo).
- `CreateRoomDialog`, `EditRoomDialog`, `NewMatchFlow`, `NewMatchBotcFlow`, `MatchResultModal`, `RoomComments`.
- Permissões: criador/admin podem editar/cancelar/excluir; resultado só por participantes ou admin.
- Notificações de entrada/saída/lotada/cancelada.
- Cálculo de MMR médio para salas de Season.

## Arquivos a criar / modificar

**Novos componentes:**

- `src/components/matchrooms/RoomRow.tsx` — linha horizontal completa com comentários inline.
- `src/components/matchrooms/CalendarCarousel.tsx` — carousel de 7 dias com navegação semanal.
- `src/components/matchrooms/RoomFilterBar.tsx` — barra compacta (select + chips).

**Modificados:**

- `src/pages/MatchRooms.tsx` — substitui Tabs/grid pelo novo layout (calendário + lista por dia + favoritos). Mantém estados de filtros, deep-link, modais.
- `src/pages/Profile.tsx` — adiciona seletor de "Jogo favorito" (se optarmos pela opção A).
- `src/components/forms/...` — campo extra no perfil (se opção A).

**Migração SQL (se opção A):**

```sql
alter table public.profiles add column favorite_game_id uuid references public.games(id) on delete set null;
```

*(Lembrete: o banco em uso é o **externo** `npinawelxdtsrcvzzvvs` — a migração precisa ser rodada lá manualmente, não no Lovable Cloud.)*

## Pergunta antes de implementar

1. **Jogo favorito** — você prefere (A) adicionar a coluna `favorite_game_id` no perfil + UI no `/perfil`, ou (B) inferir automaticamente pelo jogo mais jogado nos últimos 90 dias (sem migração nem UI extra)? [Resposta: A opção do Usuário marcar o jogo como favorito será através das páginas de Slugs dos jogos]
2. **Tabs Abertas/Encerradas** — o redesign mostra apenas as salas do dia selecionado (passado, hoje ou futuro), eliminando as tabs. Confirmo essa remoção? [Resposta: Confirma]
3. `**MatchRoomCard` antigo** — manter apenas para o modal de deep-link (`?room=ID`) e remover do listing principal. Ok? [Resposta: Ok]

Ao aprovar, eu implemento na ordem: (1) componentes novos, (2) integração em `MatchRooms.tsx`, (3) migração + UI de jogo favorito (se opção A), (4) QA visual.