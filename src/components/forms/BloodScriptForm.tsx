import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export interface BloodScriptFormData {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  image_url: string | null;
  victory_conditions: string[];
}

interface Props {
  script: BloodScriptFormData;
  onSuccess: () => void;
}

const BloodScriptForm = ({ script, onSuccess }: Props) => {
  const [name, setName] = useState(script.name);
  const [desc, setDesc] = useState(script.description || "");
  const [imageUrl, setImageUrl] = useState(script.image_url || "");
  const [victoryConditions, setVictoryConditions] = useState<string[]>([...script.victory_conditions]);
  const [newCondition, setNewCondition] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updateData: any = {
        name,
        description: desc || null,
        victory_conditions: victoryConditions,
        image_url: imageUrl || null,
      };
      const { error } = await supabase.from("blood_scripts").update(updateData).eq("id", script.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Script atualizado!");
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
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.png" />
      </div>
      <div className="space-y-2">
        <Label>Condições de Vitória Especiais</Label>
        <div className="space-y-2">
          {victoryConditions.map((vc, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={vc}
                onChange={(e) => {
                  const updated = [...victoryConditions];
                  updated[i] = e.target.value;
                  setVictoryConditions(updated);
                }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setVictoryConditions(victoryConditions.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="Ex: Vitória pelo Prefeito" />
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                if (newCondition.trim()) {
                  setVictoryConditions([...victoryConditions, newCondition.trim()]);
                  setNewCondition("");
                }
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>
      <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
};

export default BloodScriptForm;
