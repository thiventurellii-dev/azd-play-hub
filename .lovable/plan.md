

# Push Notifications: Migrar para Supabase Externo

## Problema atual

Os IDs não batem: `subscribeToPush` salva no Lovable Cloud (com user_id do Lovable Cloud), mas `sendRoomNotifications` envia user_ids do Supabase externo. A edge function busca no Lovable Cloud e não encontra match.

## Solução

Mover toda a lógica de push_subscriptions para o Supabase externo. Isso requer:

### 1. Criar tabela `push_subscriptions` no Supabase externo

Você precisará executar este SQL no dashboard do Supabase externo (`npinawelxdtsrcvzzvvs`):

```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Policy para a service role poder ler todas (usado pela edge function)
CREATE POLICY "Service role can read all push subscriptions"
ON public.push_subscriptions FOR SELECT TO service_role
USING (true);

CREATE POLICY "Service role can delete push subscriptions"
ON public.push_subscriptions FOR DELETE TO service_role
USING (true);
```

### 2. Alterar `src/lib/pushNotifications.ts`

Trocar o import de `@/integrations/supabase/client` para `@/lib/supabaseExternal`. O `userId` passado já é do Supabase externo (vem do AuthContext que autentica no externo), então os IDs passarão a bater.

### 3. Alterar `supabase/functions/send-push/index.ts`

A edge function precisa conectar ao **Supabase externo** para buscar as subscriptions. Trocar de `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` para `EXTERNAL_SUPABASE_URL`/`EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` (que já existem como secrets).

### 4. Verificar `src/pages/Install.tsx`

O `user.id` vem do AuthContext que usa o Supabase externo, então já é o ID correto. Nenhuma mudança necessária neste arquivo.

### 5. Limpar subscriptions antigas do Lovable Cloud

Opcional: deletar os registros existentes na tabela `push_subscriptions` do Lovable Cloud, que têm IDs incorretos.

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/lib/pushNotifications.ts` | Trocar import para `supabaseExternal` |
| `supabase/functions/send-push/index.ts` | Usar `EXTERNAL_SUPABASE_*` secrets |

## Pré-requisito (ação do usuário)

Criar a tabela `push_subscriptions` no Supabase externo via SQL Editor (conforme SQL acima).

