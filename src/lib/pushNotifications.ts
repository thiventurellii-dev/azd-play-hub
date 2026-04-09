import { invokeEdgeFunction } from "@/lib/edgeFunctions";

const VAPID_PUBLIC_KEY = "BAITuvhF4Zt8W_01qOyLgbWdf6LK_9J3e7-3zNBpkrpiJaPLB52rXuJE2OJstrO_Ke35RJPpLo8At9OARus4_pQ";
const VAPID_PUBLIC_KEY_BYTES = new Uint8Array([4, 2, 19, 186, 248, 69, 225, 155, 124, 91, 253, 53, 168, 236, 139, 129, 181, 157, 127, 162, 202, 255, 210, 119, 123, 191, 183, 204, 208, 105, 146, 186, 98, 37, 163, 203, 7, 157, 171, 94, 226, 68, 216, 226, 108, 182, 179, 191, 41, 237, 249, 68, 147, 233, 46, 143, 0, 183, 211, 128, 70, 235, 56, 254, 148]);

function urlBase64ToUint8Array(base64String: string) {
  const cleaned = base64String.trim().replace(/\s+/g, "").replace(/=+$/g, "");
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    alert("Iniciando subscrição push...\nuser_id recebido: " + userId);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push não suportado neste navegador");
      return false;
    }

    const permission = await Notification.requestPermission();
    alert("Status da permissão: " + permission);
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    await registration.update();

    if (!registration.active) {
      alert("Service Worker ainda não está ativo. Aguarde um segundo.");
      return false;
    }

    alert("SW ativo: " + registration.active.state + "\nSW scriptURL: " + registration.active.scriptURL);
    alert("registration.active existe: " + String(!!registration.active));

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    try {
      const sanitySubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
      });
      alert("Sanity check sem chave: subscribe funcionou inesperadamente.");
      await sanitySubscription.unsubscribe();
    } catch (sanityError: any) {
      alert(
        "Sanity check sem chave:\n" +
          JSON.stringify({
            name: sanityError?.name || null,
            message: sanityError?.message || String(sanityError),
          })
      );
    }

    alert("VAPID_PUBLIC_KEY intacta: " + VAPID_PUBLIC_KEY);
    alert("Tamanho da chave hardcoded: " + VAPID_PUBLIC_KEY_BYTES.byteLength + " bytes (deve ser 65)");
    alert("Primeiro byte da chave hardcoded: " + VAPID_PUBLIC_KEY_BYTES[0]);

    let subscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY_BYTES,
      });
    } catch (subscribeError: any) {
      alert(
        "Erro detalhado no subscribe:\n" +
          JSON.stringify({
            name: subscribeError?.name || null,
            message: subscribeError?.message || String(subscribeError),
          })
      );
      throw subscribeError;
    }

    const subJson = subscription.toJSON();
    alert("Subscription criada!\nEndpoint: " + (subJson.endpoint || "").substring(0, 60) + "...");

    try {
      const { data, error } = await invokeEdgeFunction("send-push", {
        action: "subscribe",
        user_id: userId,
        subscription: {
          endpoint: subJson.endpoint!,
          keys: {
            p256dh: subJson.keys!.p256dh!,
            auth: subJson.keys!.auth!,
          },
        },
      });

      if (error) {
        alert("Erro na Edge Function: " + JSON.stringify(error));
        return false;
      }

      if (!data?.ok) {
        alert("Edge Function retornou não-ok: " + JSON.stringify(data));
        return false;
      }

      alert("✅ Subscription salva com sucesso!");
      return true;
    } catch (efError: any) {
      alert("Erro na Edge Function: " + (efError?.message || String(efError)));
      return false;
    }
  } catch (err: any) {
    alert(
      "Erro geral no push:\n" +
        JSON.stringify({
          name: err?.name || null,
          message: err?.message || String(err),
        })
    );
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await invokeEdgeFunction("send-push", {
        action: "unsubscribe",
        user_id: userId,
        endpoint,
      });
    }
  } catch (err) {
    console.error("[push] Push unsubscribe error:", err);
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
