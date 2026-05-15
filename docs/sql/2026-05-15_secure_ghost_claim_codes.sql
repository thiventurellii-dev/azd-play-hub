-- =====================================================================
-- Secure ghost_players.claim_code (security finding)
-- Aplicar no SQL Editor da instância EXTERNA (npinawelxdtsrcvzzvvs)
--
-- Antes: qualquer authenticated user podia ler claim_code de TODOS
-- os ghost_players e reivindicar contas alheias.
--
-- Depois:
--   * Coluna claim_code não pode mais ser lida via SELECT por auth/anon.
--   * Lookup pontual feito via RPC SECURITY DEFINER que devolve só
--     o preview do convidado (sem código).
--   * find_matching_guests agora exige que p_profile_id seja o próprio
--     usuário autenticado.
-- =====================================================================

-- 1) Revogar leitura da coluna sensível
REVOKE SELECT (claim_code) ON public.ghost_players FROM anon, authenticated;

-- 2) RPC pública para o ClaimGuestDialog (busca por código sem expor)
CREATE OR REPLACE FUNCTION public.lookup_ghost_by_claim_code(p_code text)
RETURNS TABLE(
  id                uuid,
  display_name      text,
  linked_profile_id uuid,
  claimed_by_user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.display_name, g.linked_profile_id, g.claimed_by_user_id
    FROM public.ghost_players g
   WHERE auth.uid() IS NOT NULL
     AND upper(trim(g.claim_code)) = upper(trim(p_code))
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_ghost_by_claim_code(text) TO authenticated;

-- 3) Endurecer find_matching_guests: só o próprio usuário pode consultar
CREATE OR REPLACE FUNCTION public.find_matching_guests(p_profile_id uuid)
RETURNS TABLE(
  id            uuid,
  display_name  text,
  nickname      text,
  name          text,
  email         text,
  phone         text,
  claim_code    text,
  match_email   boolean,
  match_phone   boolean,
  match_nick    boolean,
  match_name    boolean,
  match_score   int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT
      lower(nullif(trim(email), ''))    AS email,
      nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') AS phone,
      lower(nullif(trim(nickname), '')) AS nickname,
      lower(nullif(trim(name), ''))     AS name
    FROM public.profiles
    WHERE id = p_profile_id
      AND id = auth.uid()  -- só permite consultar para si mesmo
  )
  SELECT
    g.id, g.display_name, g.nickname, g.name, g.email, g.phone, g.claim_code,
    (p.email IS NOT NULL AND lower(g.email) = p.email) AS match_email,
    (p.phone IS NOT NULL AND nullif(regexp_replace(coalesce(g.phone,''),'\D','','g'),'') = p.phone) AS match_phone,
    (p.nickname IS NOT NULL AND lower(g.nickname) = p.nickname) AS match_nick,
    (p.name IS NOT NULL AND lower(g.name) = p.name) AS match_name,
    (CASE WHEN p.email IS NOT NULL AND lower(g.email) = p.email THEN 4 ELSE 0 END
   + CASE WHEN p.phone IS NOT NULL AND nullif(regexp_replace(coalesce(g.phone,''),'\D','','g'),'') = p.phone THEN 3 ELSE 0 END
   + CASE WHEN p.nickname IS NOT NULL AND lower(g.nickname) = p.nickname THEN 2 ELSE 0 END
   + CASE WHEN p.name IS NOT NULL AND lower(g.name) = p.name THEN 1 ELSE 0 END) AS match_score
  FROM public.ghost_players g
  CROSS JOIN p
  WHERE g.linked_profile_id IS NULL
    AND g.claimed_by_user_id IS NULL
    AND (
         (p.email    IS NOT NULL AND lower(g.email) = p.email)
      OR (p.phone    IS NOT NULL AND nullif(regexp_replace(coalesce(g.phone,''),'\D','','g'),'') = p.phone)
      OR (p.nickname IS NOT NULL AND lower(g.nickname) = p.nickname)
      OR (p.name     IS NOT NULL AND lower(g.name) = p.name)
    )
  ORDER BY match_score DESC, g.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_matching_guests(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.find_matching_guests(uuid) FROM anon;
