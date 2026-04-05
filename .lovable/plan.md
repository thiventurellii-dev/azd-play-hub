
# Plano de Polimento e Evolução — AzD Play Hub

## FASE A — Correções Rápidas e Navegação (Prioridade Alta)

### A1. Navbar e Links
- Corrigir link de perfil na Navbar → redirecionar para `/perfil/:nickname` do usuário logado
- Badge de notificação de amizade pendente no menu de perfil
- Renomear `whatsappUrl` → `whatsappUrlBG` + criar `whatsappUrlBotc` na tabela `contact_links`
- Ajustar Navbar "Nossas Redes" com os dois WhatsApp separados (BG e BotC)

### A2. Hero Page (Index)
- Adicionar ícones de Discord e WhatsApp (BG + BotC) com diferenciação visual

### A3. Criação de Sala
- Separar campo Data e Hora no `CreateRoomDialog`, hora não obrigatória

### A4. Bug da Pontuação
- Corrigir input que perde valor no `ScoringSheet` (controlled input bug com `|| ''`)

## FASE B — Registro de Partida (Prioridade Alta)

### B1. Permissões
- Permitir qualquer usuário autenticado registrar partidas (não só admin)
- Migration: atualizar RLS de `matches` e `match_results` para INSERT por authenticated

### B2. UI/UX do NewMatchFlow
- Renomear "Season" → "Competitivo" e tornar não obrigatório
- Campo de busca autocomplete para jogadores (substituir lista)
- Validação min/max jogadores do jogo selecionado
- Renomear "Mesa" → "Posição", remover checkbox "1º Jogador"

### B3. Schema de Pontuação com Categorias/Subcategorias
- Alterar estrutura JSON: `categories` contém `subcategories` (só subcategorias têm input)
- Atualizar `ScoringSheet` e `AdminScoringSchemas` para essa hierarquia

## FASE C — Páginas de Jogos e Perfil (Prioridade Média)

### C1. Página Individual de Jogos
- Garantir que `/jogos/:slug` funcione — popular slugs nos jogos existentes
- Permitir que usuários registrem novos jogos (com aprovação admin ou direto)

### C2. Perfil do Jogador
- Corrigir FriendsList no perfil público (`/perfil/:nickname`)
- Remover Win Rate geral e Sequência de Vitórias dos stats
- Cores variadas no gráfico de adversários (não monocromático)

### C3. Facções no Admin de Jogos
- Adicionar campo JSON de facções/personagens na tabela `games` (migration)
- Mostrar dropdown de facção no registro de partida quando disponível

## FASE D — Documentos e Contatos (Prioridade Média)

### D1. Página de Documentos
- Substituir `/rules` por `/documentos` — página de "Documentos da Comunidade"
- Migration: criar tabela `community_documents` (title, file_url, uploaded_by, created_at)
- Admin pode fazer upload de PDFs via storage; usuários podem baixar
- Usar bucket `community-docs` existente

## FASE E — Agendamento e Resultados (Prioridade Média)

### E1. Encerramento Automático
- Marcar salas como "finished" quando `scheduled_at` passa (via query no fetch ou cron)

### E2. Botão "Inserir Resultado"
- Em salas encerradas, botão que abre NewMatchFlow pré-preenchido com jogo/data/jogadores

## FASE F — Gamificação (Prioridade Baixa)

### F1. Sistema de Tags/Achievements
- Migration: criar tabelas `achievement_definitions` (admin-managed) e `player_achievements`
- Admin define critérios (manual por enquanto)
- Tags exibidas no perfil público do jogador

## FASE G — Reorganização Admin (Prioridade Baixa)

### G1. Admin Inline/Contextual
- Na Coleção de Jogos: botão "Gerenciar Jogos" (admin only) com modal
- No Perfil do Jogador: seção "Ferramentas de Moderador" (editar/banir)
- No Histórico: botões Editar/Excluir partidas inline
- Nos Agendamentos: controles de moderação nos cards
- Na página de Seasons: CRUD inline

### G2. Refatorar Painel Admin Central
- Manter apenas: Pontuação, Sobre Nós, Contatos, Scripts Blood, Sugestões, Documentos
- Remover abas de Jogos, Jogadores, Partidas (agora contextuais)

---

## Ordem de Implementação
1. Fase A (correções rápidas)
2. Fase B (registro de partida)
3. Fase C (jogos e perfil)
4. Fase D (documentos)
5. Fase E (agendamento)
6. Fase F (gamificação)
7. Fase G (reorganização admin)

Cada fase será implementada e testada antes de avançar para a próxima.
