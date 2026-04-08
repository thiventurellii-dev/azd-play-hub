

# Plano: Mobile-First + PWA

## Resposta sobre tabelas novas

Novas tabelas continuarão sendo criadas via **migration SQL** pela ferramenta do Lovable (que executa no seu Supabase externo conectado). Você não precisa rodar SQL manualmente — basta descrever a funcionalidade e eu uso a ferramenta de migração, que pede sua aprovação antes de executar. O processo é o mesmo de sempre.

---

## Escopo da refatoração Mobile-First

O trabalho está dividido em **5 frentes**. Não há criação de tabelas; é 100% frontend.

### 1. Bottom Navigation Bar (mobile) + Navbar ajustada

**Problema:** O menu mobile atual é um dropdown que empurra conteúdo e não é intuitivo para toque.

**Solução:**
- Criar `src/components/BottomNav.tsx` — barra fixa inferior visível apenas em `md:hidden`, com 5 ícones: Home, Partidas, Jogos, Jogadores, Perfil/Menu.
- O último ícone abre um **Drawer** (de baixo para cima) com links secundários (Seasons, Rankings, Sugestões, Admin, Logout).
- No `Layout.tsx`: renderizar `<BottomNav />` quando logado em mobile; adicionar `pb-16` ao `<main>` em mobile para não cobrir conteúdo.
- Remover o menu mobile dropdown atual do `Navbar.tsx` (manter apenas desktop).

### 2. Container e overflow global

**Problema:** `container` do Tailwind usa `padding: 2rem` — muito largo em mobile. Possível scroll horizontal.

**Solução:**
- Em `tailwind.config.ts`, mudar o padding do container para `{ DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }`.
- No `Layout.tsx`, adicionar `overflow-x-hidden` no wrapper principal.
- No `index.css`, adicionar `html, body { overflow-x: hidden; }`.

### 3. Grids responsivos + tipografia fluida

**Problema:** Grids usam `md:grid-cols-2 xl:grid-cols-3` sem `grid-cols-1` explícito. Títulos grandes em mobile.

**Solução — arquivos afetados:**
- `Games.tsx`: grids já usam `md:grid-cols-2`, OK. Título: `text-2xl md:text-3xl`.
- `Players.tsx`: grid já tem `sm:grid-cols-2`, OK. Título: `text-2xl md:text-3xl`.
- `Seasons.tsx`: grid `md:grid-cols-2 lg:grid-cols-3`, OK. Título: `text-2xl md:text-3xl`.
- `Rankings.tsx`: Título: `text-2xl md:text-3xl`.
- `MatchRooms.tsx`: verificar grids de cards e ajustar.
- `Index.tsx`: dashboard grid já tem `sm:grid-cols-2 lg:grid-cols-3`, OK.
- `Hero.tsx`: título `text-3xl sm:text-4xl md:text-5xl lg:text-7xl`. Logo `h-20 w-20 md:h-32 md:w-32`. Padding responsivo via classes em vez de inline style.
- `Admin.tsx`: sidebar já usa Sheet em mobile, OK.
- `PlayerProfile.tsx`, `GameDetail.tsx`, `SeasonDetail.tsx`, `ScriptDetail.tsx`: ajustar títulos e layouts internos.

### 4. Touch-friendly + animações

**Problema:** `hoverSpring` usa `whileHover` que não funciona em touch. Botões pequenos.

**Solução:**
- Em `src/lib/animations.ts`:
  - Criar `touchSpring` que usa apenas `whileTap: { scale: 0.97 }` sem `whileHover`.
  - Exportar um hook `useMotionProps()` que retorna `hoverSpring` em desktop e `touchSpring` em mobile.
- Nos componentes que usam `hoverSpring` (`Index.tsx`, `BoardgameCard`, etc.): substituir por `useMotionProps()`.
- Botões e links: garantir `min-h-[44px] min-w-[44px]` nos elementos interativos (Navbar icons, friend buttons, etc.).
- `EntityEditButton`: no mobile, sempre visível (em vez de `opacity-0 group-hover:opacity-100`).

### 5. PWA — manifest simples (sem service worker)

**Problema:** Usuário quer preparar para PWA.

**Solução (installable sem SW):**
- O `public/manifest.json` já existe com configuração básica. Ajustar com ícones corretos.
- No `index.html`, adicionar meta tags mobile: `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `<meta name="theme-color" content="#0A0A0A">`, `<link rel="manifest" href="/manifest.json">`.
- **Não** instalar `vite-plugin-pwa` nem service workers (seguindo as diretrizes). Apenas manifest + meta tags para installability.

---

## Detalhes técnicos

```text
Arquivos criados:
  src/components/BottomNav.tsx

Arquivos editados:
  tailwind.config.ts         — container padding responsivo
  src/index.css              — overflow-x: hidden no body
  src/lib/animations.ts      — touchSpring + useMotionProps hook
  src/components/Layout.tsx   — BottomNav, pb-16 mobile, overflow-x-hidden
  src/components/Navbar.tsx   — remover menu mobile (substituído pelo BottomNav)
  src/components/home/Hero.tsx — tipografia e espaçamento responsivos
  src/pages/Games.tsx         — título responsivo
  src/pages/Players.tsx       — título responsivo
  src/pages/Seasons.tsx       — título responsivo
  src/pages/Rankings.tsx      — título responsivo
  src/pages/MatchRooms.tsx    — título responsivo, grid check
  src/pages/Index.tsx         — useMotionProps
  src/components/games/BoardgameCard.tsx — edit button visível em touch, useMotionProps
  src/components/games/BloodScriptCard.tsx — idem
  index.html                  — meta tags PWA
```

Nenhuma tabela ou migração necessária.

