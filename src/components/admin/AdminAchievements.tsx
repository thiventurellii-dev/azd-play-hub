import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNotification } from "@/components/NotificationDialog";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import {
  useAchievementTemplates,
  type AchievementTemplate,
} from "@/hooks/useAchievements";
import type {
  AchievementCategory,
  AchievementRarity,
} from "@/components/achievements/AchievementBadge";
import { Pencil, Plus, Award } from "lucide-react";

const CATEGORIES: AchievementCategory[] = [
  "participation",
  "competitive",
  "social",
  "season",
  "special",
  "contribution",
];
const RARITIES: AchievementRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mesa",
];
const TYPES = ["automatic", "manual_claim", "admin_only", "event_only"] as const;
const SCOPES = [
  "global",
  "game",
  "season",
  "event",
  "player_pair",
  "group",
  "ranking",
] as const;
const TRIGGER_TYPES = [
  "matches_total",
  "wins_total",
  "matches_by_game",
  "wins_by_game",
  "win_streak_by_game",
  "distinct_games_played",
  "first_win",
  "first_match_by_game",
  "season_top1",
  "",
] as const;

type FormState = Partial<AchievementTemplate>;

const emptyForm: FormState = {
  code: "",
  name: "",
  description_template: "",
  category: "participation",
  type: "automatic",
  trigger_type: "matches_total",
  scope_type: "global",
  threshold: 1,
  rarity: "common",
  progression_group: "",
  progression_level: null,
  replaces_previous: true,
  is_active: true,
  requires_match: false,
};

const AdminAchievements = () => {
  const { notify } = useNotification();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useAchievementTemplates();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [granting, setGranting] = useState<AchievementTemplate | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, AchievementTemplate[]>();
    for (const t of templates) {
      const k = t.category;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [templates]);

  const save = async () => {
    if (!editing) return;
    const payload: any = {
      code: editing.code?.trim(),
      name: editing.name?.trim(),
      description_template: editing.description_template ?? null,
      category: editing.category,
      type: editing.type,
      trigger_type: editing.trigger_type || null,
      scope_type: editing.scope_type,
      threshold: editing.threshold ?? null,
      rarity: editing.rarity,
      progression_group: editing.progression_group || null,
      progression_level: editing.progression_level ?? null,
      replaces_previous: editing.replaces_previous ?? true,
      is_active: editing.is_active ?? true,
      requires_match: editing.requires_match ?? false,
    };
    if (!payload.code || !payload.name) {
      notify("error", "Code e nome são obrigatórios.", "Faltam campos");
      return;
    }
    let error;
    if ((editing as any).id) {
      ({ error } = await supabase
        .from("achievement_templates" as any)
        .update(payload)
        .eq("id", (editing as any).id));
    } else {
      ({ error } = await supabase.from("achievement_templates" as any).insert(payload));
    }
    if (error) {
      notify("error", error.message, "Erro");
      return;
    }
    notify("success", "Template atualizado.", "Salvo");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["achievement-templates"] });
  };

  const toggleActive = async (t: AchievementTemplate) => {
    const { error } = await supabase
      .from("achievement_templates" as any)
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) {
      notify("error", error.message, "Erro");
      return;
    }
    qc.invalidateQueries({ queryKey: ["achievement-templates"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Achievements (templates)</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo de conquistas. Triggers automáticos disparam após inserção em{" "}
            <code>match_results</code> / <code>blood_match_players</code>.
          </p>
        </div>
        <Button variant="gold" onClick={() => setEditing({ ...emptyForm })}>
          <Plus className="h-4 w-4 mr-1" /> Novo template
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {grouped.map(([cat, list]) => (
        <Card key={cat} className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base capitalize">{cat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list
              .sort((a, b) => {
                const g = (a.progression_group ?? "").localeCompare(b.progression_group ?? "");
                if (g !== 0) return g;
                return (a.progression_level ?? 0) - (b.progression_level ?? 0);
              })
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:border-border"
                >
                  <AchievementBadge
                    category={t.category}
                    rarity={t.rarity}
                    level={t.progression_level ?? undefined}
                    size="small"
                    locked={!t.is_active}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t.code}</span>
                      {!t.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                          inativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {t.rarity} · {t.scope_type} · {t.type}
                      {t.trigger_type ? ` · ${t.trigger_type}` : ""}
                      {t.threshold != null ? ` · ≥${t.threshold}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setGranting(t)}
                    title="Conceder a um jogador"
                  >
                    <Award className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing({ ...t })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      {/* ---------- Editor dialog ---------- */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {(editing as any)?.id ? "Editar template" : "Novo template"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Code (único)</Label>
                <Input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Descrição (template)</Label>
                <Textarea
                  rows={2}
                  value={editing.description_template ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description_template: e.target.value })
                  }
                  placeholder="Use {threshold}, {game_name}…"
                />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing({ ...editing, category: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Raridade</Label>
                <Select
                  value={editing.rarity}
                  onValueChange={(v) => setEditing({ ...editing, rarity: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={editing.type}
                  onValueChange={(v) => setEditing({ ...editing, type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Escopo</Label>
                <Select
                  value={editing.scope_type}
                  onValueChange={(v) => setEditing({ ...editing, scope_type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Trigger type</Label>
                <Select
                  value={editing.trigger_type ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, trigger_type: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="(nenhum)" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.filter(Boolean).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Threshold</Label>
                <Input
                  type="number"
                  value={editing.threshold ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      threshold: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Progression group</Label>
                <Input
                  value={editing.progression_group ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, progression_group: e.target.value })
                  }
                  placeholder="ex: game_wins"
                />
              </div>
              <div className="space-y-1">
                <Label>Progression level</Label>
                <Input
                  type="number"
                  value={editing.progression_level ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      progression_level:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Switch
                  checked={!!editing.replaces_previous}
                  onCheckedChange={(v) => setEditing({ ...editing, replaces_previous: v })}
                />
                <Label className="!mt-0">Substitui níveis anteriores na vitrine</Label>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Switch
                  checked={!!editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label className="!mt-0">Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="gold" onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Grant dialog ---------- */}
      <GrantDialog
        template={granting}
        onClose={() => setGranting(null)}
        onGranted={() => {
          setGranting(null);
          qc.invalidateQueries({ queryKey: ["player-achievements"] });
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------
// Sub: GrantDialog
// ---------------------------------------------------------------
const GrantDialog = ({
  template,
  onClose,
  onGranted,
}: {
  template: AchievementTemplate | null;
  onClose: () => void;
  onGranted: () => void;
}) => {
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const { data: players = [] } = useQuery({
    queryKey: ["admin-players-search", search],
    enabled: !!template && search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nickname, name, avatar_url")
        .ilike("nickname", `%${search}%`)
        .limit(10);
      return (data ?? []) as any[];
    },
  });

  const grant = async (playerId: string) => {
    if (!template) return;
    const { error } = await supabase.from("player_achievements" as any).insert({
      player_profile_id: playerId,
      achievement_template_id: template.id,
      scope_type: template.scope_type,
      status: "approved",
      metadata: { granted: "manual" },
    });
    if (error) {
      notify("error", error.message, "Erro");
      return;
    }
    notify("success", `${template.name} concedida.`, "Concedida");
    onGranted();
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder {template?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Buscar jogador por nickname (mín. 2 letras)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => grant(p.id)}
                className="w-full text-left p-2 rounded border border-border/60 hover:border-gold/60 transition-colors text-sm"
              >
                <span className="font-medium">{p.nickname}</span>{" "}
                <span className="text-muted-foreground">— {p.name}</span>
              </button>
            ))}
            {search.length >= 2 && players.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">Nenhum resultado.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAchievements;
