import { useEffect } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";

const REQUIRED_FIELDS = [
  "name",
  "nickname",
  "phone",
  "state",
  "city",
  "birth_date",
  "gender",
  "pronouns",
  "avatar_url",
];

/**
 * Detecta perfil 100% completo e dispara award_profile_completion_xp (RPC idempotente).
 * Chamada uma única vez ao montar/usuário pronto.
 */
export const useProfileCompletion = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, nickname, phone, state, city, birth_date, gender, pronouns, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const complete = REQUIRED_FIELDS.every((f) => {
        const v = (data as any)[f];
        return v !== null && v !== undefined && String(v).trim() !== "";
      });
      if (complete) {
        await supabase.rpc("award_profile_completion_xp" as any);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
};
