import { invokeEdgeFunction } from "@/lib/edgeFunctions";

const VAPID_PUBLIC_KEY = "BAITuvhF4Zt8W_01qOyLgbWdf6LK_9J3e7-3zNBpkrpiJaPLB52rXuJE2OJstrO_Ke35RJPpLo8At9OARus4_pQ";

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
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[push] Push not supported in this browser");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[push] Permission denied:", permission);
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.update();

    if (!registration.active) {
      console.warn("[push] Service Worker not active yet");
      return false;
    }

    console.log("[push] SW active:", registration.active.state);

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const subJson = subscription.toJSON();
    console.log("[push] Subscription created:", subJson.endpoint?.substring(0, 60));

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
      console.error("[push] Edge Function error:", error);
      return false;
    }

    if (!data?.ok) {
      console.error("[push] Edge Function returned not-ok:", data);
      return false;
    }

    console.log("[push] Subscription saved successfully");
    return true;
  } catch (err) {
    console.error("[push] Push subscribe error:", err);
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
