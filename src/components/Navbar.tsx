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
  BookOpen,
  User,
  Lock,
  Pencil,
  Info,
  MessageCircle,
  Lightbulb,
  AtSign,
  Trophy,
  Gamepad2,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

  const closeMobile = () => setMobileOpen(false);

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
          <Link to="/about">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Info className="h-4 w-4" /> Sobre Nós
            </Button>
          </Link>

          {/* Competitivo dropdown */}
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

          {/* Recursos dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                <BookOpen className="h-4 w-4" /> Recursos <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate("/rules")}>
                <BookOpen className="h-4 w-4 mr-2" /> Regras
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/games")}>
                <Gamepad2 className="h-4 w-4 mr-2" /> Biblioteca de Jogos
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50">
                <BookOpen className="h-4 w-4 mr-2" /> Materiais
                <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Em breve</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/suggestions">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-4 w-4" /> Sugestões
            </Button>
          </Link>

          {/* Nossas Redes */}
          {(contactLinks.discord || contactLinks.whatsapp) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                  <AtSign className="h-4 w-4" /> Nossas Redes <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contactLinks.discord && (
                  <DropdownMenuItem asChild>
                    <a href={contactLinks.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <DiscordIcon size={16} /> Discord
                    </a>
                  </DropdownMenuItem>
                )}
                {contactLinks.whatsapp && (
                  <DropdownMenuItem asChild>
                    <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
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
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Desktop auth */}
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
                  <Pencil className="h-4 w-4 mr-2" /> Editar Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile?tab=password")}>
                  <Lock className="h-4 w-4 mr-2" /> Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button variant="gold" size="sm">Faça parte da comunidade</Button>
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
            <Button variant="ghost" className="w-full justify-start gap-2"><Info className="h-4 w-4" /> Sobre Nós</Button>
          </Link>

          {/* Competitivo accordion */}
          <details className="group">
            <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              <Trophy className="h-4 w-4" /> Competitivo
              <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
            </summary>
            <div className="pl-6 space-y-1">
              <Link to="/seasons" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">Seasons</Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 opacity-50" disabled>
                Torneios <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-auto">Em breve</span>
              </Button>
            </div>
          </details>

          <Link to="/partidas" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2"><Calendar className="h-4 w-4" /> Partidas</Button>
          </Link>

          <Link to="/players" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2"><Users className="h-4 w-4" /> Jogadores</Button>
          </Link>

          {/* Recursos accordion */}
          <details className="group">
            <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              <BookOpen className="h-4 w-4" /> Recursos
              <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
            </summary>
            <div className="pl-6 space-y-1">
              <Link to="/rules" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">Regras</Button>
              </Link>
              <Link to="/games" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">Biblioteca de Jogos</Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 opacity-50" disabled>
                Materiais <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-auto">Em breve</span>
              </Button>
            </div>
          </details>

          <Link to="/suggestions" onClick={closeMobile}>
            <Button variant="ghost" className="w-full justify-start gap-2"><Lightbulb className="h-4 w-4" /> Sugestões</Button>
          </Link>

          {/* Nossas Redes accordion */}
          {(contactLinks.discord || contactLinks.whatsapp) && (
            <details className="group">
              <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                <AtSign className="h-4 w-4" /> Nossas Redes
                <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="pl-6 space-y-1">
                {contactLinks.discord && (
                  <a href={contactLinks.discord} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <DiscordIcon size={16} /> Discord
                    </Button>
                  </a>
                )}
                {contactLinks.whatsapp && (
                  <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </details>
          )}

          {isAdmin && (
            <Link to="/admin" onClick={closeMobile}>
              <Button variant="ghost" className="w-full justify-start gap-2 text-gold"><Shield className="h-4 w-4" /> Admin</Button>
            </Link>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            {user ? (
              <>
                <Link to="/profile" onClick={closeMobile}>
                  <Button variant="ghost" className="w-full justify-start gap-2"><Pencil className="h-4 w-4" /> Editar Perfil</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleSignOut}>Sair</Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMobile}>
                  <Button variant="ghost" className="w-full">Entrar</Button>
                </Link>
                <Link to="/register" onClick={closeMobile}>
                  <Button variant="gold" className="w-full">Faça parte da comunidade</Button>
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
