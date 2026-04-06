/**
 * Sends a match notification webhook payload.
 * Currently logs to console — ready to plug into a real API (Discord, etc.)
 */
export interface MatchWebhookPayload {
  event: "match_created" | "match_updated" | "player_joined" | "player_left";
  room_id: string;
  game: string;
  title: string;
  scheduled_at: string;
  max_players: number;
  players: string[];
  created_by: string;
}

export function sendMatchNotification(payload: MatchWebhookPayload) {
  console.log("[MatchWebhook] Payload pronto para integração:", JSON.stringify(payload, null, 2));
}

/**
 * Generates a WhatsApp invite link with formatted message
 */
export function generateWhatsAppInvite(
  title: string,
  gameName: string,
  scheduledAt: string,
  roomUrl: string,
  confirmedPlayers?: string[]
): string {
  const date = new Date(scheduledAt);
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let message = `\u{1F3B2} *${title}*\n\n\u{1F3AE} Jogo: ${gameName}\n\u{1F4C5} Data: ${formatted}`;
  if (confirmedPlayers && confirmedPlayers.length > 0) {
    message += `\n\n\u2705 Confirmados: ${confirmedPlayers.join(", ")}`;
  }
  message += `\n\n\u{1F449} Entre na sala: ${roomUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
