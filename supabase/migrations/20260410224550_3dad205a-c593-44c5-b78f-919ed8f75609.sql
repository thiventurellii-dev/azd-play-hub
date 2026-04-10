
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_ids uuid[] DEFAULT NULL, p_nickname text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  nickname text,
  avatar_url text,
  city text,
  state text,
  status text,
  created_at timestamptz,
  steam_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.nickname, p.avatar_url, p.city, p.state, p.status, p.created_at, p.steam_id
  FROM public.profiles p
  WHERE (p_ids IS NULL OR p.id = ANY(p_ids))
    AND (p_nickname IS NULL OR p.nickname = p_nickname);
$$;
