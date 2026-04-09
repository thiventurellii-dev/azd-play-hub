import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

console.log("[push] v4 - crypto.subtle only");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BBn8rEHQqX2pP-_iJiV8w0EbIwK9QGbV_eVCy8_8T0jBAJNgyYc0pqRBs0RGH-lcMpDy74tH9Vpy-sJQ4DvdMwQ";

// --- Base64URL helpers ---

function b64url(data: Uint8Array): string {
  let b = "";
  for (const byte of data) b += String.fromCharCode(byte);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDec(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const len = bufs.reduce((s, b) => s + b.length, 0);
  const r = new Uint8Array(len);
  let o = 0;
  for (const b of bufs) { r.set(b, o); o += b.length; }
  return r;
}

function u16be(n: number): Uint8Array {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}

// --- VAPID JWT (ES256 via crypto.subtle) ---

async function createVapidJwt(audience: string, subject: string, privKeyD: string, pubKeyB64: string) {
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(enc.encode(JSON.stringify({ aud: audience, exp: now + 86400, sub: subject })));
  const unsigned = `${header}.${payload}`;

  // Extract x, y from uncompressed public key (65 bytes: 0x04 || x || y)
  const pubKeyBytes = b64urlDec(pubKeyB64);
  const x = b64url(pubKeyBytes.slice(1, 33));
  const y = b64url(pubKeyBytes.slice(33, 65));

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: privKeyD, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, enc.encode(unsigned)),
  );

  return `${unsigned}.${b64url(signature)}`;
}

// --- Web Push encryption (RFC 8291 - aesgcm, all crypto.subtle) ---

function createInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  return concat(
    enc.encode("Content-Encoding: "), enc.encode(type), new Uint8Array(1),
    enc.encode("P-256"), new Uint8Array(1),
    u16be(clientPub.length), clientPub,
    u16be(serverPub.length), serverPub,
  );
}

async function hkdfDerive(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

async function encryptPayload(clientPubB64: string, clientAuthB64: string, payloadStr: string) {
  const clientPub = b64urlDec(clientPubB64);
  const clientAuth = b64urlDec(clientAuthB64);

  // Generate ephemeral ECDH key pair
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  // Import client public key
  const clientKey = await crypto.subtle.importKey("raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // ECDH shared secret (x-coordinate, 32 bytes)
  const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, ephemeral.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(sharedSecret, clientAuth, "Content-Encoding: auth\0", 32)
  const ikm = await hkdfDerive(sharedSecret, clientAuth, new TextEncoder().encode("Content-Encoding: auth\0"), 32);

  // CEK = HKDF(ikm, salt, cekInfo, 16)
  const cekInfo = createInfo("aesgcm", clientPub, serverPubRaw);
  const cek = await hkdfDerive(ikm, salt, cekInfo, 16);

  // Nonce = HKDF(ikm, salt, nonceInfo, 12)
  const nonceInfo = createInfo("nonce", clientPub, serverPubRaw);
  const nonce = await hkdfDerive(ikm, salt, nonceInfo, 12);

  // AES-128-GCM encrypt (2-byte padding + payload)
  const plaintext = concat(new Uint8Array(2), new TextEncoder().encode(payloadStr));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  return { encrypted, serverPubKey: serverPubRaw, salt };
}

// --- Send Web Push ---

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPub: string,
  vapidPrivD: string,
) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJwt(audience, "mailto:admin@azd.com.br", vapidPrivD, vapidPub);
  const { encrypted, serverPubKey, salt } = await encryptPayload(sub.p256dh, sub.auth, payload);

  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      "TTL": "86400",
      "Authorization": `vapid t=${jwt}, k=${vapidPub}`,
      "Crypto-Key": `dh=${b64url(serverPubKey)}; p256ecdsa=${vapidPub}`,
      "Encryption": `salt=${b64url(salt)}`,
    },
    body: encrypted,
  });
}

// --- Supabase client (external) ---

function getExternalClient() {
  const url = Deno.env.get("EXTERNAL_SUPABASE_URL");
  const key = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("External Supabase not configured");
  return createClient(url, key);
}

// --- Edge function handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = getExternalClient();

    // --- SUBSCRIBE ---
    if (body.action === "subscribe") {
      const { user_id, subscription } = body;
      if (!user_id || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(JSON.stringify({ error: "Missing user_id or subscription data" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete old subs for this user
      await supabase.from("push_subscriptions").delete().eq("user_id", user_id);

      const { error } = await supabase.from("push_subscriptions").insert({
        user_id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });

      if (error) {
        console.error("[push] Subscribe insert error:", error);
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[push] Subscription saved for user:", user_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- UNSUBSCRIBE ---
    if (body.action === "unsubscribe") {
      const { user_id, endpoint } = body;
      const q = supabase.from("push_subscriptions").delete().eq("user_id", user_id);
      if (endpoint) q.eq("endpoint", endpoint);
      const { data, error } = await q.select();
      return new Response(JSON.stringify({ ok: true, deleted: data, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CLEANUP ---
    if (body.action === "cleanup") {
      const { data, error } = await supabase
        .from("push_subscriptions").delete().eq("user_id", body.user_id).select();
      return new Response(JSON.stringify({ deleted: data, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LIST ---
    if (body.action === "list") {
      const { data, error } = await supabase
        .from("push_subscriptions").select("id, user_id, endpoint, created_at").eq("user_id", body.user_id);
      return new Response(JSON.stringify({ subscriptions: data, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SEND (default) ---
    const { user_ids, title, message, url } = body;
    if (!user_ids || !Array.isArray(user_ids) || !title) {
      return new Response(JSON.stringify({ error: "Missing user_ids or title" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueIds = [...new Set(user_ids.filter(Boolean))];
    if (!uniqueIds.length) {
      return new Response(JSON.stringify({ sent: 0, total: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", uniqueIds);

    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subs?.length) {
      console.log("[push] No subscriptions for:", uniqueIds);
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[push] ${subs.length} subs for ${uniqueIds.length} users`);
    const payloadStr = JSON.stringify({ title, message, url: url || "/" });
    const results = [];

    for (const sub of subs) {
      try {
        const res = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payloadStr, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
        );
        const resBody = await res.text();

        if (res.ok) {
          results.push({ endpoint: sub.endpoint, status: "sent" });
          console.log(`[push] Sent to ${sub.id} (user ${sub.user_id})`);
        } else if (res.status === 410 || res.status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          results.push({ endpoint: sub.endpoint, status: "expired_removed" });
        } else {
          results.push({ endpoint: sub.endpoint, status: `error_${res.status}`, body: resBody });
          console.error(`[push] Error ${res.status}: ${resBody}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ endpoint: sub.endpoint, status: "error_exception", body: msg });
        console.error(`[push] Exception:`, msg);
      }
    }

    return new Response(JSON.stringify({
      sent: results.filter(r => r.status === "sent").length,
      total: results.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("[push] Fatal:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
