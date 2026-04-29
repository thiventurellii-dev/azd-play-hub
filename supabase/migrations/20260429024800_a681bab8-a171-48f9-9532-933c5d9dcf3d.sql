CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'players', (SELECT count(*) FROM public.profiles),
    'matches', (SELECT count(*) FROM public.matches) + (SELECT count(*) FROM public.blood_matches),
    'seasons', (SELECT count(*) FROM public.seasons),
    'games', (SELECT count(*) FROM public.games)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated;