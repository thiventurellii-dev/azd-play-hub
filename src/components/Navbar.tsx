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
  Gamepad2,
  BookOpen,
  User,
  Lock,
  Pencil,
  Info,
  MessageCircle,
  Phone,
  Lightbulb,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ArtSign,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/azd-logo.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DiscordIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
  </svg>
);

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactLinks, setContactLinks] = useState<Record<string, string>>({});

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = user
    ? [
        { to: "/about", label: "Sobre Nós", icon: Info },
        { to: "/seasons", label: "Seasons", icon: Calendar },
        { to: "/games", label: "Jogos", icon: Gamepad2 },
        { to: "/players", label: "Jogadores", icon: Users },
        { to: "/rules", label: "Regras", icon: BookOpen },
        { to: "/suggestions", label: "Sugestões", icon: Lightbulb },
      ]
    : [
        { to: "/about", label: "Sobre Nós", icon: Info },
        { to: "/games", label: "Jogos", icon: Gamepad2 },
        { to: "/rules", label: "Regras", icon: BookOpen },
        { to: "/suggestions", label: "Sugestões", icon: Lightbulb },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="AzD" className="h-10 w-10" />
          <span className="text-xl font-bold text-foreground">
            Ami<span className="text-gold">z</span>ade
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                  <AtSign className="h-4 w-4" />
                  Nossas Redes
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contactLinks.discord && (
                  <DropdownMenuItem asChild>
                    <a
                      href={contactLinks.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <DiscordIcon size={16} /> Discord
                    </a>
                  </DropdownMenuItem>
                )}
                {contactLinks.whatsapp && (
                  <DropdownMenuItem asChild>
                    <a
                      href={contactLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" className="gap-2 text-gold hover:text-gold">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {user.user_metadata?.name || "Perfil"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile?tab=password")}>
                  <Lock className="h-4 w-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <div className="md:hidden border-t border-border bg-background p-4 space-y-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Icon className="h-4 w-4" /> {label}
              </Button>
            </Link>
          ))}
          {user && contactLinks.discord && (
            <a
              href={contactLinks.discord}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start gap-2">
                <DiscordIcon size={16} /> Discord
              </Button>
            </a>
          )}
          {user && contactLinks.whatsapp && (
            <a
              href={contactLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start gap-2">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2 text-gold">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          <div className="pt-2 border-t border-border space-y-2">
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Pencil className="h-4 w-4" /> Editar Perfil
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
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
