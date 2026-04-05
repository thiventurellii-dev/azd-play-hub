import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import AdminSeasons from "@/components/admin/AdminSeasons";
import AdminGames from "@/components/admin/AdminGames";
import AdminMatches from "@/components/admin/AdminMatches";
import AdminBloodMatches from "@/components/admin/AdminBloodMatches";
import AdminBloodScripts from "@/components/admin/AdminBloodScripts";
import AdminPlayers from "@/components/admin/AdminPlayers";
import AdminAboutUs from "@/components/admin/AdminAboutUs";
import AdminContato from "@/components/admin/AdminContato";
import AdminSuggestions from "@/components/admin/AdminSuggestions";
import AdminMatchRooms from "@/components/admin/AdminMatchRooms";
import AdminScoringSchemas from "@/components/admin/AdminScoringSchemas";

const Admin = () => {
  return (
    <div className="container py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-gold" />
        <div>
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <p className="text-muted-foreground">Gerencie seasons, jogos, partidas e jogadores</p>
        </div>
      </div>

      <Tabs defaultValue="seasons" className="space-y-6">
        <TabsList className="bg-secondary flex-wrap">
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="games">Jogos</TabsTrigger>
          <TabsTrigger value="blood-scripts">Scripts Blood</TabsTrigger>
          <TabsTrigger value="matches">Partidas BG</TabsTrigger>
          <TabsTrigger value="blood-matches">Partidas Blood</TabsTrigger>
          <TabsTrigger value="rooms">Salas</TabsTrigger>
          <TabsTrigger value="players">Jogadores</TabsTrigger>
          <TabsTrigger value="about">Sobre Nós</TabsTrigger>
          <TabsTrigger value="contato">Nossas Redes</TabsTrigger>
          <TabsTrigger value="scoring">Pontuação</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
        </TabsList>

        <TabsContent value="seasons"><AdminSeasons /></TabsContent>
        <TabsContent value="games"><AdminGames /></TabsContent>
        <TabsContent value="blood-scripts"><AdminBloodScripts /></TabsContent>
        <TabsContent value="matches"><AdminMatches /></TabsContent>
        <TabsContent value="blood-matches"><AdminBloodMatches /></TabsContent>
        <TabsContent value="rooms"><AdminMatchRooms /></TabsContent>
        <TabsContent value="players"><AdminPlayers /></TabsContent>
        <TabsContent value="about"><AdminAboutUs /></TabsContent>
        <TabsContent value="contato"><AdminContato /></TabsContent>
        <TabsContent value="suggestions"><AdminSuggestions /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
