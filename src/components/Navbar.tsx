import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Shield,
  LogOut,
  FileText,
  Info,
  Lightbulb,
  Trophy,
  Gamepad2,
  ChevronDown,
  LayoutGrid,
  Bell,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/azd-logo.png";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { fetchPublicProfiles } from "@/lib/profilesPublic";
import { Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";


const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  
  
  const [pendingFriends, setPendingFriends] = useState(0);
  const [friendRequests, setFriendRequests] = useState<{ id: string; user_id: string; name: string; nickname: string | null }[]>([]);
  const [roomNotifs, setRoomNotifs] = useState<{ id: string; title: string; message: string; type: string; room_id: string | null; created_at: string }[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);


  const fetchFriendRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, user_id")
      .eq("friend_id", user.id)
      .eq("status", "pending" as any);
    if (!data || data.length === 0) {
      setPendingFriends(0);
      setFriendRequests([]);
      return;
    }
    setPendingFriends(data.length);
    const userIds = data.map(d => d.user_id);
    const profiles = await fetchPublicProfiles(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    setFriendRequests(data.map(d => {
      const p = profileMap.get(d.user_id);
      return { id: d.id, user_id: d.user_id, name: p?.name || '?', nickname: p?.nickname || null };
    }));
  }, [user]);

  const fetchRoomNotifs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, room_id, created_at, is_read")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const allNotifs = (data || []).map(n => ({ id: n.id, title: n.title, message: n.message, type: n.type, room_id: n.room_id, created_at: n.created_at }));
    setRoomNotifs(allNotifs);
    setUnreadNotifCount((data || []).filter(n => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchFriendRequests();
    fetchRoomNotifs();
    supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserNickname((data as any).nickname || null);
          setUserAvatar((data as any).avatar_url || null);
        }
      });

    // Realtime for notifications
    const notifChannel = supabase
      .channel(`navbar-notifs-${user.id}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchRoomNotifs();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        fetchFriendRequests();
      })
      .subscribe();

    // Polling fallback every 20s
    const poll = setInterval(() => {
      fetchRoomNotifs();
      fetchFriendRequests();
    }, 20000);

    return () => {
      supabase.removeChannel(notifChannel);
      clearInterval(poll);
    };
  }, [user, fetchFriendRequests, fetchRoomNotifs]);

  const handleAcceptFriend = async (id: string) => {
    await supabase.from("friendships").update({ status: "accepted" as any }).eq("id", id);
    fetchFriendRequests();
    window.dispatchEvent(new Event('friendship-changed'));
  };

  const handleRejectFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    fetchFriendRequests();
    window.dispatchEvent(new Event('friendship-changed'));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };



  const getInitials = () => {
    const name = userNickname || user?.user_metadata?.name || "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <img src={logo} alt="AzD" className="h-10 w-10 flex-shrink-0" />
          <span className="text-xl font-bold text-foreground whitespace-nowrap">
            Ami<span className="text-gold">z</span>ade
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/about">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Info className="h-4 w-4" /> Sobre Nós
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                <Trophy className="h-4 w-4" /> Competitivo <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate("/seasons")}>
                <Calendar className="h-4 w-4 mr-2" /> Seasons
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50">
                <Trophy className="h-4 w-4 mr-2" /> Torneios
                <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Em breve</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/partidas">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Calendar className="h-4 w-4" /> Partidas
            </Button>
          </Link>

          <Link to="/players">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Users className="h-4 w-4" /> Jogadores
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                <LayoutGrid className="h-4 w-4" /> Acervo <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate("/documentos")}>
                <FileText className="h-4 w-4 mr-2" /> Documentos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/games")}>
                <Gamepad2 className="h-4 w-4 mr-2" /> Coleção de Jogos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/suggestions">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-4 w-4" /> Sugestões
            </Button>
          </Link>


          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" className="gap-2 text-gold hover:text-gold">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 relative"
                onClick={() => navigate(userNickname ? `/perfil/${userNickname}` : "/profile")}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-gold font-bold text-xs">
                    {getInitials()}
                  </div>
                )}
                {userNickname || user.user_metadata?.name || "Perfil"}
              </Button>
              <Popover onOpenChange={async (open) => {
                if (open && unreadNotifCount > 0) {
                  const unreadIds = roomNotifs.map(n => n.id);
                  await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
                  setUnreadNotifCount(0);
                }
              }}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                    {(pendingFriends + unreadNotifCount) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-black">
                        {pendingFriends + unreadNotifCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Notificações</p>
                    {roomNotifs.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from("notifications")
                              .delete()
                              .eq("user_id", user!.id);
                            if (error) {
                              console.error("Error clearing notifications:", error);
                              toast.error("Erro ao limpar notificações");
                              return;
                            }
                            setRoomNotifs([]);
                            setUnreadNotifCount(0);
                            toast.success("Notificações limpas!");
                          } catch (err) {
                            console.error("Clear notifications error:", err);
                            toast.error("Erro ao limpar notificações");
                          }
                        }}
                      >
                        Limpar tudo
                      </Button>
                    )}
                  </div>
                  {(friendRequests.length > 0 || roomNotifs.length > 0) ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {friendRequests.map(fr => (
                        <div key={fr.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{fr.nickname || fr.name}</p>
                            <p className="text-xs text-muted-foreground">Pedido de amizade</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-400" onClick={() => handleAcceptFriend(fr.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRejectFriend(fr.id)}>
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {roomNotifs.map(n => (
                        <div key={n.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{n.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                            onClick={async () => {
                              try {
                                const { error } = await supabase.from("notifications").delete().eq("id", n.id);
                                if (error) {
                                  console.error("Error deleting notification:", error);
                                  toast.error("Erro ao excluir notificação");
                                  return;
                                }
                                fetchRoomNotifs();
                              } catch (err) {
                                console.error("Delete notification error:", err);
                                toast.error("Erro ao excluir notificação");
                              }
                            }}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">Sem notificações</p>
                  )}
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="gold" size="sm">
                  Faça parte da comunidade
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile: show logo + profile/login only */}
        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => navigate(userNickname ? `/perfil/${userNickname}` : "/profile")}
            >
              {userAvatar ? (
                <img src={userAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-gold font-bold text-xs">
                  {getInitials()}
                </div>
              )}
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
