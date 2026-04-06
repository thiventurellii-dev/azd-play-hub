import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Shield,
  LogOut,
  Menu,
  X,
  FileText,
  User,
  Info,
  Lightbulb,
  AtSign,
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DiscordIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
  </svg>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactLinks, setContactLinks] = useState<Record<string, string>>({});
  const [pendingFriends, setPendingFriends] = useState(0);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("contact_links")
      .select("name, url")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          for (const r of data) map[r.name] = r.url;
          setContactLinks(map);
        }
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("friend_id", user.id)
      .eq("status", "pending" as any)
      .then(({ count }) => {
        setPendingFriends(count || 0);
      });
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
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

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

          {(contactLinks.discord || contactLinks.whatsapp || contactLinks.whatsapp_botc) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                  <AtSign className="h-4 w-4" /> Nossas Redes <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contactLinks.discord && (
                  <DropdownMenuItem asChild>
                    <a href={contactLinks.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#5865F2]">
                      <DiscordIcon size={16} /> Discord
                    </a>
                  </DropdownMenuItem>
                )}
                {contactLinks.whatsapp && (
                  <DropdownMenuItem asChild>
                    <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366]">
                      <WhatsAppIcon size={16} /> Boardgame
                    </a>
                  </DropdownMenuItem>
                )}
                {contactLinks.whatsapp_botc && (
                  <DropdownMenuItem asChild>
                    <a href={contactLinks.whatsapp_botc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366]">
                      <WhatsAppIcon size={16} /> Blood
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
                {pendingFriends > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-black">
                    {pendingFriends}
                  </span>
                )}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3">
                  <p className="text-sm font-medium mb-2">Notificações</p>
                  <p className="text-xs text-muted-foreground text-center py-6">Sem notificações</p>
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

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <Link to="/about" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Info className="h-4 w-4" /> Sobre Nós
            </Button>
          </Link>

          <details className="group">
            <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              <Trophy className="h-4 w-4" /> Competitivo
              <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
            </summary>
            <div className="pl-6 space-y-1">
              <Link to="/seasons" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  Seasons
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 opacity-50" disabled>
                Torneios <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-auto">Em breve</span>
              </Button>
            </div>
          </details>

          <Link to="/partidas" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Calendar className="h-4 w-4" /> Partidas
            </Button>
          </Link>

          <Link to="/players" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Users className="h-4 w-4" /> Jogadores
            </Button>
          </Link>

          <details className="group">
            <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              <LayoutGrid className="h-4 w-4" /> Acervo
              <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
            </summary>
            <div className="pl-6 space-y-1">
              <Link to="/documentos" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  Documentos
                </Button>
              </Link>
              <Link to="/games" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  Coleção de Jogos
                </Button>
              </Link>
            </div>
          </details>

          <Link to="/suggestions" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Lightbulb className="h-4 w-4" /> Sugestões
            </Button>
          </Link>

          {(contactLinks.discord || contactLinks.whatsapp || contactLinks.whatsapp_botc) && (
            <details className="group">
              <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                <AtSign className="h-4 w-4" /> Nossas Redes
                <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="pl-6 space-y-1">
                {contactLinks.discord && (
                  <a href={contactLinks.discord} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[#5865F2]">
                      <DiscordIcon size={16} /> Discord
                    </Button>
                  </a>
                )}
                {contactLinks.whatsapp && (
                  <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[#25D366]">
                      <WhatsAppIcon size={16} /> Boardgame
                    </Button>
                  </a>
                )}
                {contactLinks.whatsapp_botc && (
                  <a href={contactLinks.whatsapp_botc} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[#25D366]">
                      <WhatsAppIcon size={16} /> Blood
                    </Button>
                  </a>
                )}
              </div>
            </details>
          )}

          {isAdmin && (
            <Link to="/admin" onClick={closeMobile}>
              <Button variant="ghost" className="w-full justify-start gap-2 text-gold">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 justify-start gap-2 relative"
                  onClick={() => { closeMobile(); navigate(userNickname ? `/perfil/${userNickname}` : "/profile"); }}
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-gold font-bold text-xs">
                      {getInitials()}
                    </div>
                  )}
                  {userNickname || "Meu Perfil"}
                  {pendingFriends > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-black">
                      {pendingFriends}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                  onClick={() => { closeMobile(); handleSignOut(); }}
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login" onClick={closeMobile}>
                  <Button variant="ghost" className="w-full">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register" onClick={closeMobile}>
                  <Button variant="gold" className="w-full">
                    Faça parte da comunidade
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
