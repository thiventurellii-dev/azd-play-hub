import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getAdminClient = () => {
  const url = Deno.env.get("EXTERNAL_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("External Supabase not configured");
  }

  return createClient(url, serviceRoleKey);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { roomId } = await req.json();

    if (!roomId) {
      return new Response(JSON.stringify({ error: "roomId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: room, error: roomError }, { data: roles, error: roleError }] = await Promise.all([
      supabase.from("match_rooms").select("id, created_by").eq("id", roomId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    if (roomError) {
      throw roomError;
    }

    if (roleError) {
      throw roleError;
    }

    if (!room) {
      return new Response(JSON.stringify({ error: "Sala não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = (roles ?? []).some(({ role }) => role === "admin" || role === "super_admin");

    if (room.created_by !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão para excluir esta sala" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanupResults = await Promise.all([
      supabase.from("notifications").delete().eq("room_id", roomId),
      supabase.from("match_room_comments").delete().eq("room_id", roomId),
      supabase.from("match_room_players").delete().eq("room_id", roomId),
      supabase.from("match_room_tag_links").delete().eq("room_id", roomId),
    ]);

    const cleanupError = cleanupResults.find(({ error }) => error)?.error;

    if (cleanupError) {
      throw cleanupError;
    }

    const { error: deleteError } = await supabase.from("match_rooms").delete().eq("id", roomId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});