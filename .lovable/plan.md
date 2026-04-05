

# Plano de Evolucao - AzD Play Hub

## Visao Geral

Quatro frentes organizadas por prioridade de impacto e dependencia tecnica.

---

## Fase 1 - Sistema de Salas de Partida (Prioridade Alta)

### Banco de Dados

Novas tabelas via migration:

- **match_rooms** - id, game_id (ref games), created_by (uuid), title, description, scheduled_at (timestamptz), max_players (int), status (enum: open/full/in_progress/finished/cancelled), created_at, updated_at
- **match_room_players** - id, room_id (ref match_rooms), player_id (uuid), position (int), type (enum: confirmed/waitlist), joined_at
- RLS: leitura publica para autenticados, insercao/delecao pelo proprio usuario no match_room_players, admins gerenciam tudo, criador da sala pode editar/cancelar
- Habilitar realtime em ambas tabelas para atualizacao de vagas em tempo real

### Frontend

- **Nova pagina `/partidas`** (MatchRooms.tsx) - Grid responsivo de cards com:
  - Nome do jogo + icone, data/hora formatada, vagas (ex: 3/10), badge de status (Aberto/Lotado), botao "Entrar" ou "Entrar na Reserva" (quando lotado)
  - Mobile-first: cards empilhados, botoes grandes com area de toque adequada (min 44px), swipe-friendly
- **Componente MatchRoomCard** - Card individual com logica de entrada/saida, contador de vagas em tempo real via Supabase Realtime
- **Componente CreateRoomDialog** - Modal para criar sala: selecionar jogo, data/hora, vagas, descricao
- **Rota protegida** - Somente usuarios logados acessam; nao logados sao redirecionados para `/login`

### Integracao e Notificacoes

- **Botao "Convidar via WhatsApp"** - Gera link `https://wa.me/?text=...` com mensagem formatada (nome da sala, jogo, horario, link direto)
- **Funcao `sendMatchNotification`** - Utility que monta o JSON de webhook (room_id, game, players, scheduled_at) e faz `console.log` do payload, pronto para plugar em Discord/API externa futuramente
- **Edge function `match-webhook`** - Endpoint preparado que recebe o payload e loga, sem destino real ainda (placeholder para integracao futura)
- **PWA basico** - Adicionar `manifest.json` com icones e `display: standalone` para instalabilidade (SEM service worker/vite-plugin-pwa, apenas manifesto para preparar push notifications futuras)

### Admin

- Nova aba "Salas" no painel admin para gerenciar/moderar salas criadas

---

## Fase 2 - Reorganizacao da Navbar

### Estrutura proposta

```text
Logo | Sobre Nos | Competitivo v | Partidas | Jogadores | Recursos v | Sugestoes | Nossas Redes v | [Perfil/Auth]
                   |                                       |
                   +- Seasons                              +- Regras
                   +- Torneios (futuro)                    +- Materiais (futuro)
                                                           +- Biblioteca de Jogos
```

### Mudancas tecnicas

- Refatorar `Navbar.tsx`: substituir lista plana de links por grupos com dropdowns
- "Competitivo" dropdown: link para `/seasons` e placeholder "Torneios" (desabilitado ou com badge "Em breve")
- "Partidas" link direto para `/partidas` com icone Calendar
- "Recursos" dropdown: Regras (`/rules`), Biblioteca de Jogos (`/games`), Materiais (placeholder futuro)
- Mobile: menu accordion com sub-itens colapsaveis ao inves de dropdown
- Manter "Nossas Redes" como dropdown existente
- Navbar identica para logado/nao-logado (exceto botoes de auth), porem paginas protegidas redirecionam para login

---

## Fase 3 - Hero Section (Pagina Principal)

### Logado

- Botao principal (gold): **"Agendar Partida"** -> `/partidas`
- Botao secundario (outline): **"Cenario Competitivo"** -> `/seasons`
- Remover botoes "Explorar Jogos" e "Conheca os Jogadores"

### Nao Logado

- Manter botao "Faca parte da comunidade" como principal
- Adicionar botao secundario "Agendar Partida" que redireciona para `/login`
- Tornar todas as paginas protegidas exceto `/about`, `/login`, `/register`, `/complete-profile` e `/` (home)
- Atualizar `PUBLIC_ROUTES` e rotas no `App.tsx` para refletir essa restricao

---

## Fase 4 - Engajamento (Prioridade Futura)

Recursos para implementacao posterior, apos validar o sistema de partidas:

### Friendlist
- Tabela `friendships` (user_id, friend_id, status: pending/accepted)
- Pagina de perfil com lista de amigos e botao "Adicionar amigo"
- Notificacao de solicitacao de amizade

### Comentarios em Partidas
- Tabela `match_room_comments` (room_id, user_id, text, created_at)
- Componente de chat/comentarios dentro da sala de partida
- Realtime para comentarios ao vivo

### Outras ideias para considerar
- Sistema de conquistas/badges (primeira partida, 10 partidas, etc.)
- Historico de partidas no perfil do jogador
- Estatisticas de participacao (partidas agendadas vs comparecidas)

---

## Ordem de Implementacao Sugerida

1. **Migration do banco** (match_rooms + match_room_players + RLS + realtime)
2. **Pagina de Partidas** (cards, criar sala, entrar/sair, waitlist, realtime)
3. **Integracao WhatsApp + webhook placeholder + manifesto PWA**
4. **Refatorar Navbar** com dropdowns e nova estrutura
5. **Atualizar Hero Section** e restringir rotas publicas
6. **Engajamento** (friendlist, comentarios) em fase posterior

Cada fase pode ser implementada de forma independente, mas a ordem acima minimiza retrabalho.

