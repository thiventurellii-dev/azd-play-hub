
-- Fix: recreate view with security_invoker = on
DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, name, nickname, avatar_url, city, state, status, created_at, steam_id
FROM public.profiles;

-- The view uses security_invoker, so it respects the caller's RLS.
-- But we need unauthenticated/other users to read public profile data.
-- Add a SELECT policy that allows all authenticated to read basic fields.
-- Since we can't do column-level RLS, we need a different approach:
-- Allow all authenticated to SELECT from profiles (the view restricts columns)
-- But this defeats the purpose... 

-- Better approach: use a SECURITY DEFINER function instead of a view
DROP VIEW IF EXISTS public.profiles_public;

-- Create a SECURITY DEFINER function that returns only public profile fields
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_ids uuid[] DEFAULT NULL)
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
  WHERE (p_ids IS NULL OR p.id = ANY(p_ids));
$$;
