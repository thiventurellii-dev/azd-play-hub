import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/components/NotificationDialog";
import { Plus, Trash2, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  criteria: string | null;
  trigger_type: string;
  trigger_config: any;
}

const TRIGGER_PRESETS = [
  { value: "first_win", label: "Primeira Vitória", hasParam: false },
  { value: "total_games", label: "Total de Partidas", hasParam: true, paramLabel: "Qtd. de partidas" },
  {
    value: "win_streak",
    label: "Maior Sequência de Vitórias",
    hasParam: true,
    paramLabel: "Qtd. de vitórias consecutivas",
  },
  { value: "games_in_day", label: "Partidas no Dia", hasParam: true, paramLabel: "Qtd. de partidas no dia" },
];

const formatTriggerConfig = (config: any): string => {
  if (!config) return "";
  if (config.type === "first_win") return "🏆 Primeira Vitória";
  if (config.type === "total_games") return `🎮 ${config.n || "?"} partidas jogadas`;
  if (config.type === "win_streak") return `🔥 ${config.n || "?"} vitórias consecutivas`;
  if (config.type === "games_in_day") return `⚡ ${config.n || "?"} partidas em um dia`;
  return JSON.stringify(config);
};

const AdminAchievements = () => {
  const { notify } = useNotification();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏆");
  const [criteria, setCriteria] = useState("");
  const [triggerType, setTriggerType] = useState("manual");

  // Trigger config
  const [selectedPreset, setSelectedPreset] = useState("first_win");
  const [triggerParam, setTriggerParam] = useState("");
  const [customJson, setCustomJson] = useState("");

  const fetchAchievements = async () => {
    const { data } = await supabase.from("achievement_definitions").select("*").order("created_at");
    setAchievements((data || []) as Achievement[]);
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const buildTriggerConfig = (): any => {
    if (triggerType === "manual") return null;
    if (selectedPreset === "custom") {
      try {
        return JSON.parse(customJson);
      } catch {
        notify("error", "JSON inválido");
        return undefined;
      }
    }
    const preset = TRIGGER_PRESETS.find((p) => p.value === selectedPreset);
    if (!preset) return null;
    if (preset.hasParam) return { type: preset.value, n: parseInt(triggerParam) || 1 };
    return { type: preset.value };
  };

  const handleCreate = async () => {
    if (!name) return notify("error", "Nome obrigatório");
    const config = buildTriggerConfig();
    if (config === undefined) return; // JSON parse error
    const { error } = await supabase.from("achievement_definitions").insert({
      name,
      description: description || null,
      icon: icon || "🏆",
      criteria: criteria || null,
      trigger_type: triggerType,
      trigger_config: config,
    } as any);
    if (error) return notify("error", error.message);
    notify("success", "Achievement criado!");
    setName("");
    setDescription("");
    setIcon("🏆");
    setCriteria("");
    setTriggerType("manual");
    setSelectedPreset("first_win");
    setTriggerParam("");
    setCustomJson("");
    fetchAchievements();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("achievement_definitions").delete().eq("id", id);
    if (error) return notify("error", error.message);
    notify("success", "Removido");
    fetchAchievements();
  };

  // Grant achievement to a player
  const [grantPlayerId, setGrantPlayerId] = useState("");
  const [grantAchievementId, setGrantAchievementId] = useState("");
  const [players, setPlayers] = useState<{ id: string; name: string; nickname: string | null }[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, name, nickname")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setPlayers((data || []) as any[]);
      });
  }, []);

  const handleGrant = async () => {
    if (!grantPlayerId || !grantAchievementId) return notify("error", "Selecione jogador e achievement");
    const { error } = await supabase.from("player_achievements").insert({
      player_id: grantPlayerId,
      achievement_id: grantAchievementId,
    });
    if (error) {
      if (error.code === "23505") return notify("error", "Jogador já possui este achievement");
      return notify("error", error.message);
    }
    notify("success", "Achievement concedido!");
    setGrantPlayerId("");
    setGrantAchievementId("");
  };

  const currentPreset = TRIGGER_PRESETS.find((p) => p.value === selectedPreset);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Novo Achievement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mestre dos Dados" />
            </div>
            <div className="space-y-2">
              <Label>Ícone (emoji)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏆" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do achievement"
            />
          </div>
          <div className="space-y-2">
            <Label>Critério (visível para jogadores)</Label>
            <Input
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Ex: Vencer 10 partidas de Brass"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {triggerType === "automatic" && (
              <div className="space-y-2">
                <Label>Gatilho</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={(v) => {
                    setSelectedPreset(v);
                    setTriggerParam("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizado (JSON)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {triggerType === "automatic" && currentPreset?.hasParam && (
            <div className="space-y-2">
              <Label>{currentPreset.paramLabel}</Label>
              <Input
                type="number"
                value={triggerParam}
                onChange={(e) => setTriggerParam(e.target.value)}
                placeholder="Ex: 5"
              />
            </div>
          )}
          {triggerType === "automatic" && selectedPreset === "custom" && (
            <div className="space-y-2">
              <Label>Config JSON</Label>
              <Textarea
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                placeholder='{"type":"custom_trigger"}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          )}
          <Button variant="gold" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </CardContent>
      </Card>

      {/* Grant section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Conceder Achievement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jogador</Label>
              <Select value={grantPlayerId} onValueChange={setGrantPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nickname || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Achievement</Label>
              <Select value={grantAchievementId} onValueChange={setGrantAchievementId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {achievements.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="gold" onClick={handleGrant}>
            <Award className="h-4 w-4 mr-1" /> Conceder
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {achievements.map((a) => (
          <Card key={a.id} className="bg-card border-border">
            <CardContent className="py-4 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {a.icon} {a.name}
                </p>
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                {a.criteria && <p className="text-xs text-gold mt-1">📋 {a.criteria}</p>}
                {a.trigger_type === "automatic" && (
                  <div className="mt-1 space-y-0.5">
                    <Badge variant="outline" className="text-xs">
                      ⚡ Automático
                    </Badge>
                    {a.trigger_config && (
                      <p className="text-xs text-muted-foreground">{formatTriggerConfig(a.trigger_config)}</p>
                    )}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminAchievements;
