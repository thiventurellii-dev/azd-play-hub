import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Web Push implementation using Web Crypto API (Deno-compatible) ---

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

async function createVapidJwt(audience: string, subject: string, privateKeyB64: string, publicKeyB64: string): Promise<{ token: string; publicKey: string }> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 86400,
    sub: subject,
  })));
  const unsignedToken = `${header}.${payload}`;

  // Import the private key
  const privateKeyRaw = base64UrlDecode(privateKeyB64);
  const publicKeyRaw = base64UrlDecode(publicKeyB64);

  // Build JWK from raw keys
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicKeyRaw.slice(1, 33)),
    y: base64UrlEncode(publicKeyRaw.slice(33, 65)),
    d: base64UrlEncode(privateKeyRaw),
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsignedToken)));

  // Convert from DER-like to raw r||s format (Web Crypto returns raw r||s for P-256)
  const token = `${unsignedToken}.${base64UrlEncode(signature)}`;
  return { token, publicKey: base64UrlEncode(publicKeyRaw) };
}

async function hkdfSha256(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt.length ? salt : new Uint8Array(32)));

  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = concatBuffers(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const padding = new Uint8Array(1); // null byte

  const clientLen = new Uint8Array(2);
  new DataView(clientLen.buffer).setUint16(0, clientPublicKey.length);
  const serverLen = new Uint8Array(2);
  new DataView(serverLen.buffer).setUint16(0, serverPublicKey.length);

  return concatBuffers(
    encoder.encode("Content-Encoding: "),
    typeBytes,
    padding,
    encoder.encode("P-256"),
    padding,
    clientLen,
    clientPublicKey,
    serverLen,
    serverPublicKey,
  );
}

async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: string,
): Promise<{ encrypted: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  const clientPublicKey = base64UrlDecode(clientPublicKeyB64);
  const clientAuth = base64UrlDecode(clientAuthB64);

  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  // Import client public key
  const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // Derive shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeys.privateKey, 256));

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive PRK using auth secret
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prkCombine = await hkdfSha256(sharedSecret, clientAuth, authInfo, 32);

  // Derive content encryption key
  const cekInfo = createInfo("aesgcm", clientPublicKey, serverPublicKeyRaw);
  const contentEncryptionKey = await hkdfSha256(prkCombine, salt, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo("nonce", clientPublicKey, serverPublicKeyRaw);
  const nonce = await hkdfSha256(prkCombine, salt, nonceInfo, 12);

  // Encrypt with AES-GCM (add 2-byte padding)
  const paddingBytes = new Uint8Array(2); // 0x0000
  const payloadBytes = new TextEncoder().encode(payload);
  const plaintext = concatBuffers(paddingBytes, payloadBytes);

  const aesKey = await crypto.subtle.importKey("raw", contentEncryptionKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  return { encrypted, serverPublicKey: serverPublicKeyRaw, salt };
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const { token } = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
  const { encrypted, serverPublicKey, salt } = await encryptPayload(subscription.p256dh, subscription.auth, payload);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      "TTL": "86400",
      "Authorization": `vapid t=${token}, k=${base64UrlEncode(serverPublicKey)}`,
      "Crypto-Key": `dh=${base64UrlEncode(serverPublicKey)}; p256ecdsa=${vapidPublicKey}`,
      "Encryption": `salt=${base64UrlEncode(salt)}`,
    },
    body: encrypted,
  });

  return response;
}

// --- Edge function handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!externalUrl || !externalKey) {
      console.error("[push] Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "External Supabase not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(externalUrl, externalKey);
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

    const VAPID_PUBLIC_KEY = "BDvO-hihQiLKKw-Sow1uKEU8H0Gm3_SbHdJaE5jjJNoKmrCI-Wjln5ZFswF9ohfTu5_yyh2H7-TfN09qT63EF8s";

    const uniqueUserIds = [...new Set(user_ids.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const payloadStr = JSON.stringify({ title, message, url: url || "/" });
    const results = [];

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payloadStr,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY,
          "mailto:admin@azd.com.br",
        );

        const responseBody = await response.text();

        if (response.ok) {
          results.push({ endpoint: sub.endpoint, status: "sent" });
          console.log(`[push] Sent to subscription ${sub.id} (user ${sub.user_id})`);
        } else if (response.status === 410 || response.status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          results.push({ endpoint: sub.endpoint, status: "expired_removed" });
          console.log(`[push] Removed expired subscription ${sub.id}`);
        } else {
          results.push({ endpoint: sub.endpoint, status: `error_${response.status}`, body: responseBody });
          console.error(`[push] Delivery error for ${sub.endpoint}: ${response.status} ${responseBody}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown push error";
        results.push({ endpoint: sub.endpoint, status: "error_exception", body: message });
        console.error(`[push] Exception sending to ${sub.endpoint}:`, message);
      }
    }

    return new Response(JSON.stringify({
      sent: results.filter(r => r.status === "sent").length,
      total: results.length,
      results,
    }), {
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
