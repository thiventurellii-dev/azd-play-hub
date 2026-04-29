-- Cria/atualiza a função get_landing_stats no banco EXTERNO
-- (npinawelxdtsrcvzzvvs). Rode no SQL Editor do projeto externo.

CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'players', (SELECT count(*) FROM public.profiles WHERE COALESCE(status,'active') <> 'disabled'),
    'matches', (SELECT count(*) FROM public.matches) + (SELECT count(*) FROM public.blood_matches),
    'seasons', (SELECT count(*) FROM public.seasons),
    'games',   (SELECT count(*) FROM public.games)
  );
$$;

-- Permite chamada anônima (landing page é pública)
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated;
