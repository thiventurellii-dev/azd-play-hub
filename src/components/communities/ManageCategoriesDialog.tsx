import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Trash2, Plus } from "lucide-react";
import {
  useTopicCategories,
  useCreateCategory,
  useDeleteCategory,
} from "@/hooks/useCommunityDiscussions";

interface Props {
  communityId: string;
}

const ManageCategoriesDialog = ({ communityId }: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { data: categories = [] } = useTopicCategories(communityId);
  const create = useCreateCategory();
  const del = useDeleteCategory();

  const handleAdd = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({ community_id: communityId, name: name.trim() });
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" /> Categorias
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button variant="gold" onClick={handleAdd} disabled={!name.trim() || create.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="divide-y divide-border max-h-72 overflow-y-auto">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">/{c.slug}</p>
                </div>
                {c.slug !== "geral" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => del.mutate({ id: c.id, community_id: communityId })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
            {categories.length === 0 && (
              <li className="py-4 text-center text-sm text-muted-foreground">Nenhuma categoria</li>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;
