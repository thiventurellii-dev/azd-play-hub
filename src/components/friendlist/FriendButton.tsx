import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  targetUserId: string;
  size?: "sm" | "default";
}

type FriendStatus = "none" | "pending_sent" | "pending_received" | "accepted";

const FriendButton = ({ targetUserId, size = "sm" }: Props) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<FriendStatus>("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.id === targetUserId) return;
    fetchStatus();
  }, [user, targetUserId]);

  const fetchStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);

    if (data && data.length > 0) {
      const f = data[0];
      setFriendshipId(f.id);
      if (f.status === "accepted") {
        setStatus("accepted");
      } else if (f.user_id === user.id) {
        setStatus("pending_sent");
      } else {
        setStatus("pending_received");
      }
    } else {
      setStatus("none");
      setFriendshipId(null);
    }
  };

  const handleAdd = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: "pending",
    });
    if (error) {
      toast.error("Erro ao enviar solicitação");
    } else {
      toast.success("Solicitação enviada!");
      await fetchStatus();
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!friendshipId) return;
    setLoading(true);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) {
      toast.error("Erro ao aceitar");
    } else {
      toast.success("Amizade aceita!");
      await fetchStatus();
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    if (!friendshipId) return;
    setLoading(true);
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setStatus("none");
    setFriendshipId(null);
    toast.success("Removido");
    setLoading(false);
  };

  if (!user || user.id === targetUserId) return null;

  if (status === "accepted") {
    return (
      <Button variant="outline" size={size} onClick={handleRemove} disabled={loading} className="gap-1">
        <UserCheck className="h-3.5 w-3.5 text-green-400" /> Amigos
      </Button>
    );
  }

  if (status === "pending_sent") {
    return (
      <Button variant="outline" size={size} onClick={handleRemove} disabled={loading} className="gap-1">
        <Clock className="h-3.5 w-3.5 text-amber-400" /> Pendente
      </Button>
    );
  }

  if (status === "pending_received") {
    return (
      <div className="flex gap-1">
        <Button variant="gold" size={size} onClick={handleAccept} disabled={loading} className="gap-1">
          <UserCheck className="h-3.5 w-3.5" /> Aceitar
        </Button>
        <Button variant="outline" size={size} onClick={handleRemove} disabled={loading}>
          <UserMinus className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size={size} onClick={handleAdd} disabled={loading} className="gap-1">
      <UserPlus className="h-3.5 w-3.5" /> Adicionar
    </Button>
  );
};

export default FriendButton;
