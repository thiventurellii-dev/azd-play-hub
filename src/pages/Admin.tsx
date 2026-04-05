import { useState } from "react";
import { Shield, Calendar, Users, Trophy, FileText, AtSign, Lightbulb, Award, ClipboardList, Swords, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AdminSeasons from "@/components/admin/AdminSeasons";
import AdminBloodMatches from "@/components/admin/AdminBloodMatches";
import AdminBloodScripts from "@/components/admin/AdminBloodScripts";
import AdminPlayers from "@/components/admin/AdminPlayers";
import AdminAboutUs from "@/components/admin/AdminAboutUs";
import AdminContato from "@/components/admin/AdminContato";
import AdminSuggestions from "@/components/admin/AdminSuggestions";
import AdminScoringSchemas from "@/components/admin/AdminScoringSchemas";
import AdminAchievements from "@/components/admin/AdminAchievements";
import AdminMatches from "@/components/admin/AdminMatches";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MenuGroup {
  label: string;
  items: { value: string; label: string; icon: React.ElementType }[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Usuários",
    items: [
      { value: "players", label: "Jogadores", icon: Users },
    ],
  },
  {
    label: "Competitivo",
    items: [
      { value: "seasons", label: "Seasons", icon: Calendar },
      { value: "matches", label: "Partidas", icon: Swords },
      { value: "scoring", label: "Pontuação", icon: ClipboardList },
      { value: "achievements", label: "Achievements", icon: Award },
    ],
  },
  {
    label: "Blood on the Clocktower",
    items: [
      { value: "blood-scripts", label: "Scripts", icon: FileText },
      { value: "blood-matches", label: "Partidas Blood", icon: Trophy },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { value: "about", label: "Sobre Nós", icon: FileText },
      { value: "contato", label: "Redes Sociais", icon: AtSign },
      { value: "suggestions", label: "Sugestões", icon: Lightbulb },
    ],
  },
];

const contentMap: Record<string, React.ReactNode> = {
  players: <AdminPlayers />,
  seasons: <AdminSeasons />,
  matches: <AdminMatches />,
  scoring: <AdminScoringSchemas />,
  achievements: <AdminAchievements />,
  "blood-scripts": <AdminBloodScripts />,
  "blood-matches": <AdminBloodMatches />,
  about: <AdminAboutUs />,
  contato: <AdminContato />,
  suggestions: <AdminSuggestions />,
};

const Admin = () => {
  const [active, setActive] = useState("players");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuGroups.map((g) => [g.label, true]))
  );

  const toggle = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="container py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-gold" />
        <div>
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <p className="text-muted-foreground">Configurações estruturais e gerenciamento</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Vertical sidebar menu */}
        <nav className="w-56 shrink-0 space-y-1">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <button
                onClick={() => toggle(group.label)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold hover:text-foreground transition-colors rounded-md"
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    expanded[group.label] && "rotate-180"
                  )}
                />
              </button>

              {expanded[group.label] && (
                <div className="ml-1 space-y-0.5 mb-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => setActive(item.value)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-gold/10 text-gold font-medium border border-gold/20"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">{contentMap[active]}</div>
      </div>
    </div>
  );
};

export default Admin;
