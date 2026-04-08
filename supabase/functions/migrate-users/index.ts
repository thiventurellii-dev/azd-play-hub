import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const srcAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await srcAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleCheck } = await srcAdmin
      .from("user_roles").select("role")
      .eq("user_id", user.id).in("role", ["admin", "super_admin"]).maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { step } = await req.json();
    const EXTERNAL_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const EXTERNAL_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const dstAdmin = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    if (step === "auth") {
      // Step 1: Migrate auth.users
      const allUsers: any[] = [];
      let page = 1;
      while (true) {
        const { data: { users: batch }, error } = await srcAdmin.auth.admin.listUsers({ page, perPage: 50 });
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        allUsers.push(...batch);
        if (batch.length < 50) break;
        page++;
      }

      const results: any[] = [];
      for (const u of allUsers) {
        const { data: existing } = await dstAdmin.auth.admin.getUserById(u.id);
        if (existing?.user) {
          results.push({ email: u.email, status: "exists" });
          continue;
        }
        const { data, error } = await dstAdmin.auth.admin.createUser({
          id: u.id, email: u.email, phone: u.phone || undefined,
          email_confirm: true, password: "AzD_TempPass_2025!",
          user_metadata: u.user_metadata || {},
        });
        results.push({ email: u.email, status: error ? `error: ${error.message}` : "created" });
      }
      return new Response(JSON.stringify({ total: allUsers.length, results }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "profiles") {
      const { data: profiles } = await srcAdmin.from("profiles").select("*");
      const results: any[] = [];
      for (const p of profiles || []) {
        const { error } = await dstAdmin.from("profiles").upsert(p, { onConflict: "id" });
        results.push({ id: p.id, nick: p.nickname, status: error ? `error: ${error.message}` : "ok" });
      }
      return new Response(JSON.stringify({ total: results.length, results }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "roles") {
      const { data: roles } = await srcAdmin.from("user_roles").select("*");
      const results: any[] = [];
      for (const r of roles || []) {
        const { error } = await dstAdmin.from("user_roles").upsert(r, { onConflict: "id" });
        results.push({ user_id: r.user_id, role: r.role, status: error ? `error: ${error.message}` : "ok" });
      }
      return new Response(JSON.stringify({ total: results.length, results }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "social") {
      // friendships, notifications, activity_logs
      const { data: friendships } = await srcAdmin.from("friendships").select("*");
      const { data: notifications } = await srcAdmin.from("notifications").select("*");
      const { data: logs } = await srcAdmin.from("activity_logs").select("*");

      const fRes: any[] = [];
      for (const f of friendships || []) {
        const { error } = await dstAdmin.from("friendships").upsert(f, { onConflict: "id" });
        fRes.push({ id: f.id, status: error ? `error: ${error.message}` : "ok" });
      }
      const nRes: any[] = [];
      for (const n of notifications || []) {
        const { error } = await dstAdmin.from("notifications").upsert(n, { onConflict: "id" });
        nRes.push({ id: n.id, status: error ? `error: ${error.message}` : "ok" });
      }
      const lRes: any[] = [];
      for (const l of logs || []) {
        const { error } = await dstAdmin.from("activity_logs").upsert(l, { onConflict: "id" });
        lRes.push({ id: l.id, status: error ? `error: ${error.message}` : "ok" });
      }

      return new Response(JSON.stringify({
        friendships: { total: fRes.length, results: fRes },
        notifications: { total: nRes.length, results: nRes },
        activity_logs: { total: lRes.length, results: lRes },
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid step. Use: auth, profiles, roles, social" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
