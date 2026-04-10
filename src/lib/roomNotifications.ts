import { supabase } from "@/lib/supabaseExternal";

interface NotifyParams {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  roomId?: string;
}

export async function sendRoomNotifications({ userIds, type, title, message, roomId }: NotifyParams) {
  if (!userIds.length) return;
  const rows = userIds.map(uid => ({
    user_id: uid,
    type,
    title,
    message,
    room_id: roomId || null,
  }));
  await supabase.rpc("insert_notifications", { p_rows: rows } as any);

  // Also send push notifications via Lovable Cloud edge function
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const pushUrl = `${supabaseUrl}/functions/v1/send-push`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      await fetch(pushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_ids: userIds, title, message, url: roomId ? `/partidas` : "/" }),
      });
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
}
