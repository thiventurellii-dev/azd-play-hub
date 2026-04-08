
# Plano: PWA Instalável + Push Notifications

## Parte 1 — PWA Instalável

### 1.1 Gerar ícones PWA
- Gerar ícones 192x192 e 512x512 com o logo AzD para o manifest.

### 1.2 Atualizar `public/manifest.json`
- `display: "standalone"`, `theme_color: "#0A0A0A"`, `background_color: "#0A0A0A"`, ícones corretos, `start_url: "/"`.

### 1.3 Meta tags em `index.html`
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `theme-color`, `<link rel="apple-touch-icon">`.

### 1.4 Página `/instalar`
- Página com instruções visuais para Android e iOS.
- Botão "Instalar" que aciona o prompt nativo do navegador (evento `beforeinstallprompt`).
- Link para essa página no BottomNav ou drawer "Mais".

### 1.5 Service Worker (via vite-plugin-pwa)
- Instalar `vite-plugin-pwa`.
- Configurar com `registerType: "autoUpdate"`, `devOptions: { enabled: false }`.
- Guard contra iframes e preview hosts no `main.tsx`.
- `navigateFallbackDenylist: [/^\/~oauth/]`.

---

## Parte 2 — Push Notifications

### 2.1 Tabela `push_subscriptions`
- Migração: criar tabela `push_subscriptions` com `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`.
- RLS: usuários inserem/deletam as próprias subscriptions; admins podem ler todas.

### 2.2 Gerar chaves VAPID
- Gerar par de chaves VAPID (pública + privada).
- Chave pública vai no frontend como variável `VITE_VAPID_PUBLIC_KEY`.
- Chave privada vai como secret `VAPID_PRIVATE_KEY` na Edge Function.

### 2.3 Frontend: solicitar permissão + salvar subscription
- Após login, solicitar permissão de notificação.
- Usar `PushManager.subscribe()` com a chave VAPID pública.
- Salvar a subscription na tabela `push_subscriptions`.

### 2.4 Edge Function `send-push-notification`
- Recebe `user_id` + `title` + `message`.
- Busca subscriptions do usuário.
- Envia via Web Push API (usando `web-push` ou chamada HTTP direta ao endpoint).

### 2.5 Service Worker: listener de push
- No SW (via vite-plugin-pwa injectManifest ou custom), adicionar listener `push` para exibir `self.registration.showNotification(...)`.

### 2.6 Integrar com notificações existentes
- Nas funções que já criam notificações no banco (`notifications` table), adicionar chamada à Edge Function `send-push-notification` para enviar push real.
- Locais principais: criação de sala de partida, convite de amizade, comentários em salas.

---

## Arquivos criados/editados

```
Criados:
  src/pages/Install.tsx               — página de instalação
  supabase/functions/send-push/index.ts — Edge Function de push
  
Editados:
  public/manifest.json                 — manifest completo
  index.html                           — meta tags + apple-touch-icon
  vite.config.ts                       — vite-plugin-pwa
  src/main.tsx                         — guard SW + registro push
  src/App.tsx                          — rota /instalar
  src/components/BottomNav.tsx         — link para instalar
  src/lib/roomNotifications.ts         — integrar push
  src/lib/matchNotification.ts         — integrar push

Migração:
  push_subscriptions table + RLS
```

## Dependências
- `vite-plugin-pwa`

## Secrets necessários
- `VAPID_PRIVATE_KEY` (chave privada VAPID)
- `VITE_VAPID_PUBLIC_KEY` será hardcoded no frontend (é pública)
