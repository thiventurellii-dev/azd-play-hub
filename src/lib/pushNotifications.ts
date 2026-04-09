import { invokeEdgeFunction } from "@/lib/edgeFunctions";

const VAPID_PUBLIC_KEY = "BBn8rEHQqX2pP-_iJiV8w0EbIwK9QGbV_eVCy8_8T0jBAJNgyYc0pqRBs0RGH-lcMpDy74tH9Vpy-sJQ4DvdMwQ";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
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

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    alert("Tamanho da chave: " + applicationServerKey.byteLength + " bytes (deve ser 65)");
    alert("Primeiro byte da chave: " + applicationServerKey[0]);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

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
    alert("Erro geral no push: " + (err?.message || String(err)));
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
