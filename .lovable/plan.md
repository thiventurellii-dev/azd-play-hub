# RPG: Campanhas, Personagens, Sessões e Mural

Esse plano organiza o que recebemos do mockup + briefing do Claude e adapta ao que já existe no projeto. Ele descreve o produto final e divide em entregas que podem ser feitas sem ordem rígida (você decidiu não pensar em "fases").

## O que já existe hoje
- `rpg_systems` e `rpg_adventures` (com `slug`, `tag`, `image_url`).
- `RpgAdventureDetail` (página da aventura) já com sidebar, intensidade, notas do mestre e card de interesse.
- `match_rooms` com `room_type` (`boardgame | botc | rpg`), agendamento, jogadores, comentários e resultado.
- Sistema de favoritos, notificações, RLS por papel (admin/player) e padrão de hooks `useXxxDetail`.

## O que falta — visão de produto

### 1. Personagem como vitrine da comunidade
Personagem é entidade própria (não filho da campanha). Pode ser ligado a uma ou mais campanhas via junction.

Página `/rpg/personagens/:id`:
- Retrato, nome, raça, classe, nível, sistema.
- Campos opcionais: backstory curto, alinhamento, traços, equipamento.
- Campo "Mais informações" com URL externa (LegendKeeper, D&D Beyond, Google Doc).
- Lista de campanhas em que apareceu, com status (ativo, caído, aposentado, saiu).
- Visibilidade pública/privada (default público).

No `PlayerProfile`: aba **Personagens** mostrando "Hall dos Heróis" do jogador. Personagens caídos ganham tratamento especial (borda avermelhada, nome riscado, lápide com sessão da morte) — funciona como memorial.

### 2. Campanha como espaço vivo
Página `/rpg/campanhas/:slug` reproduzindo o mockup:

- **Header roxo** com nome, descrição curta, status (planejamento, em curso, concluída, abandonada), visibilidade (pública/privada), contagem de jogadores, mestre, datas, total de sessões e horas.
- **Banner âmbar da próxima sessão**: aparece só se houver `match_room` futura linkada à campanha. Mostra data, título, contagem de confirmados e botão "Ver sala".
- **A Party**: grid 4 colunas com cards de personagens (avatar, nome, raça/classe/nível, jogador). Personagens com status `dead | left | retired` recebem o tratamento "caído". Botão "Convidar jogador" (visível pro mestre).
- **Crônica**: timeline vertical com as sessões. Bolinha dourada na última, roxa nas anteriores, vermelha quando a sessão teve morte de personagem. Cada sessão mostra título, data, duração, presentes e recap curto. Botão "Ver sessões anteriores" se houver mais que N.
- **Mural da campanha**: feed cronológico simples (sem threading). Mestre marcado como "mestre", jogadores marcados pelo personagem que controlam. Campo de escrita inline.
- **Sidebar direita**: visão geral (aventura, sistema, datas, visibilidade), barras de presença por jogador (verde >80%, âmbar abaixo), placeholder do "Diário do Mestre" (NPCs/locais/segredos — entra depois) e bloco "X pedidos de vaga" visível só pro mestre.

### 3. Sessão = match_room finalizada
A "sessão" não é entidade nova: é uma `match_room` com `room_type='rpg'` ligada a uma campanha. Quando o mestre clica em "Inserir Resultado", o formulário existente ganha campos extras:

- Título da sessão (default "Sessão N").
- Recap (texto livre, markdown leve).
- Presentes (checkbox da party — alimenta as barras de presença).
- Eventos em destaque (lista repetível: tipo + personagem afetado + descrição). Tipos sugeridos: morte, level-up, marco, item lendário, npc importante, traição, conquista.

A crônica e a sidebar de presença leem direto desses campos. Sem tabela `rpg_campaign_sessions` separada — a `match_room` já é a sessão.

### 4. Aventura: vitrine + interesse
Manter `RpgAdventureDetail` que já existe e enriquecer com campos do briefing: `recommended_level`, `min_players`, `max_players`, `estimated_duration_hours`, `setting`, `tone`, pilares (`combat`, `mystery`, `exploration`, `roleplay`, `danger` — enum baixa/média/alta/muito_alta), `tips`, `hooks`, `variations`, `secrets`, `highlights`, `materials`. Já temos `AdventureIntensityBars` e `AdventureMasterNotes` — só precisam dos campos no banco.

Nova listagem `/rpg/campanhas` derivada de uma aventura: "Campanhas em curso desta aventura" + botão "Iniciar nova campanha" para mestres.

### 5. Permissões
- **Mestre**: tag/role do jogador. Só mestres veem "Criar campanha" e "Inserir resultado de sessão". Pode haver mestres por sistema (todo mundo é mestre por enquanto, depois evoluímos pra role formal).
- **Mestre da campanha**: edita campanha, convida/aceita jogadores, encerra, posta no mural como "mestre", gerencia eventos da sessão.
- **Jogador da party** (status `accepted`): confirma presença, posta no mural, sai, gerencia próprio personagem na campanha.
- **De fora, campanha pública**: vê tudo (header, party, crônica, mural). Botão "Pedir vaga" cria entrada em `rpg_campaign_players` com status `pending_request`.
- **De fora, campanha privada**: vê só capa, nome, mestre e status — sem crônica, party ou mural.

## Detalhes técnicos (Lovable / banco)

### Tabelas novas
- `rpg_characters` — `id, player_id, system_id, name, race, class, level, portrait_url, backstory, external_url, alignment, traits, gear, is_public, created_at`.
- `rpg_campaigns` — `id, adventure_id, master_id, name, slug, description, image_url, status (planning|active|completed|abandoned), is_public, max_players, started_at, ended_at, created_at`.
- `rpg_campaign_players` — `campaign_id, player_id, status (invited|accepted|pending_request|left), joined_at`.
- `rpg_campaign_characters` — junction `campaign_id, character_id, status (active|left|dead|retired), joined_at, exited_at, exit_session_id`.
- `rpg_campaign_posts` — `id, campaign_id, author_id, body, created_at, updated_at`.
- `rpg_session_events` — `id, room_id, event_type, character_id, description, created_at`.
- `rpg_session_attendance` — `room_id, player_id, present`. (Pode reaproveitar `match_room_players` se ele já carregar presença real; senão essa tabela complementa.)
- `rpg_adventure_interests` — `adventure_id, player_id, created_at` (já existe lógica de interesse no card, mas sem persistência confirmada — verificar).

### Alterações em tabelas existentes
- `match_rooms`: adicionar `campaign_id uuid NULL` (FK pra `rpg_campaigns`). Quando preenchido, RLS filtra: aceitos da campanha entram como player, demais como observador (se pública) ou ficam fora (se privada).
- `rpg_adventures`: adicionar campos do item 4.

### RLS
- `rpg_campaigns` públicas: SELECT aberto. Privadas: só master + party + admin.
- `rpg_campaign_posts`: SELECT pra quem vê a campanha. INSERT pra master + party.
- `rpg_characters`: SELECT pra dono + master de campanhas onde aparece + admin; se `is_public`, todos.
- Tudo o que muda banco vai via `supabase--migration` quando estivermos em modo build.

### Frontend
- Páginas: `RpgCampaignDetail`, `RpgCharacterDetail`, listagem `RpgCampaigns` (opcional, derivada da aventura).
- Hooks: `useRpgCampaignDetail`, `useRpgCharacterDetail`, `useRpgCampaignPosts`, `useRpgSessionEvents`.
- Forms: `RpgCampaignForm`, `RpgCharacterForm`, extensão do form de resultado de match_room RPG.
- Componentes novos: `CampaignHeader`, `NextSessionBanner`, `PartyGrid` + `PartyCharacterCard` (com variante "fallen"), `ChronicleTimeline` + `ChronicleEntry`, `CampaignWall` + `WallPost`, `AttendanceBars`, `JoinRequestsCard`.
- Tab "Personagens" em `PlayerProfile.tsx`.

### Reaproveitamento
- `EntityEditButton`, `FavoriteButton`, padrão `useXxxDetail`.
- Form de resultado de match_room ganha branch específica quando `room_type='rpg'` e `campaign_id` está setado.

## Decisões já tomadas (do seu reply ao Claude)
- Mural cronológico simples (sem threads).
- Match room finalizada vira sessão automaticamente; resultado da room = recap + duração + eventos em destaque.
- Personagem é entidade própria, com integração externa (LegendKeeper/etc) opcional.
- Diário do Mestre fica pra depois, não bloqueia.

## Perguntas que ainda precisam de resposta antes de codar

1. **Quem pode ser mestre?** Hoje qualquer admin cria conteúdo RPG. Você quer (a) qualquer jogador autenticado pode criar campanha; (b) só quem tem tag/role "mestre" no perfil; (c) só admin? Isso muda RLS.
2. **Personagem público por default?** Você prefere `is_public=true` no cadastro (vira vitrine na hora) ou `false` (jogador opta por compartilhar)?
3. **Pedidos de vaga em campanha pública**: aprovação do mestre é obrigatória ou existe modo "entrada livre até lotar"?
4. **Convidar jogador**: por busca de username (como nas amizades) ou por link de convite compartilhável?
5. **Múltiplos personagens por campanha**: um jogador pode ter mais de um personagem ativo na mesma campanha (NPCs jogáveis, substitutos), ou um por vez?

Responde essas 5 e eu sigo pra build.
