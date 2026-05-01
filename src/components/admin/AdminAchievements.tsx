import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * AdminAchievements — placeholder após migração para o schema Achievements v2.
 * As tabelas legadas (achievement_definitions / player_achievements antigas) foram dropadas.
 * O CRUD completo de achievement_templates será entregue na próxima iteração.
 */
const AdminAchievements = () => (
  <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle>Achievements (v2)</CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground space-y-2">
      <p>
        O sistema de conquistas foi migrado para o schema v2 (templates + escopo + raridade).
        O catálogo inicial é populado pela própria migração SQL.
      </p>
      <p>
        O CRUD completo (criar / editar / desativar templates, conceder admin_only, recalcular stats)
        será entregue na próxima iteração do painel.
      </p>
    </CardContent>
  </Card>
);

export default AdminAchievements;
