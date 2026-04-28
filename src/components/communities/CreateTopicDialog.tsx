import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTopic, useTopicCategories } from "@/hooks/useCommunityDiscussions";
import { Plus } from "lucide-react";

interface Props {
  communityId: string;
  defaultCategoryId?: string | null;
  trigger?: React.ReactNode;
}

const CreateTopicDialog = ({ communityId, defaultCategoryId, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId ?? null);
  const { data: categories = [] } = useTopicCategories(communityId);
  const create = useCreateTopic();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      community_id: communityId,
      category_id: categoryId,
      title: title.trim(),
      body: body.trim(),
    });
    setOpen(false);
    setTitle("");
    setBody("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="gold" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo tópico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar tópico</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId ?? ""} onValueChange={(v) => setCategoryId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Conteúdo</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={handleSubmit} disabled={!title.trim() || create.isPending}>
              {create.isPending ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTopicDialog;
