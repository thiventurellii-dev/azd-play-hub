## Reformular Página de Perfil do Jogador

Reorganizar `src/pages/PlayerProfile.tsx` em uma estrutura visual moderna inspirada no mock-up, adaptada ao contexto AzD. O carrossel atual de categorias (boardgame/BotC) e tabelas legadas serão removidos. Conteúdo do BotC e performance por jogo serão preservados em uma seção secundária mais abaixo (não aparece no mock, mas é dado importante já existente).

### Estrutura nova (de cima para baixo)

```
┌────────────────────────────────────────────────────────────────┐
│ HERO HEADER                                                    │
│ Avatar | Nome + @nick + steam/badges | KPIs (4): Partidas,    │
│ Conquistas, Comunidades, Amigos                                │
│ Bio (se houver) · Membro desde · Localização · XP             │
│ [Editar Perfil] [Resetar Senha]  ou  [FriendButton]           │
└────────────────────────────────────────────────────────────────┘

┌─ Conquistas ─────────────────────── Ver todas ────────────────┐
│ Cards horizontais (texto apenas, sem ícones específicos)      │
│ Nome · Descrição · Data de conquista                          │
└────────────────────────────────────────────────────────────────┘

┌─ Jogos em destaque ───────────────────────────────────────────┐
│ Cards (cover + nome + partidas + winrate + progress bar)      │
│ Top N jogos ordenados por # partidas                          │
└────────────────────────────────────────────────────────────────┘

┌─ Season atual (col 1) ─────┬─ Atividade recente (col 2) ─────┐
│ Nome + status (Ativa/...)  │ Lista única (sem tabs):          │
│ Termina em X dias          │ - Conquistas obtidas             │
│ #posição de N · MMR atual  │ - Comunidades entradas           │
│ Barra com tier (sem prata) │ - Partidas (NÃO incluir aqui)    │
│ → faixa min/atual/max      │ Item: ícone + texto + data       │
│ [Ver ranking completo]     │                                  │
└────────────────────────────┴──────────────────────────────────┘

┌─ Próximas Partidas ───────────────────────────────────────────┐
│ Lista das match_rooms agendadas (já existe upcomingRooms)     │
│ Card: data (DateBlock) · jogo · título · status · vagas       │
└────────────────────────────────────────────────────────────────┘

┌─ Partidas recentes ───────────────── Ver todas ──────────────┐
│ Cards horizontais coloridos por resultado:                    │
│  - Competitiva ganhou MMR  → borda/bg verde                   │
│  - Competitiva perdeu MMR → borda/bg vermelho                 │
│  - Casual venceu          → borda/bg amarelo (gold)           │
│  - Casual não venceu      → borda/bg cinza                    │
│ Conteúdo: jogo · data · "vs jogadores" · score · ΔMMR         │
└────────────────────────────────────────────────────────────────┘

┌─ Comunidades ─────────────┬─ Amigos ──────────────────────────┐
│ Cards das comunidades     │ <FriendsList userId={profile.id}/>│
│ que o jogador participa   │ (componente existente)            │
└───────────────────────────┴───────────────────────────────────┘

┌─ Estatísticas detalhadas (colapsável / accordion) ───────────┐
│ Mantém: Performance por jogo, Principais oponentes (chart),  │
│ BotC stats + parceiros + personagens (se houver dados)        │
└───────────────────────────────────────────────────────────────┘

┌─ Forms de edição (Editar Perfil, Senha) ─ inalterados ──────┐
└──────────────────────────────────────────────────────────────┘
```

### Detalhes por seção

**1. Header**

- Remover indicador de Status (Online).
- KPIs: Partidas (`stats.totalGames`), Conquistas (`achievements.length`), Comunidades (count nova), Amigos (count nova).
- Adicionar duas queries leves: `community_members` (count) e `friendships` (count `accepted` envolvendo o `profile.id`).
- Mostrar localização (cidade/estado) e data de criação como linhas auxiliares.

**2. Conquistas**

- Sem ícones. Cards com `name`, `description`, e data via nova consulta a `player_achievements.created_at` (campo precisa ser selecionado junto). Top 5 + link "Ver todas" (modal/dialog simples listando todas).

**3. Jogos em destaque**

- Reaproveita `gamePerformance` já calculado.
- Mostrar até 4 jogos com mais partidas. Card inclui cover (`games.cover_url` se existir — adicionar ao select), partidas, winrate e barra de progresso de winrate.

**4. Season atual**

- Buscar season ativa (`seasons` onde `is_active`/`status = 'active'`) e a participação do jogador (`mmr_ratings` filtrado por season+player).
- Calcular posição (`rank`) entre todos jogadores da season por MMR.
- "Termina em X dias" via `end_date`.
- Em vez de medalhas (Bronze/Prata/Ouro), mostrar barra simples: min MMR · MMR atual · max MMR da season + posição #X de N.
- Botão "Ver ranking completo" → `/seasons/:slug`.

**5. Atividade recente**

- Sem TabTriggers. Lista única, máximo 8 itens, ordenada por data desc.
- Fontes:
  - `player_achievements` (com `achievement_definitions` join) → "Conquistou *Nome*"
  - `community_members` (created_at) → "Entrou em *Comunidade*"
- NÃO incluir partidas (separadas em sua própria seção).

**6. Próximas Partidas (NOVA)**

- Reusa `upcomingRooms` já buscado. Renderizar como lista com `DateBlock` + nome do jogo + título + vagas.
- Se vazio: estado neutro "Nenhuma partida agendada".

**7. Partidas recentes (NOVA, com cores)**

- Buscar últimas 8 partidas do jogador a partir de `match_results` + `matches` (já temos resultados, faltam `mmr_change` e `season_id`).
- Adicionar `mmr_change` ao select de `match_results` e `season_id` ao select de `matches`.
- Lógica de cor por card:
  - `season_id != null` (competitiva):
    - `mmr_change > 0` → verde (border-green-500/50, bg verde tênue)
    - `mmr_change <= 0` → vermelho
  - `season_id == null` (casual):
    - `position === 1` → amarelo (gold)
    - else → cinza
- Card mostra: jogo, data (DateBlock), oponentes (avatares pequenos), score do jogador, "+X.XX MMR" / "−X.XX MMR" (apenas competitiva), badge Vitória/Derrota/Empate.

**8. Comunidades**

- Nova query: `community_members` ativos do jogador + join `communities` (id, name, slug, avatar_url).
- Renderizar até 6 mini-cards clicáveis para `/comunidades/:slug`.

**9. Amigos**

- Reusar `<FriendsList userId={profile.id} />` já existente, somente leitura quando não é o próprio perfil.

**10. Estatísticas detalhadas (accordion colapsado por padrão)**

- Mantém Performance por jogo, Principais oponentes (gráfico) e bloco BotC inteiro. Evita perder funcionalidade existente sem poluir o topo.

### Notas técnicas

- Arquivo único alterado: `src/pages/PlayerProfile.tsx` (refactor extenso). Forms de Edit/Password permanecem como estão, apenas reposicionados.
- Componente reutilizável: `src/components/shared/DateBlock.tsx` (já existe).
- Novo componente local `RecentMatchCard` dentro do arquivo (ou criar `src/components/profile/RecentMatchCard.tsx` se ficar muito grande) com a lógica de coloração.
- Usar `Accordion` (`@/components/ui/accordion`) para a seção de estatísticas detalhadas.
- Manter remoção do indicador "Online" (não há campo de presença).
- Remover o carrossel de categorias (`availableCategories`, `categoryIdx`, navegação left/right) e a tabela "Performance por Jogo" / chart de oponentes da posição central — movidos para o accordion final.
- Não tocar em `Profile.tsx` (página privada de edição) nesta iteração — escopo é a página pública/perfil do jogador. Confirmar com o usuário se também deve atualizar.

### Arquivos

- **Editar:** `src/pages/PlayerProfile.tsx`
- **Possivelmente criar:** `src/components/profile/RecentMatchCard.tsx` (se a função render ficar grande)
- **Reusa:** `src/components/shared/DateBlock.tsx`, `src/components/friendlist/FriendsList.tsx`, `src/components/ui/accordion.tsx`

### Pontos a confirmar

1. Manter no accordion as seções legadas (BotC, Performance por jogo, Principais oponentes) ou remover de vez?
2. "Conquistas" — mostrar apenas as últimas 5 com botão "Ver todas" abrindo dialog, ou já listar todas como grid expandível?
3. A página `Profile.tsx` (rota `/perfil` de edição) deve receber o mesmo tratamento ou só `PlayerProfile.tsx` (`/perfil/:nickname`)?