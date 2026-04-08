import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Clock, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  profile: { id: string; name: string; nickname: string | null };
}

const FriendsList = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    // Get all friendships involving this user
    const { data } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

    if (!data) { setLoading(false); return; }

    // Get all related profile IDs
    const otherIds = data.map(f => f.user_id === targetUserId ? f.friend_id : f.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, nickname")
      .in("id", otherIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enriched = data.map(f => {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
      return {
        ...f,
        profile: profileMap.get(otherId) || { id: otherId, name: "Jogador", nickname: null },
      };
    });

    setFriends(enriched.filter(f => f.status === "accepted"));
    setPendingReceived(enriched.filter(f => f.status === "pending" && f.friend_id === user.id));
    setLoading(false);
  };

  useEffect(() => { fetchFriends(); }, [user]);

  const handleAccept = async (id: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    toast.success("Amizade aceita!");
    fetchFriends();
  };

  const handleReject = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.success("Solicitação removida");
    fetchFriends();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.success("Amigo removido");
    fetchFriends();
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      {pendingReceived.length > 0 && (
        <Card className="border-amber-600/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Solicitações Pendentes ({pendingReceived.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReceived.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-gold font-bold text-sm">
                    {(f.profile.nickname || f.profile.name).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.profile.name}</p>
                    {f.profile.nickname && <p className="text-xs text-gold">@{f.profile.nickname}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="gold" size="sm" onClick={() => handleAccept(f.id)}>
                    <UserCheck className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReject(f.id)}>
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-gold" />
            Amigos ({friends.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum amigo ainda. Adicione amigos na página de jogadores!</p>
          ) : (
            <div className="space-y-2">
              {friends.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-gold font-bold text-sm">
                      {(f.profile.nickname || f.profile.name).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{f.profile.name}</p>
                      {f.profile.nickname && <p className="text-xs text-gold">@{f.profile.nickname}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(f.id)}>
                    <UserMinus className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FriendsList;
