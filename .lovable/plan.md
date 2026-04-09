

# Plano Final: Room ↔ Match Link + Match Result Modal

## 1. Database Migration

```sql
ALTER TABLE public.match_rooms
  ADD COLUMN result_id uuid DEFAULT NULL,
  ADD COLUMN result_type text DEFAULT NULL;
```

Valores de `result_type`: `'boardgame'`, `'blood'`, `'rpg'`.

---

## 2. Fluxo Automático de Vinculação

### 2a. `NewMatchFlow.tsx` e `NewMatchBotcFlow.tsx`

Alterar `onComplete?: () => void` para `onComplete?: (matchId?: string) => void`.

- **NewMatchFlow**: após inserir o match, chamar `onComplete?.(match.id)`
- **NewMatchBotcFlow**: capturar retorno e chamar `onComplete?.(createdMatch.id)`

### 2b. `MatchRoomCard.tsx`

Quando o resultado é registrado a partir do card, o `onComplete` faz:

```ts
onComplete={async (matchId) => {
  if (matchId) {
    const resultType = room.blood_script_id ? 'blood' : 'boardgame';
    await supabase.from('match_rooms').update({ result_id: matchId, result_type: resultType }).eq('id', room.id);
  }
  onUpdate();
}}
```

### 2c. `MatchRooms.tsx`

Passar `roomId` no prefill state. O `onComplete` no sheet recebe o `matchId` e atualiza a room.

---

## 3. MatchRoomCard — UI com `result_id`

- Adicionar `result_id` e `result_type` à interface `MatchRoom` e ao select.
- Substituir lógica de `hasResult` (query por data) por: `!!room.result_id`.
- Remover o `useEffect` que faz query em `matches` por data.
- **Sem resultado** + `finished`: botão "Inserir Resultado".
- **Com resultado**: botão "Ver Resultados" → abre `MatchResultModal`.

---

## 4. MatchResultModal (Novo)

`src/components/matches/MatchResultModal.tsx`

Props: `resultId`, `resultType`, `open`, `onOpenChange`.

**Header**: Nome do jogo + data + badge "Encerrada" + imagem do jogo em baixa opacidade.

**Footer**: Fechar, Compartilhar (WhatsApp), Editar (lápis).

### Permissão do botão Editar

O lápis aparece para **admins** ou **qualquer jogador que participou da partida**.

- **Boardgame**: `user.id` em `match_results.player_id`
- **BotC**: `user.id` em `blood_match_players.player_id` ou `storyteller_player_id`

```ts
const canEdit = isAdmin || matchParticipantIds.includes(user?.id);
```

### Switch por `resultType`

| `resultType` | Sub-componente | Dados |
|---|---|---|
| `boardgame` | `BoardgameResult` | `matches` + `match_results` + `profiles` + `games` |
| `blood` | `BotCResult` | `blood_matches` + `blood_match_players` + `blood_characters` + `profiles` |
| `rpg` | `RPGResult` | Placeholder |

### BoardgameResult
- Pódio visual: 1º com coroa/troféu, destaque dourado
- Tabela: Posição | Jogador | Pontos | MMR Change

### BotCResult
- Banner: "VITÓRIA DA VILA" (azul) ou "VITÓRIA DO DEMÔNIO" (vermelho)
- Dois blocos de time (Bem/Mal) com jogador + personagem
- Narrador destacado separadamente

### RPGResult
- Placeholder para sessões futuras

---

## 5. Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | `result_id` e `result_type` em `match_rooms` |
| `MatchResultModal.tsx` | **Novo** |
| `BoardgameResult.tsx` | **Novo** |
| `BotCResult.tsx` | **Novo** |
| `RPGResult.tsx` | **Novo** |
| `NewMatchFlow.tsx` | `onComplete` passa `match.id` |
| `NewMatchBotcFlow.tsx` | `onComplete` passa `bloodMatch.id` |
| `MatchRoomCard.tsx` | Usa `result_id`, botão "Ver Resultados", abre modal, `onComplete` auto-link |
| `MatchRooms.tsx` | Adiciona campos ao select/interface, passa roomId |

