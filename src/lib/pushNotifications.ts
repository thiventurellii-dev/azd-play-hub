import { invokeEdgeFunction } from "@/lib/edgeFunctions";

const VAPID_PUBLIC_KEY = "BPC7GyQ6ieN_RfsSlzelZ5UhLUiH_Hpqb63DvdFr33ylN6yIL31WUf9z0lg2t5g9l3L4bUoYBgvatyoWNvMHQPQ";

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
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[push] Push not supported on this device/browser");
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log("[push] Notification permission:", permission);
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    console.log("[push] Service worker ready:", registration.scope);

    // Always unsubscribe first to ensure VAPID key matches
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
      console.log("[push] Unsubscribed old subscription to refresh VAPID key");
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();
    console.log("[push] Persisting subscription via edge function for user:", userId, Boolean(subJson.endpoint));

    // Save via edge function (uses service_role to bypass RLS)
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
      console.error("[push] Edge function subscribe error:", error);
      return false;
    }

    if (!data?.ok) {
      console.error("[push] Subscribe returned not ok:", data);
      return false;
    }

    console.log("[push] Subscription saved successfully via edge function");
    return true;
  } catch (err) {
    console.error("[push] Push subscription error:", err);
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
