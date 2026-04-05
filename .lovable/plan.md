

# Plano: Ajustes de UI, Games, Seasons, Achievements e Jogadores Fantasmas

## 1 — Registro: Tela de Sucesso
**Register.tsx**: Após signup bem-sucedido, em vez de `navigate('/login')`, setar estado `submitted = true` e renderizar uma tela de felicitação com mensagem de "Cadastro concluído!" e botão "Ir para a Home" (`navigate('/')`).

## 2 — Seasons: Seletor de Jogo + Botão de Editar
**Seasons.tsx**:
- No dialog de criar/editar, quando `formType === 'boardgame'`, exibir dropdown de jogos (fetch `games` table) para vincular o jogo à season. Ao salvar, inserir/atualizar em `season_games`.
- Mover o botão "Editar" (ícone lápis) do canto superior direito para o **canto inferior direito** do card, fora da área de sobreposição.

## 3 — GameDetail: Filtro Dinâmico + Remover Sequência Atual
**GameDetail.tsx**:
- **Estatísticas Detalhadas**: O filtro de "Nº de jogadores" já usa `playerCounts` (calculado dinamicamente). Verificar que o `playerCounts` useMemo está gerando corretamente a partir dos dados reais (já funciona — usa `allResults`). Nenhuma alteração necessária se já dinâmico.
- **Estatísticas Pessoais**: Remover o card "Sequência Atual" do array de cards (manter apenas Partidas, % Vitória, Pontuação Média, Maior Sequência → 4 cards em `lg:grid-cols-4`).

## 4 — Games: Editar/Excluir + JSON + Schema + Tags
**Games.tsx**:
- Adicionar botões **Editar** e **Excluir** em cada card de jogo (visível para admins).
- O modal de edição incluirá:
  - Campos básicos (nome, imagem, regras, vídeo, min/max jogadores, slug)
  - **Factions JSON** (textarea com parse/stringify)
  - **Schema de Pontuação** (editor inline de categorias/subcategorias, carrega de `game_scoring_schemas`)
  - **Tags** (checkboxes das tags existentes + possibilidade de criar nova tag inline)

## 5 — Achievements: Dropdown de Triggers Pré-definidos
**AdminAchievements.tsx**:
- Substituir o campo de texto livre `triggerConfig` por um **dropdown** com os tipos de trigger pré-definidos:
  - `first_win` — Primeira Vitória
  - `total_games` — Total de Partidas (input numérico)
  - `win_streak` — Sequência de Vitórias (input numérico)
  - `games_in_day` — Partidas no Dia (input numérico)
- Exibir o JSON resultante de forma legível no card do achievement existente.
- Admin pode selecionar "Personalizado" para digitar JSON manualmente.

## 6 — Jogadores Fantasmas (Combinar Opções 1 + 3)

### 6.1 Migration
- Nova tabela `ghost_players`:
  - `id UUID PK`, `display_name TEXT NOT NULL`, `claim_code TEXT UNIQUE` (gerado automaticamente), `linked_profile_id UUID NULL REFERENCES profiles(id)`, `created_at TIMESTAMPTZ`
- RLS: todos leem, admin gerencia (insert/update/delete)

### 6.2 Lógica de Registro de Partida
- No `NewMatchFlow`, além de selecionar jogadores existentes, permitir digitar um nome de "jogador não registrado" → cria entrada em `ghost_players` e usa o `ghost_player_id` no resultado.
- Adicionar coluna `ghost_player_id UUID NULL` em `match_results` (referência a `ghost_players`).

### 6.3 Sugestão Automática (no login/cadastro)
- Após novo usuário completar perfil, query em `ghost_players` buscando `display_name` similar (ILIKE com variações do nome/nickname).
- Se encontrar matches, exibir banner no perfil: "Encontramos X partidas que parecem ser suas. Deseja reivindicar?"
- Ao clicar "Sim", cria um pedido pendente (ou admin aprova diretamente via painel).

### 6.4 Vínculo Manual (Admin)
- Na página de perfil do jogador (ferramentas de moderador), botão "Vincular Jogador Fantasma".
- Modal lista `ghost_players` não vinculados, admin seleciona e confirma.
- Sistema atualiza `ghost_players.linked_profile_id` e faz `UPDATE match_results SET player_id = ? WHERE ghost_player_id = ?`.

## 7 — PWA (Resposta Informativa)
O sistema PWA **não está ativo** no projeto. O projeto usa Vite padrão sem `vite-plugin-pwa`. Para notificações push em celulares seria necessário:
- Configurar PWA com service worker
- Usar Web Push API + backend para enviar notificações
- Isso é um esforço separado significativo. Será abordado como fase futura se desejado.

---

## Arquivos Modificados
- `src/pages/Register.tsx` — Tela de sucesso pós-cadastro
- `src/pages/Seasons.tsx` — Dropdown de jogo + reposicionar botão editar
- `src/pages/GameDetail.tsx` — Remover "Sequência Atual"
- `src/pages/Games.tsx` — Editar/excluir jogos com JSON, schema e tags
- `src/components/admin/AdminAchievements.tsx` — Dropdown de triggers
- `src/components/matches/NewMatchFlow.tsx` — Suporte a ghost players
- `src/pages/PlayerProfile.tsx` — Banner de reivindicação de fantasma
- Migration: `ghost_players` table + `match_results.ghost_player_id` column

## Ordem de Execução
1. Migration (ghost_players + match_results column)
2. Register.tsx (tela de sucesso)
3. Seasons.tsx (jogo + botão editar)
4. GameDetail.tsx (remover sequência atual)
5. Games.tsx (editar/excluir completo)
6. AdminAchievements.tsx (dropdown triggers)
7. Ghost players UI (NewMatchFlow + PlayerProfile)

