# Plano: Reescrever Edge Function `send-push` com `crypto.subtle` nativo

## Problema atual

1. A Edge Function importa `@noble/curves` e `@noble/hashes` que crasham no Deno (`Deno.core.runMicrotasks() is not supported`)
2. O frontend salva subscriptions diretamente no banco externo via `supabaseExternal` com `anon key`, mas o usuário não tem sessão lá — RLS rejeita silenciosamente
3. As chaves VAPID podem estar descasadas

## Solução em 3 partes

### 1. Gerar novo par VAPID via script

Antes de implementar, rodar um script no sandbox para gerar um par ECDSA P-256 válido em formato base64url. Isso garante 100% que pub/priv são par. A public key vai para o código, a private key será solicitada via `add_secret`.

### 2. Reescrever `supabase/functions/send-push/index.ts`

Reescrita completa removendo todos os imports de `@noble/*`. Usar exclusivamente:

- `crypto.subtle.generateKey` para par efêmero ECDH
- `crypto.subtle.importKey` (JWK) para VAPID signing
- `crypto.subtle.sign` (ECDSA P-256 / SHA-256) para JWT
- `crypto.subtle.deriveKey` / `deriveBits` para ECDH shared secret
- `crypto.subtle.encrypt` (AES-128-GCM) para payload
- HKDF via `crypto.subtle.deriveBits` com `HKDF` algorithm

Ações suportadas:


| Action         | Payload esperado                                                          | Operação                                                    |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `subscribe`    | `{ action, user_id, subscription: { endpoint, keys: { p256dh, auth } } }` | DELETE old + INSERT new no banco externo via `service_role` |
| `unsubscribe`  | `{ action, user_id, endpoint }`                                           | DELETE do banco externo via `service_role`                  |
| `cleanup`      | `{ action, user_id }`                                                     | DELETE all subs do user                                     |
| `list`         | `{ action, user_id }`                                                     | SELECT subs para debug                                      |
| (default/send) | `{ user_ids, title, message, url }`                                       | Busca subs + envia web push                                 |


O cliente Supabase será criado com `EXTERNAL_SUPABASE_URL` + `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS.

### 3. Atualizar `src/lib/pushNotifications.ts`

- Remover import de `supabaseExternal`
- `subscribeToPush`: após gerar subscription no browser, chamar a edge function com `action: "subscribe"` enviando o formato exato:

```json
{
  "action": "subscribe",
  "user_id": "...",
  "subscription": {
    "endpoint": "...",
    "keys": { "p256dh": "...", "auth": "..." }
  }
}
```

- `unsubscribeFromPush`: chamar edge function com `action: "unsubscribe"`
- Manter o `existingSubscription.unsubscribe()` no browser antes de criar nova (já existe)
- Atualizar `VAPID_PUBLIC_KEY` com a nova chave gerada

## Arquivos alterados


| Arquivo                                 | Mudança                                                             |
| --------------------------------------- | ------------------------------------------------------------------- |
| `supabase/functions/send-push/index.ts` | Reescrita completa: só `crypto.subtle`, ações subscribe/unsubscribe |
| `src/lib/pushNotifications.ts`          | Salvar via edge function, nova VAPID public key                     |


## Ordem de execução

1. Gerar par VAPID via script
2. Reescrever edge function
3. Atualizar frontend
4. Solicitar `VAPID_PRIVATE_KEY` via `add_secret`
5. Deploy edge function
6. Publicar + Reativar + Testar  
  
  
**VAPID JWT 'sub':** "Lovable, ao gerar o JWT para o VAPID, lembre-se de incluir a claim sub (pode ser um [mailto:seuemail@exemplo.com](mailto:seuemail@exemplo.com) ou a URL do seu site). Sem isso, o Google/Firebase pode rejeitar a notificação."
7. **Formato Base64URL:** "Certifique-se de que a VAPID_PUBLIC_KEY no frontend e as chaves no backend usem o formato **Base64URL** (sem = e trocando + por - e / por _), que é o padrão exigido pelo protocolo Web Push."
8. **Tratamento de erro no Front:** "No pushNotifications.ts, adicione um log detalhado caso a chamada para a Edge Function de subscribe falhe, para sabermos se o erro foi de rede ou de lógica interna."