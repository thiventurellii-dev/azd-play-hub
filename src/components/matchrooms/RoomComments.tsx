import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profile?: { name: string; nickname: string | null };
}

interface Props {
  roomId: string;
  expanded: boolean;
}

const RoomComments = ({ roomId, expanded }: Props) => {
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

    const poll = setInterval(fetchComments, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [roomId]);

  useEffect(() => {
    if (expanded) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, expanded]);

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
    setComments(prev => prev.filter(c => c.id !== commentId));
    await supabase.from("match_room_comments").delete().eq("id", commentId);
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const visibleComments = expanded ? comments : comments.slice(-3);

  return (
    <div className="pt-2">
      {visibleComments.length > 0 ? (
        <div className={expanded ? "max-h-60 overflow-y-auto mb-2 pr-1" : "mb-2"}>
          <div className="space-y-1.5 pr-2">
            {!expanded && comments.length > 3 && (
              <p className="text-[10px] text-muted-foreground">... {comments.length - 3} comentário(s) anterior(es)</p>
            )}
            {visibleComments.map(c => (
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
      ) : (
        <p className="text-[10px] text-muted-foreground mb-2">Nenhum comentário ainda</p>
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
