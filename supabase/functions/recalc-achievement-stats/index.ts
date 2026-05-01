// Recalculates achievement_community_stats for all active templates.
// Runs on the EXTERNAL Supabase instance (data source). Called by daily cron at 04:00 BRT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const key = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: "Missing EXTERNAL_SUPABASE_URL/SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const sb = createClient(url, key);

    // Total eligible by scope type
    const { count: globalEligible } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // Pre-compute eligibility maps
    const eligibleByGame = new Map<string, number>();
    {
      const { data } = await sb
        .from("match_results")
        .select("player_id, matches!inner(game_id)")
        .not("player_id", "is", null);
      const seen = new Set<string>();
      for (const r of (data ?? []) as any[]) {
        const gid = r.matches?.game_id;
        if (!gid || !r.player_id) continue;
        const k = `${gid}::${r.player_id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        eligibleByGame.set(gid, (eligibleByGame.get(gid) ?? 0) + 1);
      }
    }

    const eligibleBySeason = new Map<string, number>();
    {
      const { data } = await sb
        .from("match_results")
        .select("player_id, matches!inner(season_id)")
        .not("player_id", "is", null);
      const seen = new Set<string>();
      for (const r of (data ?? []) as any[]) {
        const sid = r.matches?.season_id;
        if (!sid || !r.player_id) continue;
        const k = `${sid}::${r.player_id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        eligibleBySeason.set(sid, (eligibleBySeason.get(sid) ?? 0) + 1);
      }
    }

    // Active templates
    const { data: templates } = await sb
      .from("achievement_templates")
      .select("id, scope_type")
      .eq("is_active", true);

    // Aggregate unlocks: count distinct players per (template_id, scope_id)
    const { data: pa } = await sb
      .from("player_achievements")
      .select("achievement_template_id, scope_type, scope_id, player_profile_id")
      .eq("status", "approved");

    type Bucket = { template_id: string; scope_type: string; scope_id: string | null; players: Set<string> };
    const buckets = new Map<string, Bucket>();
    const k = (a: string, b: string, c: string | null) => `${a}::${b}::${c ?? "_"}`;
    for (const r of (pa ?? []) as any[]) {
      const key = k(r.achievement_template_id, r.scope_type, r.scope_id);
      const b = buckets.get(key) ?? {
        template_id: r.achievement_template_id,
        scope_type: r.scope_type,
        scope_id: r.scope_id,
        players: new Set<string>(),
      };
      b.players.add(r.player_profile_id);
      buckets.set(key, b);
    }

    const tplMap = new Map<string, string>(); // id -> scope_type
    for (const t of (templates ?? []) as any[]) tplMap.set(t.id, t.scope_type);

    const upserts: any[] = [];
    for (const b of buckets.values()) {
      let eligible = 0;
      if (b.scope_type === "global") eligible = globalEligible ?? 0;
      else if (b.scope_type === "game") eligible = eligibleByGame.get(b.scope_id ?? "") ?? 0;
      else if (b.scope_type === "season") eligible = eligibleBySeason.get(b.scope_id ?? "") ?? 0;
      else eligible = Math.max(b.players.size, 1);
      const unlocked = b.players.size;
      const pct = eligible > 0 ? Math.round((unlocked / eligible) * 1000) / 10 : 0;
      upserts.push({
        achievement_template_id: b.template_id,
        scope_type: b.scope_type,
        scope_id: b.scope_id,
        unlocked_count: unlocked,
        total_eligible_players: eligible,
        community_percentage: pct,
        last_calculated_at: new Date().toISOString(),
      });
    }

    if (upserts.length > 0) {
      // Split into scoped vs global to match the partial unique indexes
      const scoped = upserts.filter((u) => u.scope_id !== null);
      const global = upserts.filter((u) => u.scope_id === null);
      if (scoped.length > 0) {
        await sb.from("achievement_community_stats").upsert(scoped, {
          onConflict: "achievement_template_id,scope_type,scope_id",
        });
      }
      if (global.length > 0) {
        await sb.from("achievement_community_stats").upsert(global, {
          onConflict: "achievement_template_id,scope_type",
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, recalculated: upserts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
