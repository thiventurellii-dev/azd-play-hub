# Slug da Aventura RPG — `/aventuras/:slug`

Concordo com a sugestão: **Interesse** vai para o header (CTA principal), pois é a ação mais comum e gera engajamento. Mestre fica com botões secundários.

## 1. Migração — campos novos + tabela de interesses

**`rpg_adventures`** (adicionar colunas opcionais que o mockup pede):
- `tagline` text — frase curta sob o título
- `level_min` int, `level_max` int
- `players_min` int, `players_max` int
- `duration_hours_min` int, `duration_hours_max` int
- `tone` text — ex: "Sombrio · Gótico"
- `genres` text[] — ex: ["Horror", "Mistério"]
- `intensity` jsonb — `{combate, misterio, exploracao, roleplay, perigo}` em escala 0–4
- `about_long` text — descrição longa
- `highlights` jsonb — array `[{title, description}]`
- `master_notes` jsonb — `{prep, hooks, variations, secrets}`
- `materials` jsonb — `[{label, value}]` (PDF, mapas, etc)
- `materials_url` text — link "Baixar materiais"

**Nova tabela `rpg_adventure_interests`**:
- `id uuid pk`, `adventure_id uuid fk`, `user_id uuid fk`, `created_at timestamptz`
- `unique(adventure_id, user_id)`
- RLS: SELECT público (autenticados), INSERT/DELETE só do próprio usuário

Campanhas e "aventureiros que jogaram" ficam como **placeholders visuais** nesta entrega — virão na Fase 3/4 do plano original.

## 2. Rota e página

- Adicionar rota `/aventuras/:slug` em `App.tsx` (protegida) → `pages/RpgAdventureDetail.tsx`
- Em `Games.tsx` (tab RPG) e em `RpgAdventureCard` existente: card vira `Link` para `/aventuras/${slug}`
- Helper `slugify` para gerar slugs ao criar/editar aventura no `RpgAdventureForm`

## 3. Layout da página (baseado no mockup, com Interesse no header)

```text
[← Voltar para aventuras]

┌─────────────────────────────────────────────────────────┐
│ HEADER — grid: capa(140px) | conteúdo | INTERESSE box   │
│ ┌─────┐  Nome ★                          ┌─────────────┐│
│ │capa │  tagline                          │ INTERESSE   ││
│ │     │  [sistema][oficial][gêneros]      │ ❤ 3 querem  ││
│ │     │                                   │ [JM DI MA]  ││
│ │     │  [♥ Tenho interesse] (gold, big)  │ [Confirmar] ││
│ │     │  [Criar campanha] [Marcar sessão] └─────────────┘│
│ │     │  ↑ visíveis só para mestres                      │
│ └─────┘                                                  │
└─────────────────────────────────────────────────────────┘

[5 barras: Combate · Mistério · Exploração · Roleplay · Perigo]
[Nível | Jogadores | Duração | Tom]

┌─────────────────── 1fr ───────────────────┐ ┌─ 220px ─┐
│ Sobre a aventura                          │ │ Stats   │
│ O que torna especial (grid 2x2)           │ │ Top GMs │
│ Notas para o Mestre (accordion)           │ │ Compat. │
│ Campanhas (placeholder “em breve”)        │ │ Inclui  │
│ Aventureiros que jogaram (placeholder)    │ │         │
└───────────────────────────────────────────┘ └─────────┘
```

**Decisão de UX sobre o "Interesse"**:
- Versão **desktop**: card de interesse fica fixado no canto superior direito do header (mais proeminente que apenas um botão), mostrando contador + avatares + botão grande "Tenho interesse / Remover interesse"
- Versão **mobile**: o card colapsa e o botão `Tenho interesse` aparece em destaque dentro do header
- Botões de mestre (`Criar campanha`, `Marcar sessão`) ficam abaixo, com aviso "visível apenas para mestres" — só renderizados se o usuário tem tag `mestre`

## 4. Componentes novos

- `pages/RpgAdventureDetail.tsx` — página principal
- `components/rpg/AdventureInterestCard.tsx` — card destacado do header com toggle de interesse + contador + avatares (realtime opcional via refetch)
- `components/rpg/AdventureIntensityBars.tsx` — 5 barras de intensidade
- `components/rpg/AdventureMasterNotes.tsx` — accordion (Dicas, Ganchos, Variações, Segredos com aviso de spoiler)
- `components/rpg/AdventureSidebar.tsx` — stats placeholder + compatibilidade + materiais
- `hooks/useRpgAdventureDetail.ts` — fetch da aventura por slug + sistema + contagem/lista de interessados + check `hasMestre`

## 5. Botões de mestre (placeholders funcionais)

- `Criar campanha` → toast "Em breve — Fase 3 do roadmap" (ou abre Dialog vazio com aviso)
- `Marcar sessão` → reaproveita `CreateRoomDialog` pré-preenchendo o jogo RPG e a aventura quando possível; se não der, mostra toast "Em breve"

Decido por toast "Em breve" para ambos nesta entrega, evitando código half-baked. A integração real vem na Fase 3.

## 6. Visual / detalhes estéticos

- Paleta atual do projeto (gold + dark) preservada — substituir os roxos do mockup por **gold** (`#FFB800`) como accent principal e usar `secondary` no lugar do roxo `#c4a8ff` para manter consistência com o resto do AzD
- Capa com gradiente dourado sutil quando não houver imagem
- Hover sutil nos cards (lift + border gold/30)
- Skeleton loading state durante fetch
- Mobile-first: header colapsa em coluna única, sidebar vira seção abaixo

## Fora de escopo desta entrega

- Sistema completo de campanhas (fica para Fase 3)
- Lista real de "aventureiros que jogaram" (depende de matches RPG concluídos — Fase 4)
- Convite/aprovação de jogadores em campanha (Fase 3)

Confirma este escopo? Após o ok, executo a migração e implemento tudo.
