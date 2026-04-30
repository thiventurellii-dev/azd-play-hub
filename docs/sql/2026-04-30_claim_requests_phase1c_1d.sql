-- =====================================================================
-- Fase 1C + 1D — Guest Players: claim_requests + tokens/índices
-- Aplicar no SQL Editor da instância EXTERNA (npinawelxdtsrcvzzvvs)
-- =====================================================================

-- ---------------------------------------------------------------------
-- FASE 1D — ghost_players.claim_code: garantir unicidade + regenerar
-- vazios/colisões, e trigger para sempre ter código ao inserir.
-- ---------------------------------------------------------------------

-- 1) Backfill: garantir que toda linha tenha claim_code não-nulo.
UPDATE public.ghost_players
SET claim_code = 'AZD-' || upper(substr(md5(random()::text || id::text), 1, 4))
WHERE claim_code IS NULL OR length(trim(claim_code)) = 0;

-- 2) Resolver eventuais duplicatas existentes antes de criar índice único.
--    Mantém o mais antigo; regenera os demais até ficarem únicos.
DO $$
DECLARE
  dup RECORD;
  new_code TEXT;
  tries INT;
BEGIN
  FOR dup IN
    SELECT id
    FROM (
      SELECT id,
             row_number() OVER (PARTITION BY claim_code ORDER BY created_at ASC) AS rn
      FROM public.ghost_players
    ) s
    WHERE rn > 1
  LOOP
    tries := 0;
    LOOP
      new_code := 'AZD-' || upper(substr(md5(random()::text || dup.id::text || clock_timestamp()::text), 1, 4));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.ghost_players WHERE claim_code = new_code
      ) OR tries > 20;
      tries := tries + 1;
    END LOOP;
    UPDATE public.ghost_players SET claim_code = new_code WHERE id = dup.id;
  END LOOP;
END $$;

-- 3) NOT NULL + índice único.
ALTER TABLE public.ghost_players
  ALTER COLUMN claim_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ghost_players_claim_code_unique
  ON public.ghost_players (claim_code);

-- 4) Índice auxiliar para lookups por linked_profile_id (filtro do ranking, etc.).
CREATE INDEX IF NOT EXISTS ghost_players_linked_profile_idx
  ON public.ghost_players (linked_profile_id)
  WHERE linked_profile_id IS NOT NULL;

-- 5) Trigger BEFORE INSERT: se vier sem código (ou string vazia), gera um único.
CREATE OR REPLACE FUNCTION public.ensure_ghost_claim_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  tries INT := 0;
BEGIN
  IF NEW.claim_code IS NULL OR length(trim(NEW.claim_code)) = 0 THEN
    LOOP
      new_code := 'AZD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.ghost_players WHERE claim_code = new_code
      ) OR tries > 20;
      tries := tries + 1;
    END LOOP;
    NEW.claim_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ghost_players_ensure_code ON public.ghost_players;
CREATE TRIGGER trg_ghost_players_ensure_code
  BEFORE INSERT ON public.ghost_players
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_ghost_claim_code();

-- ---------------------------------------------------------------------
-- FASE 1C — claim_requests: pedidos de vínculo guest -> profile
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.claim_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_player_id uuid NOT NULL REFERENCES public.ghost_players(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_code      text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | cancelled
  message         text,
  reviewed_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_requests_status_check
    CHECK (status IN ('pending','approved','rejected','cancelled'))
);

-- Apenas UM pedido pendente por (ghost, profile).
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_pending_unique
  ON public.claim_requests (ghost_player_id, profile_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS claim_requests_status_idx
  ON public.claim_requests (status);

CREATE INDEX IF NOT EXISTS claim_requests_profile_idx
  ON public.claim_requests (profile_id);

CREATE INDEX IF NOT EXISTS claim_requests_ghost_idx
  ON public.claim_requests (ghost_player_id);

-- updated_at automático.
DROP TRIGGER IF EXISTS trg_claim_requests_updated_at ON public.claim_requests;
CREATE TRIGGER trg_claim_requests_updated_at
  BEFORE UPDATE ON public.claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- Usuário vê seus próprios pedidos; admins veem tudo.
DROP POLICY IF EXISTS "Users view own claim requests" ON public.claim_requests;
CREATE POLICY "Users view own claim requests"
  ON public.claim_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id OR has_role(auth.uid(), 'admin'::app_role));

-- Usuário cria pedido apenas para si mesmo.
DROP POLICY IF EXISTS "Users create own claim requests" ON public.claim_requests;
CREATE POLICY "Users create own claim requests"
  ON public.claim_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- Usuário pode cancelar (UPDATE) o próprio pedido pendente; admins gerenciam tudo.
DROP POLICY IF EXISTS "Users update own pending claim requests" ON public.claim_requests;
CREATE POLICY "Users update own pending claim requests"
  ON public.claim_requests
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = profile_id AND status = 'pending')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (auth.uid() = profile_id AND status IN ('pending','cancelled'))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Apenas admin deleta.
DROP POLICY IF EXISTS "Admins delete claim requests" ON public.claim_requests;
CREATE POLICY "Admins delete claim requests"
  ON public.claim_requests
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- FIM
-- ---------------------------------------------------------------------
