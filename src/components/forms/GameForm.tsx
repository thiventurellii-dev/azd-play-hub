import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface ScoringSubcategory { key: string; label: string; type: string; }
interface ScoringCategory { key: string; label: string; type: string; subcategories?: ScoringSubcategory[]; }
interface GameTag { id: string; name: string; }

export interface GameFormData {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
  factions: any;
  description?: string | null;
  category?: string | null;
}

interface Props {
  game: GameFormData;
  isAdminMode?: boolean;
  onSuccess: () => void;
}

const generateKey = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

const GameForm = ({ game, isAdminMode = false, onSuccess }: Props) => {
  const [name, setName] = useState(game.name);
  const [slug, setSlug] = useState(game.slug || "");
  const [imageUrl, setImageUrl] = useState(game.image_url || "");
  const [rulesUrl, setRulesUrl] = useState(game.rules_url || "");
  const [videoUrl, setVideoUrl] = useState(game.video_url || "");
  const [minP, setMinP] = useState(game.min_players?.toString() || "");
  const [maxP, setMaxP] = useState(game.max_players?.toString() || "");
  const [description, setDescription] = useState(game.description || "");
  const [category, setCategory] = useState(game.category || "");
  const [factions, setFactions] = useState(() => {
    if (Array.isArray(game.factions)) {
      return game.factions.map((f: any) => (typeof f === "string" ? f : f.name || "")).filter(Boolean).join(", ");
    }
    return "";
  });

  const [categories, setCategories] = useState<ScoringCategory[]>([]);
  const [allTags, setAllTags] = useState<GameTag[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    const load = async () => {
      const [schemaRes, tagsRes, tagLinksRes] = await Promise.all([
        supabase.from("game_scoring_schemas").select("schema").eq("game_id", game.id).maybeSingle(),
        supabase.from("game_tags").select("*").order("name"),
        supabase.from("game_tag_links").select("tag_id").eq("game_id", game.id),
      ]);
      setCategories((schemaRes.data?.schema as any)?.categories || []);
      setAllTags((tagsRes.data || []) as GameTag[]);
      setTagIds((tagLinksRes.data || []).map((t: any) => t.tag_id));
    };
    load();
  }, [game.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedFactions = null;
      if (factions.trim()) {
        parsedFactions = factions.split(",").map((f) => f.trim()).filter(Boolean);
      }

      const basePayload: any = {
        name,
        slug: slug || null,
        image_url: imageUrl || null,
        rules_url: rulesUrl || null,
        video_url: videoUrl || null,
        min_players: minP ? parseInt(minP) : null,
        max_players: maxP ? parseInt(maxP) : null,
        factions: parsedFactions,
        description: description.trim() || null,
        category: category.trim() || null,
      };

      let { error } = await supabase.from("games").update(basePayload).eq("id", game.id);

      // Fallback: if the external DB doesn't have description/category yet, retry without them
      if (error && /column .*(description|category)/i.test(error.message)) {
        const { description: _d, category: _c, ...fallback } = basePayload;
        const retry = await supabase.from("games").update(fallback).eq("id", game.id);
        error = retry.error;
        if (!error) {
          toast.warning("Descrição/categoria não salvas: rode a migração SQL no banco externo.");
        }
      }
      if (error) throw error;

      // Save scoring schema
      const schemaPayload = { categories };
      const { data: existing } = await supabase
        .from("game_scoring_schemas")
        .select("id")
        .eq("game_id", game.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("game_scoring_schemas").update({ schema: schemaPayload as any }).eq("id", existing.id);
      } else if (categories.length > 0) {
        await supabase.from("game_scoring_schemas").insert({ game_id: game.id, schema: schemaPayload as any });
      }

      // Save tags
      await supabase.from("game_tag_links").delete().eq("game_id", game.id);
      if (tagIds.length > 0) {
        await supabase.from("game_tag_links").insert(tagIds.map((tid) => ({ game_id: game.id, tag_id: tid })));
      }
    },
    onSuccess: () => {
      toast.success("Jogo atualizado!");
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const { data, error } = await supabase.from("game_tags").insert({ name: newTagName.trim() }).select().single();
    if (error) return toast.error(error.message);
    setAllTags((prev) => [...prev, data as GameTag].sort((a, b) => a.name.localeCompare(b.name)));
    setTagIds((prev) => [...prev, data.id]);
    setNewTagName("");
  };

  const addCategory = () => setCategories([...categories, { key: "", label: "", type: "number" }]);
  const removeCategory = (i: number) => setCategories(categories.filter((_, idx) => idx !== i));
  const updateCategory = (i: number, label: string) => {
    const cats = [...categories];
    cats[i] = { ...cats[i], label, key: generateKey(label) };
    setCategories(cats);
  };
  const addSubcategory = (ci: number) => {
    const cats = [...categories];
    const sub = cats[ci].subcategories || [];
    cats[ci] = { ...cats[ci], type: "group", subcategories: [...sub, { key: "", label: "", type: "number" }] };
    setCategories(cats);
  };
  const removeSubcategory = (ci: number, si: number) => {
    const cats = [...categories];
    cats[ci].subcategories = cats[ci].subcategories?.filter((_, i) => i !== si);
    setCategories(cats);
  };
  const updateSubcategory = (ci: number, si: number, label: string) => {
    const cats = [...categories];
    if (cats[ci].subcategories) {
      cats[ci].subcategories![si] = { ...cats[ci].subcategories![si], label, key: generateKey(label) };
    }
    setCategories(cats);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="brass-birmingham" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Estratégia / Civilização" />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Resumo curto do jogo..." />
      </div>
      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>URL das Regras</Label>
          <Input value={rulesUrl} onChange={(e) => setRulesUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URL do Vídeo</Label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Mín. Jogadores</Label>
          <Input type="number" value={minP} onChange={(e) => setMinP(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Máx. Jogadores</Label>
          <Input type="number" value={maxP} onChange={(e) => setMaxP(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Facções</Label>
        <Input value={factions} onChange={(e) => setFactions(e.target.value)} placeholder="Facção A, Facção B" />
        <p className="text-xs text-muted-foreground">Separe por vírgula</p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={tagIds.includes(t.id)}
                onCheckedChange={(checked) =>
                  setTagIds((prev) => (checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                }
              />
              <span className="text-sm">{t.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nova tag..." className="flex-1 h-8" />
          <Button variant="outline" size="sm" onClick={handleAddTag} disabled={!newTagName.trim()}>
            <Plus className="h-3 w-3 mr-1" /> Criar
          </Button>
        </div>
      </div>

      {/* Scoring Schema */}
      <div className="space-y-2">
        <Label>Schema de Pontuação</Label>
        {categories.map((cat, ci) => (
          <div key={ci} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={cat.label} onChange={(e) => updateCategory(ci, e.target.value)} placeholder="Nome da categoria" className="flex-1 h-8" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCategory(ci)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
            {(cat.subcategories || []).map((sub, si) => (
              <div key={si} className="flex items-center gap-2 ml-4">
                <Input value={sub.label} onChange={(e) => updateSubcategory(ci, si, e.target.value)} placeholder="Subcategoria" className="flex-1 h-7 text-xs" />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubcategory(ci, si)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="ml-4 text-xs" onClick={() => addSubcategory(ci)}>
              <Plus className="h-3 w-3 mr-1" /> Subcategoria
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCategory}>
          <Plus className="h-3 w-3 mr-1" /> Categoria
        </Button>
      </div>

      <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
};

export default GameForm;
