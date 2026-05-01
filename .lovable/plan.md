## Sistema de Achievements — Fase 1 (fundação visual + automático)

Recomeçando do zero: as tabelas `achievement_definitions` e `player_achievements` atuais (e o tab no Admin) são descartadas. Schema novo, catálogo novo, visual novo. Manual_claim e galeria completa ficam para a Fase 2.

---

### 1. Migração SQL (banco externo `npinawelxdtsrcvzzvvs`)

Drop-and-create. Migração entregue como arquivo `docs/sql/2026-05-01_achievements_v2.sql` para o usuário aplicar manualmente no SQL Editor externo (segue o padrão do projeto).

```text
DROP TABLE player_achievements;
DROP TABLE achievement_definitions;

CREATE TYPE achievement_category   -- participation | competitive | social | season | special | contribution
CREATE TYPE achievement_rarity     -- common | uncommon | rare | epic | legendary | mesa
CREATE TYPE achievement_scope_type -- global | game | season | event | player_pair | group | ranking
CREATE TYPE achievement_type       -- automatic | manual_claim | admin_only | event_only
CREATE TYPE player_achievement_status -- pending | approved | rejected | expired | disputed

CREATE TABLE achievement_templates (
  id, code UNIQUE, name, description_template,
  category, type, trigger_type, trigger_config jsonb,
  scope_type, threshold int,
  rarity, progression_group text, progression_level int,
  replaces_previous bool DEFAULT true,
  is_active bool DEFAULT true,
  requires_match bool DEFAULT false,
  created_at, updated_at
);

CREATE TABLE player_achievements (
  id, player_profile_id, achievement_template_id,
  scope_type, scope_id uuid, match_id uuid,
  status player_achievement_status DEFAULT 'approved',
  unlocked_at, requested_by, approved_at, rejected_at,
  metadata jsonb,
  UNIQUE (player_profile_id, achievement_template_id, scope_type, scope_id)
);

CREATE TABLE achievement_community_stats (
  achievement_template_id, scope_type, scope_id,
  unlocked_count, total_eligible_players, community_percentage,
  last_calculated_at,
  PRIMARY KEY (achievement_template_id, scope_type, scope_id)
);
```

RLS:
- `achievement_templates`: SELECT público, ALL admin.
- `player_achievements`: SELECT público (perfil é público), INSERT/UPDATE só admin nesta fase (trigger/edge usa service role).
- `achievement_community_stats`: SELECT público, ALL admin/service.

Trigger automático `trg_evaluate_achievements_after_match`:
- Dispara `AFTER INSERT OR UPDATE` em `match_results` e `blood_match_players`.
- Para cada participante afetado, percorre templates `is_active = true AND type = 'automatic'` e avalia o `trigger_type`. Se cumpre, faz `INSERT ... ON CONFLICT DO NOTHING` em `player_achievements`.
- Triggers suportados na fase 1: `matches_total`, `wins_total`, `matches_by_game`, `wins_by_game`, `win_streak_by_game`, `distinct_games_played`, `first_win`, `first_match_by_game`, `position_top1_season`. Cobrem participation/competitive/season.

### 2. Catálogo inicial (seed)

Mesma migração faz `INSERT` de ~20 templates iniciais, organizados em `progression_group`:

```text
game_participation:  Primeira Mesa (I) → Frequente (II) → Veterano (III) → Especialista (IV) → Mestre (V) → Lenda (VI)
                     thresholds: 1 / 5 / 15 / 30 / 60 / 100, scope=game
game_wins:           Primeira Vitória (I) → ... → Imbatível (VI)  scope=game
global_participation: Iniciante / Ativo / Veterano da Comunidade  scope=global
season_top:          Top do Pódio (scope=season, position=1)
```

Raridades: I-II common, III uncommon, IV rare, V epic, VI legendary. Categoria participation = círculo, competitive = hexágono, season = escudo.

### 3. Cron diário às 4h para `achievement_community_stats`

- Edge function `recalc-achievement-stats` (sem JWT, chamada por cron).
- Para cada template ativo, calcula `unlocked_count` e `total_eligible_players` por escopo:
  - `global` → todos os profiles ativos.
  - `game` → quem já jogou aquele jogo (`match_results` distinct).
  - `season` → quem participou da season.
- Habilita `pg_cron` + `pg_net` e agenda via SQL (entregue separadamente, pois contém URL+anon key — usa o tool de insert, não migração).

### 4. Componente `<AchievementBadge>` (`src/components/achievements/AchievementBadge.tsx`)

```tsx
interface AchievementBadgeProps {
  category: AchievementCategory;
  rarity: AchievementRarity;
  level?: number;          // 1..6 → numeral romano
  size: 'mini'|'small'|'medium'|'large';  // 18 / 24 / 36 / 56 px
  showLevel?: boolean;
  locked?: boolean;
  communityPct?: number;   // pra tooltip
  name?: string;           // pra tooltip
}
```

- SVG inline com `viewBox="0 0 100 100"` e os 6 paths do briefing (círculo, hexágono, losango, escudo, estrela, triângulo).
- Cores muted exatamente como na tabela do briefing (Common `#8E9099` … Mesa `#8B5A2B`). Lendária = `<linearGradient>` gold + `box-shadow` glow. Mesa = dupla borda. Locked = `stroke-dasharray` + opacity 0.4.
- Numeral romano serif centralizado (~33% do diâmetro), branco em formas escuras / `#1a1305` em gold.
- Tokens novos em `src/index.css` para as raridades (`--rarity-common`, `--rarity-uncommon`, …) — não hardcoded no componente.
- Tooltip (`@/components/ui/tooltip`) com nome + raridade + "Conquistada por X% da comunidade" (quando `size !== 'mini'` e `communityPct` definido).

### 5. Hook `useAchievements`

`src/hooks/useAchievements.ts` expõe:
- `useTemplates()` — todos os templates (catálogo).
- `usePlayerAchievements(profileId)` — conquistas do jogador, já com join no template e nas stats da comunidade. Aplica `replaces_previous`: agrupa por `progression_group + scope_id` e mantém só o `progression_level` mais alto na vista principal (bruto fica disponível pra timeline).
- `useGameAchievements(gameId)` — templates com `scope_type='game'` + quem desbloqueou cada um (count + lista resumida).

### 6. Integração no perfil (`src/pages/PlayerProfile.tsx`)

Nova seção `ProfileAchievements` (`src/components/profile/ProfileAchievements.tsx`) inserida entre `ProfileRecentMatchesStrip` e `ProfileDomainTabs`:

- Header: counter "X desbloqueadas · Y jogos · Z raras · W mesa · V lendárias" + "Ver todas →" (link stub para Fase 2, leva pra `#`).
- Vitrine: 4 cards grandes (selo size=`large`) — default automático: legendárias > épicas > rara mais recente. Sem editor de destaques na Fase 1 (botão "Editar destaques" também é stub para Fase 2).
- Cada card: selo, nome em serif, contexto (jogo/season), label de raridade, % da comunidade.

A timeline atual continua usando o tipo `achievement` mas agora puxa do `usePlayerAchievements` (substitui a leitura legada em `usePlayerProfileData.ts`). Renderiza mini-selo (size=`mini`) no lugar da bolinha quando o evento é de conquista.

### 7. Integração na página do jogo (`src/pages/GameDetail.tsx`)

Nova seção "Conquistas deste jogo":
- Header: "X possíveis · Y desbloqueadas pela comunidade · 1 lendária ainda intocada".
- Linhas de progressão: para cada `progression_group` agrupa os 6 níveis horizontalmente, selo médio (36px) + contador "N jogadores" / "ninguém ainda". Níveis com `community_percentage = 0` ficam dashed.
- Conquistas únicas (sem `progression_group`): grid simples de cards.
- "Top desbloqueadores": top 3 com mais conquistas neste jogo (calculado client-side a partir de `useGameAchievements`).

### 8. Admin (`src/components/admin/AdminAchievements.tsx` reescrito)

CRUD do novo `achievement_templates`:
- Form com todos os campos: code, name, description_template, category, type, trigger_type (preset list), scope_type, threshold, rarity, progression_group, progression_level, replaces_previous, requires_match, is_active.
- Lista renderiza usando o próprio `<AchievementBadge>` (preview real).
- Botão "Recalcular stats agora" que invoca a edge function manualmente.
- Concessão manual (admin_only) de uma conquista a um jogador.

### 9. Decisões fixadas (das perguntas)

- **Migração**: drop-and-create, sem preservar histórico.
- **Manual claim**: fora desta fase. Quando entrar (Fase 2), regra será maioria simples + 48h sem voto = **rejeitado**, e admin pode aprovar via página do jogo a qualquer momento.
- **% comunidade**: cron diário 4h via edge function + `pg_cron`.
- **Escopo**: Fase 1 = schema + AchievementBadge + trigger automático + perfil + página do jogo. **Fora**: manual_claim, galeria "Ver todas" funcional, notificações flutuantes, edição de destaques, validação por votos.

### 10. Arquivos

**Novos**
- `docs/sql/2026-05-01_achievements_v2.sql` (drop+create+seed+trigger)
- `supabase/functions/recalc-achievement-stats/index.ts`
- `src/components/achievements/AchievementBadge.tsx`
- `src/components/achievements/ProgressionRow.tsx`
- `src/components/profile/ProfileAchievements.tsx`
- `src/components/games/GameAchievements.tsx`
- `src/hooks/useAchievements.ts`

**Editados**
- `src/components/admin/AdminAchievements.tsx` (reescrito)
- `src/pages/PlayerProfile.tsx` (insere `ProfileAchievements`, atualiza timeline)
- `src/pages/GameDetail.tsx` (insere `GameAchievements`)
- `src/hooks/usePlayerProfileData.ts` (remove leitura de `achievement_definitions`/`player_achievements` legados)
- `src/index.css` (tokens de raridade + font-serif para numerais)

Pronto pra implementar quando aprovado.