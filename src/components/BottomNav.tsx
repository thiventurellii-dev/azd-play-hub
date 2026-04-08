import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Gamepad2, Users, MoreHorizontal, Trophy, BarChart3, Lightbulb, Shield, LogOut, FileText, Info, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/partidas", icon: Calendar, label: "Partidas" },
  { to: "/games", icon: Gamepad2, label: "Jogos" },
  { to: "/players", icon: Users, label: "Jogadores" },
];

const BottomNav = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-stretch justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] gap-0.5 transition-colors ${
                active ? "text-gold" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] gap-0.5 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerTitle className="sr-only">Menu</DrawerTitle>
            <div className="p-4 pb-8 space-y-1">
              <Link to="/about" onClick={() => setDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                  <Info className="h-5 w-5" /> Sobre Nós
                </Button>
              </Link>
              <Link to="/seasons" onClick={() => setDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                  <Trophy className="h-5 w-5" /> Seasons
                </Button>
              </Link>
              <Link to="/rankings" onClick={() => setDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                  <BarChart3 className="h-5 w-5" /> Rankings
                </Button>
              </Link>
              <Link to="/documentos" onClick={() => setDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                  <FileText className="h-5 w-5" /> Documentos
                </Button>
              </Link>
              <Link to="/suggestions" onClick={() => setDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                  <Lightbulb className="h-5 w-5" /> Sugestões
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setDrawerOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base text-gold">
                    <Shield className="h-5 w-5" /> Admin
                  </Button>
                </Link>
              )}
              <Link to="/instalar" onClick={() => setDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                  <Download className="h-5 w-5" /> Instalar App
                </Button>
              </Link>
              <div className="pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 text-base text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" /> Sair
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
};

export default BottomNav;
