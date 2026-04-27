import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FavoriteEntityType = "game" | "blood_script" | "rpg_adventure";

const cache = new Map<string, boolean>();
const listeners = new Map<string, Set<(v: boolean) => void>>();

const cacheKey = (userId: string, type: FavoriteEntityType, id: string) =>
  `${userId}:${type}:${id}`;

const notify = (key: string, value: boolean) => {
  cache.set(key, value);
  listeners.get(key)?.forEach((fn) => fn(value));
};

export function useFavorite(entityType: FavoriteEntityType, entityId?: string | null) {
  const { user } = useAuth();
  const key = user?.id && entityId ? cacheKey(user.id, entityType, entityId) : null;
  const [isFavorite, setIsFavorite] = useState<boolean>(key ? cache.get(key) ?? false : false);
  const [loading, setLoading] = useState(false);

  // Subscribe to cache changes
  useEffect(() => {
    if (!key) return;
    const set = listeners.get(key) ?? new Set();
    const fn = (v: boolean) => setIsFavorite(v);
    set.add(fn);
    listeners.set(key, set);
    return () => {
      set.delete(fn);
    };
  }, [key]);

  // Fetch initial state
  useEffect(() => {
    if (!user?.id || !entityId) return;
    if (cache.has(key!)) {
      setIsFavorite(cache.get(key!)!);
      return;
    }
    supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle()
      .then(({ data }) => notify(key!, !!data));
  }, [user?.id, entityType, entityId, key]);

  const toggle = useCallback(async () => {
    if (!user?.id) {
      toast.error("Faça login para favoritar");
      return;
    }
    if (!entityId || !key) return;
    setLoading(true);
    const next = !isFavorite;
    notify(key, next); // optimistic
    if (next) {
      const { error } = await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, entity_type: entityType, entity_id: entityId });
      if (error && !String(error.message).includes("duplicate")) {
        notify(key, false);
        toast.error("Não foi possível favoritar");
      } else {
        toast.success("Adicionado aos favoritos");
      }
    } else {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (error) {
        notify(key, true);
        toast.error("Não foi possível remover");
      } else {
        toast.success("Removido dos favoritos");
      }
    }
    setLoading(false);
  }, [user?.id, entityType, entityId, isFavorite, key]);

  return { isFavorite, toggle, loading, canFavorite: !!user };
}

export async function fetchUserFavorites(
  userId: string,
  entityType: FavoriteEntityType
): Promise<string[]> {
  const { data } = await supabase
    .from("user_favorites")
    .select("entity_id")
    .eq("user_id", userId)
    .eq("entity_type", entityType);
  return (data || []).map((r: any) => r.entity_id as string);
}
