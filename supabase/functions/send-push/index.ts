import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_ids, title, message, url } = await req.json();

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

    const VAPID_PUBLIC_KEY = "BB_m3TYKSjGhWA4elVqQv93asd8y2w-Pz4V-KRYPXZdPkQGEq2tDJBcuq8csHEXqiKPWhKsz02KH-GbfPfzCbZg";

    // Fetch subscriptions for given users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", user_ids);

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, message, url: url || "/" });

    // Import web-push compatible functions
    const results = [];
    for (const sub of subscriptions) {
      try {
        // Use the Web Push protocol directly
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        // For Deno, we use a simple fetch to the push endpoint
        // This requires proper VAPID JWT signing
        const vapidJwt = await createVapidJwt(
          pushSubscription.endpoint,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY,
          "mailto:admin@azd.com.br"
        );

        const encrypted = await encryptPayload(
          payload,
          pushSubscription.keys.p256dh,
          pushSubscription.keys.auth
        );

        const response = await fetch(pushSubscription.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `vapid t=${vapidJwt.token}, k=${vapidJwt.publicKey}`,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": "86400",
          },
          body: encrypted,
        });

        if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          results.push({ endpoint: sub.endpoint, status: "expired_removed" });
        } else if (response.ok || response.status === 201) {
          results.push({ endpoint: sub.endpoint, status: "sent" });
        } else {
          const body = await response.text();
          results.push({ endpoint: sub.endpoint, status: `error_${response.status}`, body });
        }
      } catch (err) {
        results.push({ endpoint: sub.endpoint, status: `error: ${err.message}` });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.status === "sent").length, total: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// VAPID JWT creation for Web Push
async function createVapidJwt(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string
) {
  const origin = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: origin,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privKeyBytes = base64UrlToBytes(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: privateKey,
      x: publicKey.slice(0, 43),
      y: publicKey.slice(43),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigB64 = bytesToBase64Url(new Uint8Array(signature));
  return {
    token: `${unsignedToken}.${sigB64}`,
    publicKey,
  };
}

// AES128GCM encryption for Web Push payload
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKey);

  // Import subscriber's public key
  const subscriberPubKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(p256dhKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPubKey },
    localKeyPair.privateKey,
    256
  );

  const authBytes = base64UrlToBytes(authSecret);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prkSeed = await hmacSha256(authBytes, new Uint8Array(sharedSecret));

  // Key info
  const keyInfo = concatBytes(
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
  );
  const cekInfo = concatBytes(
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
  );

  // Derive CEK and nonce using HKDF
  const prk = await hmacSha256(salt, prkSeed);
  const cekBits = (await hmacSha256(prk, concatBytes(cekInfo, new Uint8Array([1]))))
    .slice(0, 16);
  const nonceBits = (await hmacSha256(prk, concatBytes(
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    new Uint8Array([1])
  ))).slice(0, 12);

  // Pad payload
  const paddedPayload = concatBytes(payloadBytes, new Uint8Array([2]));

  // Encrypt
  const key = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBits },
    key,
    paddedPayload
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concatBytes(
    salt,
    rs,
    new Uint8Array([65]),
    localPublicKeyBytes,
    new Uint8Array(encrypted)
  );
}

function base64UrlToBytes(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key,
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}
