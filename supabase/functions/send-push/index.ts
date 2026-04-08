import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const supabaseKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[push] Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_ids, title, message, url } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || !title) {
      return new Response(JSON.stringify({ error: "Missing user_ids or title" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!VAPID_PRIVATE_KEY) {
      console.error("[push] VAPID_PRIVATE_KEY not configured");
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VAPID_PUBLIC_KEY = "BBww_Uz90ojQIHFxPYEzWTWylKEdvkyrDBG9k7fGLntBOfY09on0vg-GKHbMstB94TSasDvl4twvxkGbEjJ6wac";
    webpush.setVapidDetails("mailto:admin@azd.com.br", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const uniqueUserIds = [...new Set(user_ids.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscriptions for given users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", uniqueUserIds);

    if (subError) {
      console.error("[push] Error fetching subscriptions:", subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[push] No push subscriptions found for user_ids:", uniqueUserIds);
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[push] Found ${subscriptions.length} subscriptions for ${uniqueUserIds.length} users`);

    const payload = JSON.stringify({ title, message, url: url || "/" });

    const results = [];
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        await webpush.sendNotification(pushSubscription, payload, { TTL: 86400 });
        results.push({ endpoint: sub.endpoint, status: "sent" });
        console.log(`[push] Sent to subscription ${sub.id} (user ${sub.user_id})`);
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number; status?: number; body?: string; message?: string };
        const statusCode = pushError.statusCode || pushError.status || 0;
        const errorBody = pushError.body || pushError.message || "Unknown push error";

        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          results.push({ endpoint: sub.endpoint, status: "expired_removed" });
          console.log(`[push] Removed expired subscription ${sub.id}`);
        } else {
          results.push({ endpoint: sub.endpoint, status: `error_${statusCode || 'unknown'}`, body: errorBody });
          console.error(`[push] Delivery error for ${sub.endpoint}:`, errorBody);
        }
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.status === "sent").length, total: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal push error";
    console.error("[push] send-push error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
