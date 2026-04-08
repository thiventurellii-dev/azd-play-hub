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
  await supabase.from("notifications").insert(rows);

  // Also send push notifications
  try {
    await supabase.functions.invoke("send-push", {
      body: { user_ids: userIds, title, message, url: roomId ? `/partidas` : "/" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
  }
}
