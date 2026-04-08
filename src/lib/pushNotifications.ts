import { supabase } from "@/lib/supabaseExternal";

const VAPID_PUBLIC_KEY = "BB_m3TYKSjGhWA4elVqQv93asd8y2w-Pz4V-KRYPXZdPkQGEq2tDJBcuq8csHEXqiKPWhKsz02KH-GbfPfzCbZg";

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

    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription = existingSubscription ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();
    console.log("[push] Persisting subscription for user:", userId, Boolean(subJson.endpoint));
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("[push] Error saving push subscription:", error);
      return false;
    }

    console.log("[push] Subscription saved successfully");
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
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
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
