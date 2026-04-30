-- =====================================================================
-- Auto-match de guests no signup (Fase 1E)
-- Aplicar no SQL Editor da instância EXTERNA (npinawelxdtsrcvzzvvs)
--
-- Cria a RPC `find_matching_guests` que recebe um profile_id e devolve
-- guests não-claimados cujos campos batem (email, phone, nickname, name).
-- Usado pelo dialog pós-signup para sugerir reivindicação 1-clique e
-- também para notificar admins quando houver matches.
-- =====================================================================

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
    FROM public.profiles WHERE id = p_profile_id
  )
  SELECT
    g.id,
    g.display_name,
    g.nickname,
    g.name,
    g.email,
    g.phone,
    g.claim_code,
    (p.email IS NOT NULL AND lower(g.email) = p.email)                                    AS match_email,
    (p.phone IS NOT NULL AND nullif(regexp_replace(coalesce(g.phone,''),'\D','','g'),'') = p.phone) AS match_phone,
    (p.nickname IS NOT NULL AND lower(g.nickname) = p.nickname)                           AS match_nick,
    (p.name IS NOT NULL AND lower(g.name) = p.name)                                       AS match_name,
    -- score ponderado: email=4, phone=3, nick=2, name=1
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

-- =====================================================================
-- Notifica admins quando matches são detectados (chamado pelo cliente
-- logo após o signup). Usa insert_notifications já existente.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.notify_admins_guest_matches(
  p_profile_id uuid,
  p_ghost_ids  uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nick text;
  v_count int := COALESCE(array_length(p_ghost_ids, 1), 0);
BEGIN
  IF v_count = 0 THEN RETURN; END IF;

  SELECT nickname INTO v_nick FROM public.profiles WHERE id = p_profile_id;

  PERFORM public.insert_notifications(
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'user_id', ur.user_id,
              'type', 'guest_match_detected',
              'title', 'Possível convidado para vincular',
              'message', format(
                'O novo perfil "%s" tem %s convidado(s) com dados compatíveis. Verifique no painel de Vínculos.',
                COALESCE(v_nick, p_profile_id::text),
                v_count
              )
            )), '[]'::jsonb)
       FROM public.user_roles ur
      WHERE ur.role IN ('admin','super_admin'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_admins_guest_matches(uuid, uuid[]) TO authenticated;
