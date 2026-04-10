import { supabase } from "@/lib/supabaseExternal";

export interface PublicProfile {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  status: string;
  created_at: string;
  steam_id: string | null;
}

/**
 * Fetch public profile data (non-sensitive fields only) via SECURITY DEFINER function.
 * Use this for reading OTHER users' profiles. For own profile, query `profiles` directly.
 */
export async function fetchPublicProfiles(ids?: string[]): Promise<PublicProfile[]> {
  const { data, error } = await supabase.rpc("get_public_profiles", {
    p_ids: ids || null,
    p_nickname: null,
  } as any);
  if (error) {
    console.error("Error fetching public profiles:", error);
    return [];
  }
  return (data || []) as PublicProfile[];
}

/**
 * Fetch a public profile by nickname.
 */
export async function fetchPublicProfileByNickname(nickname: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc("get_public_profiles", {
    p_ids: null,
    p_nickname: nickname,
  } as any);
  if (error) {
    console.error("Error fetching public profile by nickname:", error);
    return null;
  }
  return (data as PublicProfile[])?.[0] || null;
}

/**
 * Fetch a single public profile by ID.
 */
export async function fetchPublicProfile(id: string): Promise<PublicProfile | null> {
  const results = await fetchPublicProfiles([id]);
  return results[0] || null;
}
