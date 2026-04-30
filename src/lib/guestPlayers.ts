import { supabase } from "@/lib/supabaseExternal";

export interface GuestPlayer {
  id: string;
  nickname: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  claim_token: string;
  claimed_by_user_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GuestInput {
  nickname: string;
  name?: string;
  email?: string;
  phone?: string;
  country_code?: string;
}

/**
 * Lista guests não-claimados (para autocomplete + admin).
 */
export async function fetchUnclaimedGuests(): Promise<GuestPlayer[]> {
  const { data, error } = await supabase
    .from("ghost_players")
    .select("id, nickname, name, email, phone, country_code, claim_token, claimed_by_user_id, created_by, created_at")
    .is("claimed_by_user_id", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchUnclaimedGuests error:", error);
    return [];
  }
  return (data || []) as GuestPlayer[];
}

/**
 * Cria um novo PlayerProfile guest (ghost_player).
 * Apenas nickname é obrigatório.
 */
export async function createGuestPlayer(input: GuestInput, createdBy?: string | null): Promise<GuestPlayer | null> {
  const trimmed = input.nickname.trim();
  if (!trimmed) throw new Error("Nick é obrigatório");

  const payload: any = {
    nickname: trimmed,
    display_name: trimmed,
    name: input.name?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    country_code: input.country_code || "+55",
    created_by: createdBy || null,
  };

  const { data, error } = await supabase
    .from("ghost_players")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as GuestPlayer;
}

/**
 * Gera URL pública para reivindicar o perfil.
 */
export function buildClaimUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/claim/${token}`;
}
