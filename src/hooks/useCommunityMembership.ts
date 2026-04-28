import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export type MembershipState =
  | { status: "none" }
  | { status: "pending"; requestId?: string }
  | { status: "active"; role: "leader" | "moderator" | "member"; memberId: string }
  | { status: "banned" };

export const useCommunityMembership = (
  communityId?: string,
  joinPolicy: "open" | "approval" | "invite_only" = "open"
) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<MembershipState>({ status: "none" });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id || !communityId) {
      setState({ status: "none" });
      return;
    }
    const { data: member } = await supabase
      .from("community_members" as any)
      .select("id, role, status")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();
    const m: any = member;
    if (m) {
      if (m.status === "active") {
        setState({ status: "active", role: m.role, memberId: m.id });
      } else if (m.status === "banned") {
        setState({ status: "banned" });
      }
      return;
    }
    const { data: req } = await supabase
      .from("community_join_requests" as any)
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (req) setState({ status: "pending", requestId: (req as any).id });
    else setState({ status: "none" });
  }, [user?.id, communityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const join = useCallback(async () => {
    if (!user?.id || !communityId) {
      toast.error("Faça login para entrar");
      return;
    }
    setLoading(true);
    if (joinPolicy === "open") {
      const { error } = await supabase
        .from("community_members" as any)
        .insert({ community_id: communityId, user_id: user.id, role: "member", status: "active" });
      if (error) toast.error("Não foi possível entrar");
      else toast.success("Você entrou na comunidade!");
    } else if (joinPolicy === "approval") {
      const { error } = await supabase
        .from("community_join_requests" as any)
        .insert({ community_id: communityId, user_id: user.id });
      if (error) toast.error("Não foi possível enviar pedido");
      else toast.success("Pedido enviado!");
    } else {
      toast.info("Esta comunidade é apenas por convite");
    }
    await refresh();
    qc.invalidateQueries({ queryKey: ["community-detail"] });
    setLoading(false);
  }, [user?.id, communityId, joinPolicy, refresh, qc]);

  const leave = useCallback(async () => {
    if (!user?.id || !communityId) return;
    setLoading(true);
    await supabase
      .from("community_members" as any)
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", user.id);
    toast.success("Você saiu da comunidade");
    await refresh();
    qc.invalidateQueries({ queryKey: ["community-detail"] });
    setLoading(false);
  }, [user?.id, communityId, refresh, qc]);

  return { state, loading, join, leave, refresh };
};
