import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Calendar, Users, Trophy, FileText, AtSign, Lightbulb, Award, ClipboardList } from "lucide-react";
import AdminSeasons from "@/components/admin/AdminSeasons";
import AdminBloodMatches from "@/components/admin/AdminBloodMatches";
import AdminBloodScripts from "@/components/admin/AdminBloodScripts";
import AdminPlayers from "@/components/admin/AdminPlayers";
import AdminAboutUs from "@/components/admin/AdminAboutUs";
import AdminContato from "@/components/admin/AdminContato";
import AdminSuggestions from "@/components/admin/AdminSuggestions";
import AdminScoringSchemas from "@/components/admin/AdminScoringSchemas";
import AdminAchievements from "@/components/admin/AdminAchievements";

const Admin = () => {
  return (
    <div className="container py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-gold" />
        <div>
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <p className="text-muted-foreground">Configurações estruturais e gerenciamento de alto nível</p>
        </div>
      </div>

      <Tabs defaultValue="players" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="bg-secondary/50 border border-border p-1 gap-1 flex-wrap min-w-max">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold hidden sm:inline">Usuários</span>
            <TabsTrigger value="players" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Jogadores
            </TabsTrigger>

            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold hidden sm:inline ml-2">Competitivo</span>
            <TabsTrigger value="seasons" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> Seasons
            </TabsTrigger>
            <TabsTrigger value="scoring" className="gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" /> Pontuação
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-1.5 text-xs">
              <Award className="h-3.5 w-3.5" /> Achievements
            </TabsTrigger>

            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold hidden sm:inline ml-2">Blood</span>
            <TabsTrigger value="blood-scripts" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Scripts
            </TabsTrigger>
            <TabsTrigger value="blood-matches" className="gap-1.5 text-xs">
              <Trophy className="h-3.5 w-3.5" /> Partidas Blood
            </TabsTrigger>

            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold hidden sm:inline ml-2">Conteúdo</span>
            <TabsTrigger value="about" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Sobre Nós
            </TabsTrigger>
            <TabsTrigger value="contato" className="gap-1.5 text-xs">
              <AtSign className="h-3.5 w-3.5" /> Redes
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5 text-xs">
              <Lightbulb className="h-3.5 w-3.5" /> Sugestões
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="players"><AdminPlayers /></TabsContent>
        <TabsContent value="seasons"><AdminSeasons /></TabsContent>
        <TabsContent value="blood-scripts"><AdminBloodScripts /></TabsContent>
        <TabsContent value="blood-matches"><AdminBloodMatches /></TabsContent>
        <TabsContent value="scoring"><AdminScoringSchemas /></TabsContent>
        <TabsContent value="achievements"><AdminAchievements /></TabsContent>
        <TabsContent value="about"><AdminAboutUs /></TabsContent>
        <TabsContent value="contato"><AdminContato /></TabsContent>
        <TabsContent value="suggestions"><AdminSuggestions /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
