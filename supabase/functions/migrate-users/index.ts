import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Source (Lovable Cloud) - service role to list auth.users
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
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Destination (external Supabase)
    const EXTERNAL_URL = "https://npinawelxdtsrcvzzvvs.supabase.co";
    const EXTERNAL_SERVICE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const dstAdmin = createClient(EXTERNAL_URL, EXTERNAL_SERVICE_KEY);

    // Step 1: List all auth users from source
    const allUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data: { users: batch }, error } = await srcAdmin.auth.admin.listUsers({
        page, perPage: 100,
      });
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      allUsers.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    // Step 2: Get profiles and roles from source
    const { data: profiles } = await srcAdmin.from("profiles").select("*");
    const { data: roles } = await srcAdmin.from("user_roles").select("*");

    // Step 3: Create users in destination preserving UUIDs
    const results: any[] = [];
    for (const u of allUsers) {
      // Check if user already exists in destination
      const { data: existing } = await dstAdmin.auth.admin.getUserById(u.id);
      if (existing?.user) {
        results.push({ id: u.id, email: u.email, status: "already_exists" });
        continue;
      }

      const { data, error } = await dstAdmin.auth.admin.createUser({
        id: u.id,
        email: u.email,
        phone: u.phone || undefined,
        email_confirm: true,
        password: "AzD_TempPass_2025!",
        user_metadata: u.user_metadata || {},
      });

      if (error) {
        results.push({ id: u.id, email: u.email, status: "error", message: error.message });
      } else {
        results.push({ id: u.id, email: u.email, status: "created" });
      }
    }

    // Step 4: Insert profiles into destination
    const profileResults: any[] = [];
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        const { error } = await dstAdmin.from("profiles").upsert(p, { onConflict: "id" });
        profileResults.push({
          id: p.id,
          nickname: p.nickname,
          status: error ? "error" : "ok",
          message: error?.message,
        });
      }
    }

    // Step 5: Insert user_roles into destination
    const roleResults: any[] = [];
    if (roles && roles.length > 0) {
      for (const r of roles) {
        const { error } = await dstAdmin.from("user_roles").upsert(r, { onConflict: "id" });
        roleResults.push({
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          status: error ? "error" : "ok",
          message: error?.message,
        });
      }
    }

    return new Response(JSON.stringify({
      total_auth_users: allUsers.length,
      auth_results: results,
      profiles_migrated: profileResults.length,
      profile_results: profileResults,
      roles_migrated: roleResults.length,
      role_results: roleResults,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
