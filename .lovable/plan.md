

# Diagnóstico: Jogadores não aparecem nas Rooms para novos usuários

## Análise do problema

O fluxo de `fetchPlayers` no `MatchRoomCard.tsx` (linhas 61-119) faz duas consultas ao Supabase **externo**:

1. `match_room_players` → busca jogadores da sala
2. `profiles` → busca nome/nickname por `player_id`

Ambas usam o client externo (`supabase` de `@/lib/supabaseExternal`). O `AuthContext` também autentica no Supabase externo, então novos usuários **devem** ter sessão válida.

## Causa provável

O problema provavelmente está nas **RLS policies do Supabase externo**, que são independentes das que vemos aqui (essas são do Lovable Cloud/interno). As políticas do banco externo podem:

- Exigir condições diferentes para SELECT em `match_room_players` ou `profiles`
- Não ter realtime habilitado para `match_room_players`
- Ter políticas de `profiles` que bloqueiam visualização entre usuários

Outra possibilidade: o `fetchPlayers` falha silenciosamente — o `console.error` só é chamado se `error` existir, mas um resultado vazio (sem erro) simplesmente seta `players` como `[]`.

## Plano de ação

### 1. Adicionar logs de diagnóstico no `fetchPlayers`

Em `MatchRoomCard.tsx`, adicionar `console.log` temporários para capturar:
- Resultado bruto de `match_room_players` (data + error)
- Resultado bruto de `profiles` (data + error)
- IDs buscados vs IDs encontrados

Isso vai revelar se o problema é na primeira query (não retorna players) ou na segunda (não retorna profiles).

### 2. Tratar erro silencioso na query de profiles

Atualmente, se a query de `profiles` falha, o código continua sem erro visível. Adicionar tratamento de erro explícito.

### 3. Adicionar fallback de exibição

Quando um `player_id` não tem profile associado, mostrar "Jogador desconhecido" em vez de nada, para que pelo menos o jogador apareça na lista.

## Arquivos a modificar

- `src/components/matchrooms/MatchRoomCard.tsx` — adicionar logs de diagnóstico e fallback de exibição

## Próximo passo

Após implementar os logs, peço que você abra a página de Partidas como um novo usuário e me envie os logs do console. Com essa informação, saberemos exatamente qual query está falhando e poderemos aplicar a correção definitiva (que pode envolver ajustar RLS no Supabase externo via dashboard).

