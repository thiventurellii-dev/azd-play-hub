import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TopicCategory {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  position: number;
}

export interface CommunityTopic {
  id: string;
  community_id: string;
  category_id: string | null;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
  author?: { nickname: string | null; name: string; avatar_url: string | null };
  category?: { name: string; slug: string } | null;
  comments_count?: number;
}

export interface CommunityComment {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: { nickname: string | null; name: string; avatar_url: string | null };
}

export const useTopicCategories = (communityId?: string) =>
  useQuery({
    queryKey: ["topic-categories", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<TopicCategory[]> => {
      const { data } = await supabase
        .from("community_topic_categories" as any)
        .select("*")
        .eq("community_id", communityId!)
        .order("position", { ascending: true });
      return (data ?? []) as any[];
    },
  });

export const useCommunityTopics = (communityId?: string, categoryId?: string | null) =>
  useQuery({
    queryKey: ["community-topics", communityId, categoryId],
    enabled: !!communityId,
    queryFn: async (): Promise<CommunityTopic[]> => {
      let q: any = supabase
        .from("community_topics" as any)
        .select("*")
        .eq("community_id", communityId!)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data } = await q;
      const rows = (data ?? []) as any[];
      if (rows.length === 0) return [];

      const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
      const catIds = Array.from(new Set(rows.map((r) => r.category_id).filter(Boolean)));
      const topicIds = rows.map((r) => r.id);

      const [{ data: profiles }, { data: cats }, { data: counts }] = await Promise.all([
        supabase.rpc("get_public_profiles", { p_ids: authorIds }),
        catIds.length
          ? supabase.from("community_topic_categories" as any).select("id, name, slug").in("id", catIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("community_comments" as any)
          .select("topic_id")
          .in("topic_id", topicIds),
      ]);

      const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const cmap = new Map(((cats as any[]) ?? []).map((c: any) => [c.id, c]));
      const countMap = new Map<string, number>();
      ((counts as any[]) ?? []).forEach((c: any) => {
        countMap.set(c.topic_id, (countMap.get(c.topic_id) ?? 0) + 1);
      });

      return rows.map((r) => ({
        ...r,
        author: pmap.get(r.author_id),
        category: r.category_id ? cmap.get(r.category_id) : null,
        comments_count: countMap.get(r.id) ?? 0,
      }));
    },
  });

export const useTopicDetail = (topicId?: string) =>
  useQuery({
    queryKey: ["topic-detail", topicId],
    enabled: !!topicId,
    queryFn: async (): Promise<CommunityTopic | null> => {
      const { data } = await supabase
        .from("community_topics" as any)
        .select("*")
        .eq("id", topicId!)
        .maybeSingle();
      if (!data) return null;
      const t: any = data;
      const [{ data: profiles }, { data: cat }] = await Promise.all([
        supabase.rpc("get_public_profiles", { p_ids: [t.author_id] }),
        t.category_id
          ? supabase.from("community_topic_categories" as any).select("name, slug").eq("id", t.category_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        ...t,
        author: (profiles ?? [])[0],
        category: cat as any,
      };
    },
  });

export const useTopicComments = (topicId?: string) =>
  useQuery({
    queryKey: ["topic-comments", topicId],
    enabled: !!topicId,
    queryFn: async (): Promise<CommunityComment[]> => {
      const { data } = await supabase
        .from("community_comments" as any)
        .select("*")
        .eq("topic_id", topicId!)
        .order("created_at", { ascending: true });
      const rows = (data ?? []) as any[];
      if (rows.length === 0) return [];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: ids });
      const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, author: pmap.get(r.author_id) }));
    },
  });

export const useCreateTopic = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      community_id: string;
      category_id: string | null;
      title: string;
      body: string;
    }) => {
      if (!user?.id) throw new Error("Faça login");
      const { data, error } = await supabase
        .from("community_topics" as any)
        .insert({ ...input, author_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success("Tópico criado!");
      qc.invalidateQueries({ queryKey: ["community-topics", vars.community_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar tópico"),
  });
};

export const useCreateComment = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { topic_id: string; body: string }) => {
      if (!user?.id) throw new Error("Faça login");
      const { error } = await supabase
        .from("community_comments" as any)
        .insert({ ...input, author_id: user.id });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["topic-comments", vars.topic_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao comentar"),
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; topic_id: string }) => {
      const { error } = await supabase.from("community_comments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success("Comentário removido");
      qc.invalidateQueries({ queryKey: ["topic-comments", vars.topic_id] });
    },
  });
};

export const useUpdateTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string; pinned?: boolean; locked?: boolean; title?: string; body?: string }) => {
      const { error } = await supabase.from("community_topics" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["topic-detail", vars.id] });
      qc.invalidateQueries({ queryKey: ["community-topics"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });
};

export const useDeleteTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; community_id: string }) => {
      const { error } = await supabase.from("community_topics" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success("Tópico excluído");
      qc.invalidateQueries({ queryKey: ["community-topics", vars.community_id] });
    },
  });
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { community_id: string; name: string }) => {
      const slug = input.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const { error } = await supabase
        .from("community_topic_categories" as any)
        .insert({ community_id: input.community_id, name: input.name, slug });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success("Categoria criada");
      qc.invalidateQueries({ queryKey: ["topic-categories", vars.community_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar categoria"),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; community_id: string }) => {
      const { error } = await supabase
        .from("community_topic_categories" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success("Categoria removida");
      qc.invalidateQueries({ queryKey: ["topic-categories", vars.community_id] });
    },
  });
};
