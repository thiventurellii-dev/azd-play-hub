## Redesign de /games — Boardgames

Foco: substituir o `BoardgameCard` atual (avatar pequeno + lista) por um card cinematográfico com capa em destaque e meta hierárquica, e adicionar um painel resumo no topo da página.

Escopo: **apenas a aba Boardgames**. Blood e RPG ficam intocados nesta rodada (podem ganhar o mesmo tratamento depois).

---

### 1. Estatísticas extras no hook

Em `useGamesData.ts` adicionar:
- `matchCounts: Record<gameId, number>` — total de partidas por jogo
- `totalPlaytime: number` (em min) — soma global
- `activeSeasonGameIds: Set<string>` — jogos com season `active`
- (torneios não existem como entidade — vou usar season `active` como contexto. "Torneio" fica preparado mas oculto até existir o conceito.)

### 2. Novo `BoardgameCard.tsx` (reescrita)

Estrutura:

```text
┌─────────────────────────────────┐
│  ★            ⋯  ← header float │
│                                 │
│      [COVER: ~55% altura]       │
│       gradiente top→bottom      │
│  ─── fade para card ───         │
│                                 │
│  Catan                  [pill]  │ ← título grande + categoria
│  4–6 jogadores · ~75 min        │ ← meta com ícones
│                                 │
│  [worker placement] [economia]  │ ← chips de mecânicas
│                                 │
│  Curta descrição truncada em    │ ← 1–2 linhas
│  duas linhas...                 │
│                                 │
│  ─────────────────────────────  │
│  👥 4–6   🎲 27   ⏱ 75min       │ ← stats inline
│                                 │
│  [SEASON ATIVA]                 │ ← só se relevante
│                                 │
│  Regras  ·  Vídeo               │ ← ghost links
└─────────────────────────────────┘
```

Detalhes técnicos:
- Container: `rounded-2xl overflow-hidden bg-card` + `shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]`, hover `-translate-y-0.5` + `shadow-[0_8px_30px_-8px_rgba(255,184,0,0.15)]`
- Capa: `aspect-[16/10]` com `<img>` absoluto + 2 overlays (`bg-gradient-to-b from-black/30 via-transparent to-card`) e vinheta sutil via `shadow-inner`
- Sem capa: bloco `bg-gradient-to-br from-secondary to-card` com inicial em fonte grande, mesma altura
- Título sobreposto na base da capa para hierarquia mais forte
- Mecânicas/tags vêm de `tags[]` (já existe) — primeira tag vira "categoria" (pill grande), restantes viram chips
- Descrição: nova fonte de dado? **Não temos campo `description` em `games`** — vou usar truncamento dos chips ou ocultar a seção se não houver. Recomendo adicionar `description` à tabela `games` numa migração futura (não nesta).
- Stats bottom: jogadores, partidas (`matchCounts[id]`), duração média
- Badge contextual: só renderiza se `activeSeasonGameIds.has(id)` → pill `bg-indigo-500/10 text-indigo-300 border-indigo-500/20` "SEASON ATIVA"
- Ações: ⋯ (menu via `DropdownMenu` com Editar/Ver detalhe) e ★ (FavoriteButton já existente) com `opacity-60 hover:opacity-100`
- Botões Regras/Vídeo: `Button variant="ghost" size="sm"` inline na base
- Card inteiro clicável (Link para `/jogos/:slug`); ações internas usam `e.stopPropagation()`

### 3. Painel resumo no topo de `/games`

Componente novo `GamesSummaryPanel.tsx` — barra horizontal compacta no canto direito do header da aba:

```text
🎲 12 jogos   ⚡ 3 ativos   📊 247 partidas   ⏱ 312h jogadas
```

Visual: `rounded-xl bg-card/60 border border-border/40 px-4 py-2 flex gap-6` — números em `text-foreground font-semibold`, labels em `text-muted-foreground text-xs`.

Posicionamento: dentro de `TabsContent value="boardgame"`, ao lado dos filtros (filtro à esquerda, painel à direita via `justify-between`).

### 4. Grid

Manter `grid gap-6 md:grid-cols-2 xl:grid-cols-3` (já está bom). Apenas ajustar gap para `gap-5` para ritmo visual mais apertado.

### 5. Sem mudanças

- Aba Blood — intocada
- Aba RPG — intocada
- Dialogs de adicionar — intactos
- Permissões/Edit button — mantido (movido para dentro do menu ⋯)

---

### Arquivos

**Editados:**
- `src/components/games/BoardgameCard.tsx` — reescrita
- `src/hooks/useGamesData.ts` — adicionar matchCounts, totalPlaytime, activeSeasonGameIds
- `src/pages/Games.tsx` — passar novos dados, integrar painel

**Criados:**
- `src/components/games/GamesSummaryPanel.tsx`

### Pontos a confirmar
1. **Descrição curta**: o campo não existe na tabela `games`. Posso (a) ocultar a seção quando vazia e adicionar coluna `description` numa migração futura, ou (b) já adicionar a coluna agora. Vou de (a) — mais seguro, sem mexer no banco externo nesta rodada.
2. **"Torneio Ativo"**: não existe entidade Tournament. Vou só implementar "SEASON ATIVA" agora; o slot fica pronto para Tournament quando existir.