import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export interface RpgSystemData {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
}

interface Props {
  system: RpgSystemData;
  onSuccess: () => void;
}

const RpgSystemForm = ({ system, onSuccess }: Props) => {
  const [name, setName] = useState(system.name);
  const [desc, setDesc] = useState(system.description || "");
  const [imageUrl, setImageUrl] = useState(system.image_url || "");
  const [rulesUrl, setRulesUrl] = useState(system.rules_url || "");
  const [videoUrl, setVideoUrl] = useState(system.video_url || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("rpg_systems")
        .update({
          name,
          description: desc || null,
          image_url: imageUrl || null,
          rules_url: rulesUrl || null,
          video_url: videoUrl || null,
        } as any)
        .eq("id", system.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sistema atualizado!");
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div className="grid gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label>URL Regras</Label>
          <Input value={rulesUrl} onChange={(e) => setRulesUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URL Vídeo</Label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        </div>
      </div>
      <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
};

export default RpgSystemForm;
