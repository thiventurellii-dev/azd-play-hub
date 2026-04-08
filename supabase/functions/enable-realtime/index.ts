import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!externalUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing external Supabase config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(externalUrl, serviceRoleKey, {
      db: { schema: "public" },
    });

    const tables = [
      "match_rooms",
      "match_room_players",
      "match_room_comments",
      "notifications",
      "friendships",
      "profiles",
      "matches",
      "match_results",
    ];

    const results: Record<string, string> = {};

    for (const table of tables) {
      const { error } = await supabase.rpc("enable_realtime_for_table", { table_name: table });
      if (error) {
        // Try direct SQL via REST
        results[table] = error.message;
      } else {
        results[table] = "ok";
      }
    }

    return new Response(JSON.stringify({ message: "Realtime enable attempted", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
