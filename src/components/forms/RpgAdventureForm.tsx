import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export interface RpgAdventureData {
  id: string;
  name: string;
  description: string | null;
  tag: "official" | "homebrew";
  image_url: string | null;
  system_id: string;
}

interface Props {
  adventure: RpgAdventureData;
  onSuccess: () => void;
}

const RpgAdventureForm = ({ adventure, onSuccess }: Props) => {
  const [name, setName] = useState(adventure.name);
  const [desc, setDesc] = useState(adventure.description || "");
  const [tag, setTag] = useState<"official" | "homebrew">(adventure.tag);
  const [imageUrl, setImageUrl] = useState(adventure.image_url || "");
  const [systemId, setSystemId] = useState(adventure.system_id);
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("rpg_systems").select("id, name").order("name").then(({ data }) => {
      setSystems((data || []) as { id: string; name: string }[]);
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("rpg_adventures")
        .update({
          name,
          description: desc || null,
          tag,
          image_url: imageUrl || null,
          system_id: systemId,
        } as any)
        .eq("id", adventure.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aventura atualizada!");
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sistema</Label>
        <Select value={systemId} onValueChange={setSystemId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
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
        <Label>URL da Imagem</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
};

export default RpgAdventureForm;
