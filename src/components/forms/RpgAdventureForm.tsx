import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { slugify } from "@/lib/slugify";

export interface RpgAdventureData {
  id: string;
  name: string;
  description: string | null;
  tag: "official" | "homebrew";
  image_url: string | null;
  system_id: string;
  slug?: string | null;
  tagline?: string | null;
  level_min?: number | null;
  level_max?: number | null;
  players_min?: number | null;
  players_max?: number | null;
  duration_hours_min?: number | null;
  duration_hours_max?: number | null;
  tone?: string | null;
  genres?: string[] | null;
  intensity?: Record<string, number> | null;
  about_long?: string | null;
  highlights?: { title: string; description: string }[] | null;
  master_notes?: { prep?: string; hooks?: string; variations?: string; secrets?: string } | null;
  materials?: { label: string; value: string }[] | null;
  materials_url?: string | null;
}

interface Props {
  adventure?: RpgAdventureData;
  systems?: { id: string; name: string }[];
  onSuccess: () => void;
}

const INTENSITY_KEYS = [
  { key: "combate", label: "Combate" },
  { key: "misterio", label: "Mistério" },
  { key: "exploracao", label: "Exploração" },
  { key: "roleplay", label: "Roleplay" },
  { key: "perigo", label: "Perigo" },
];

const RpgAdventureForm = ({ adventure, systems: externalSystems, onSuccess }: Props) => {
  const isCreate = !adventure;

  // basic
  const [name, setName] = useState(adventure?.name || "");
  const [desc, setDesc] = useState(adventure?.description || "");
  const [tag, setTag] = useState<"official" | "homebrew">(adventure?.tag || "official");
  const [imageUrl, setImageUrl] = useState(adventure?.image_url || "");
  const [systemId, setSystemId] = useState(adventure?.system_id || "");
  const [systems, setSystems] = useState<{ id: string; name: string }[]>(externalSystems || []);

  // extended
  const [tagline, setTagline] = useState(adventure?.tagline || "");
  const [aboutLong, setAboutLong] = useState(adventure?.about_long || "");
  const [tone, setTone] = useState(adventure?.tone || "");
  const [genresStr, setGenresStr] = useState((adventure?.genres || []).join(", "));
  const [levelMin, setLevelMin] = useState<string>(adventure?.level_min?.toString() || "");
  const [levelMax, setLevelMax] = useState<string>(adventure?.level_max?.toString() || "");
  const [playersMin, setPlayersMin] = useState<string>(adventure?.players_min?.toString() || "");
  const [playersMax, setPlayersMax] = useState<string>(adventure?.players_max?.toString() || "");
  const [durMin, setDurMin] = useState<string>(adventure?.duration_hours_min?.toString() || "");
  const [durMax, setDurMax] = useState<string>(adventure?.duration_hours_max?.toString() || "");
  const [materialsUrl, setMaterialsUrl] = useState(adventure?.materials_url || "");

  const [intensity, setIntensity] = useState<Record<string, number>>(
    adventure?.intensity || { combate: 0, misterio: 0, exploracao: 0, roleplay: 0, perigo: 0 }
  );
  const [highlights, setHighlights] = useState<{ title: string; description: string }[]>(
    adventure?.highlights || []
  );
  const [materials, setMaterials] = useState<{ label: string; value: string }[]>(
    adventure?.materials || []
  );
  const [masterNotes, setMasterNotes] = useState({
    prep: adventure?.master_notes?.prep || "",
    hooks: adventure?.master_notes?.hooks || "",
    variations: adventure?.master_notes?.variations || "",
    secrets: adventure?.master_notes?.secrets || "",
  });

  useEffect(() => {
    if (!externalSystems) {
      supabase.from("rpg_systems").select("id, name").order("name").then(({ data }) => {
        setSystems((data || []) as { id: string; name: string }[]);
      });
    }
  }, [externalSystems]);

  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name,
        description: desc || null,
        tag,
        image_url: imageUrl || null,
        system_id: systemId,
        slug: slugify(name),
        tagline: tagline || null,
        about_long: aboutLong || null,
        tone: tone || null,
        genres: genresStr.split(",").map((g) => g.trim()).filter(Boolean),
        level_min: numOrNull(levelMin),
        level_max: numOrNull(levelMax),
        players_min: numOrNull(playersMin),
        players_max: numOrNull(playersMax),
        duration_hours_min: numOrNull(durMin),
        duration_hours_max: numOrNull(durMax),
        materials_url: materialsUrl || null,
        intensity,
        highlights: highlights.filter((h) => h.title.trim() || h.description.trim()),
        materials: materials.filter((m) => m.label.trim() || m.value.trim()),
        master_notes: masterNotes,
      };
      if (isCreate) {
        const { error } = await supabase.from("rpg_adventures").insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rpg_adventures").update(payload as any).eq("id", adventure.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isCreate ? "Aventura adicionada!" : "Aventura atualizada!");
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateHighlight = (i: number, field: "title" | "description", v: string) => {
    setHighlights((arr) => arr.map((h, idx) => (idx === i ? { ...h, [field]: v } : h)));
  };
  const updateMaterial = (i: number, field: "label" | "value", v: string) => {
    setMaterials((arr) => arr.map((m, idx) => (idx === i ? { ...m, [field]: v } : m)));
  };

  return (
    <div className="space-y-4">
      {/* BÁSICO */}
      <div className="space-y-2">
        <Label>Sistema *</Label>
        <Select value={systemId} onValueChange={setSystemId}>
          <SelectTrigger><SelectValue placeholder="Selecione o sistema" /></SelectTrigger>
          <SelectContent>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da aventura" />
      </div>
      <div className="space-y-2">
        <Label>Tagline (frase curta de impacto)</Label>
        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: Uma jornada épica pelas terras esquecidas" />
      </div>
      <div className="space-y-2">
        <Label>Descrição curta</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Sobre a aventura (texto longo)</Label>
        <Textarea rows={5} value={aboutLong} onChange={(e) => setAboutLong(e.target.value)} placeholder="Descrição detalhada, sinopse, ambientação..." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tag} onValueChange={(v) => setTag(v as "official" | "homebrew")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="official">📖 Oficial</SelectItem>
              <SelectItem value="homebrew">🏠 Homebrew</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tom</Label>
          <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ex: Sombrio, Heróico" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Gêneros (separados por vírgula)</Label>
        <Input value={genresStr} onChange={(e) => setGenresStr(e.target.value)} placeholder="Fantasia, Investigação, Horror" />
      </div>

      <Accordion type="multiple" className="border-t border-border pt-2">
        {/* ESTATÍSTICAS */}
        <AccordionItem value="stats">
          <AccordionTrigger className="text-sm">Estatísticas (nível, jogadores, duração)</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Nível mín.</Label><Input type="number" value={levelMin} onChange={(e) => setLevelMin(e.target.value)} /></div>
              <div><Label className="text-xs">Nível máx.</Label><Input type="number" value={levelMax} onChange={(e) => setLevelMax(e.target.value)} /></div>
              <div><Label className="text-xs">Jogadores mín.</Label><Input type="number" value={playersMin} onChange={(e) => setPlayersMin(e.target.value)} /></div>
              <div><Label className="text-xs">Jogadores máx.</Label><Input type="number" value={playersMax} onChange={(e) => setPlayersMax(e.target.value)} /></div>
              <div><Label className="text-xs">Duração mín. (h)</Label><Input type="number" value={durMin} onChange={(e) => setDurMin(e.target.value)} /></div>
              <div><Label className="text-xs">Duração máx. (h)</Label><Input type="number" value={durMax} onChange={(e) => setDurMax(e.target.value)} /></div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* INTENSIDADE */}
        <AccordionItem value="intensity">
          <AccordionTrigger className="text-sm">Intensidade (0–4)</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {INTENSITY_KEYS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[1fr_120px] items-center gap-2">
                <Label className="text-xs">{label}</Label>
                <Select
                  value={String(intensity[key] ?? 0)}
                  onValueChange={(v) => setIntensity((s) => ({ ...s, [key]: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">—</SelectItem>
                    <SelectItem value="1">Baixa</SelectItem>
                    <SelectItem value="2">Média</SelectItem>
                    <SelectItem value="3">Alta</SelectItem>
                    <SelectItem value="4">Muito alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* DESTAQUES */}
        <AccordionItem value="highlights">
          <AccordionTrigger className="text-sm">O que torna especial (destaques)</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {highlights.map((h, i) => (
              <div key={i} className="space-y-1.5 border border-border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <Input value={h.title} onChange={(e) => updateHighlight(i, "title", e.target.value)} placeholder="Título" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setHighlights((arr) => arr.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea rows={2} value={h.description} onChange={(e) => updateHighlight(i, "description", e.target.value)} placeholder="Descrição" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setHighlights((arr) => [...arr, { title: "", description: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar destaque
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* NOTAS DO MESTRE */}
        <AccordionItem value="master">
          <AccordionTrigger className="text-sm">Notas para o Mestre</AccordionTrigger>
          <AccordionContent className="space-y-2">
            <div><Label className="text-xs">Preparação</Label><Textarea rows={2} value={masterNotes.prep} onChange={(e) => setMasterNotes((s) => ({ ...s, prep: e.target.value }))} /></div>
            <div><Label className="text-xs">Ganchos</Label><Textarea rows={2} value={masterNotes.hooks} onChange={(e) => setMasterNotes((s) => ({ ...s, hooks: e.target.value }))} /></div>
            <div><Label className="text-xs">Variações</Label><Textarea rows={2} value={masterNotes.variations} onChange={(e) => setMasterNotes((s) => ({ ...s, variations: e.target.value }))} /></div>
            <div><Label className="text-xs">Segredos / spoilers</Label><Textarea rows={2} value={masterNotes.secrets} onChange={(e) => setMasterNotes((s) => ({ ...s, secrets: e.target.value }))} /></div>
          </AccordionContent>
        </AccordionItem>

        {/* MATERIAIS */}
        <AccordionItem value="materials">
          <AccordionTrigger className="text-sm">Materiais inclusos</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {materials.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input value={m.label} onChange={(e) => updateMaterial(i, "label", e.target.value)} placeholder="Item (ex: Mapas)" />
                <Input value={m.value} onChange={(e) => updateMaterial(i, "value", e.target.value)} placeholder="Detalhe (ex: 6 PDFs)" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials((arr) => arr.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setMaterials((arr) => [...arr, { label: "", value: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar material
            </Button>
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">URL para download dos materiais</Label>
              <Input value={materialsUrl} onChange={(e) => setMaterialsUrl(e.target.value)} placeholder="https://..." />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim() || !systemId} className="w-full">
        {saveMutation.isPending ? "Salvando..." : isCreate ? "Adicionar" : "Salvar"}
      </Button>
    </div>
  );
};

export default RpgAdventureForm;
