import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profile?: { name: string; nickname: string | null };
}

interface Props {
  roomId: string;
}

const RoomComments = ({ roomId }: Props) => {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("match_room_comments")
      .select("id, text, created_at, user_id")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (!data) return;

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, nickname")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    setComments(data.map(c => ({
      ...c,
      profile: profileMap.get(c.user_id) as Comment["profile"],
    })));
  };

  useEffect(() => {
    fetchComments();

    const channelId = `room-comments-${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "match_room_comments",
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();

    // Polling fallback every 15s
    const poll = setInterval(fetchComments, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    await supabase.from("match_room_comments").insert({
      room_id: roomId,
      user_id: user.id,
      text: text.trim(),
    });
    setText("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (commentId: string) => {
    // Optimistic delete
    setComments(prev => prev.filter(c => c.id !== commentId));
    await supabase.from("match_room_comments").delete().eq("id", commentId);
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <MessageCircle className="h-3 w-3" /> Comentários ({comments.length})
      </p>

      {comments.length > 0 && (
        <div className="max-h-60 overflow-y-auto mb-2 pr-1">
          <div className="space-y-1.5 pr-2">
            {comments.map(c => (
              <div key={c.id} className="text-xs group/comment flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gold">
                    {c.profile?.nickname || c.profile?.name || "Jogador"}
                  </span>
                  <span className="text-muted-foreground ml-1">{formatTime(c.created_at)}</span>
                  <p className="text-foreground">{c.text}</p>
                </div>
                {user && (c.user_id === user.id || isAdmin) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover/comment:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>
      )}

      {user && (
        <div className="flex gap-1.5">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Comentar..."
            className="h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleSend}
            disabled={sending || !text.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoomComments;
