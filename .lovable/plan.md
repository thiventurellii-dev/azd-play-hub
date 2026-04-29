## Objetivo

Transformar a landing page do usuário deslogado (`LoggedOutIndex` em `src/pages/Index.tsx`) numa página completa estilo marketing, baseada na referência `Landing_Page.html` enviada — porém com a ordem, textos e seções ajustados conforme pedido.

## Ordem final das seções

1. **Hero** — logo + título "Amizade" (mantém posição/estilo atual da nossa Hero)  
   - Subtítulo + CTAs (Faça parte / Ver os jogos)
   - Indicador "Explorar" abaixo (ampliado e mais em evidência)
2. **Stats bar** — Jogadores ativos · Partidas registradas · Seasons realizadas · Jogos no catálogo (subida pra cima do "Explorar"... na prática logo abaixo do hero, antes do conteúdo "explorável")
3. **Testimonials / "Mais do que jogar, construímos amizades"** — bloco de comentários da comunidade (subido para antes das seções de feature)
4. **Perfil do Jogador** (texto reescrito — ver abaixo)
5. **Salas de Partida (Agendamento)**
6. **Comunidades — "Traga sua comunidade"** (nova seção)
7. **Seasons / Ranking competitivo**
8. **Jogos** (catálogo)
9. **CTA final — "Pronto para entrar na mesa?"** + botões das nossas comunidades (Discord / WhatsApp / WhatsApp BotC) no final

## Mudanças de conteúdo solicitadas

- **Hero**: manter a logo e o texto "Amizade" exatamente como já está hoje (não usa o layout do mockup, usa o nosso atual).
- **"Explorar"**: aumentar fonte (ex. `text-sm` → `text-base`/`text-lg`, uppercase, tracking maior) e seta animada maior e mais visível, posicionada logo abaixo dos CTAs do hero.
- **Stats**: dados reais do banco (jogadores, partidas, seasons, jogos), com counter animado ao entrar na viewport.
- **Testimonials**: 3 cards com depoimentos (estáticos, mesmos textos do mockup).
- **Perfil — texto novo**:  
  Título: "Seu perfil completo e personalizado"  
  Body: "Estatísticas, histórico de partidas, badges e personalização — tudo em um só lugar." (foco em perfil/estatísticas, não em MMR).
- **Comunidades — nova seção** "Traga sua comunidade":  
  Texto vendendo a ideia de que outros grupos podem usar a plataforma — criar comunidade, gerenciar membros, ter seus próprios rankings, discussões e calendário de partidas.  
  CTA: "Criar minha comunidade".
- **Ranking & Competitivo**: mantém o texto/mockup do MMR/seasons da referência.
- **Jogos**: 3 cards de jogos (Blood, Brass, Arnak) — pode usar imagens estáticas ou buscar dinamicamente do catálogo (vou usar estático por simplicidade, igual ao mockup).
- **CTA final**: "Pronto para entrar na mesa?" + botão "Criar conta grátis" + nota.  
  **Abaixo do CTA**: botões das nossas comunidades reais (Discord, WhatsApp, WhatsApp BotC) puxados de `contact_links` — reaproveitar o componente `SocialButtons`.

## Estrutura técnica

- Reescrever **`src/pages/Index.tsx`** → `LoggedOutIndex` agora renderiza um conjunto de seções modulares.
- Criar componentes em **`src/components/landing/`**:
  - `LandingHero.tsx` (envolve a `Hero` atual + CTAs + scroll hint ampliado)
  - `LandingStats.tsx` (4 stats com counter animado, busca contagens via Supabase)
  - `LandingTestimonials.tsx` (3 cards estáticos)
  - `LandingProfileSection.tsx` (split text + mockup de perfil)
  - `LandingMatchRoomsSection.tsx` (split mockup + text)
  - `LandingCommunitiesSection.tsx` (split text + mockup com cards de comunidades)
  - `LandingSeasonsSection.tsx` (split text + mockup ranking)
  - `LandingGamesSection.tsx` (3 cards de jogos)
  - `LandingFinalCTA.tsx` (CTA + nota + `<SocialButtons />` no final)
- Usar **tokens semânticos existentes** (`bg-background`, `text-gold`, `border-border`, `bg-card`, etc.) em vez dos hex/HSL crus do HTML — já temos design system preto+dourado configurado.
- Usar **framer-motion** + utilitários `fadeUp` que já existem no projeto, em vez do IntersectionObserver custom.
- Counter animado pode usar um pequeno hook `useCountUp` (criado em `src/hooks/useCountUp.ts`) com `requestAnimationFrame` + `IntersectionObserver` para iniciar quando entrar na tela.

## Layout split (text + mockup)

```text
┌─────────────────────┬─────────────────────┐
│   texto + features  │     mockup card     │
│   + CTA gold        │    (UI preview)     │
└─────────────────────┴─────────────────────┘
```

Em mobile (<860px), mockup vai pra cima do texto. Seções alternam o lado (`reverse`) para ritmo visual.

## Dados

- **Stats**: queries leves com `count: 'exact', head: true`:
  - profiles, matches (+ blood_matches), seasons, games
- **SocialButtons** já existe e busca de `contact_links` — reusar no rodapé do CTA.
- Comunidades na seção "Traga sua comunidade" são **conceituais** (mockup), não consultam o banco.

## Não muda

- Versão logada (`LoggedInIndex`) permanece intacta.
- `Hero.tsx` permanece como está; só será **envolvida** pela nova `LandingHero` que adiciona CTAs + scroll hint maior.
- Navbar do site continua sendo a global (não criamos navbar custom da landing).
