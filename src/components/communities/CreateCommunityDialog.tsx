import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntitySheet } from "@/components/shared/EntitySheet";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

const CreateCommunityDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [communityType, setCommunityType] = useState<"boardgame" | "botc" | "rpg" | "mixed">("mixed");
  const [joinPolicy, setJoinPolicy] = useState<"open" | "approval" | "invite_only">("open");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Faça login para criar uma comunidade");
      return;
    }
    if (!name.trim()) {
      toast.error("Dê um nome à comunidade");
      return;
    }
    setSubmitting(true);
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let attempt = 0;
    // ensure unique slug
    while (attempt < 5) {
      const { data: existing } = await supabase
        .from("communities" as any)
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      attempt += 1;
      slug = `${baseSlug}-${Math.floor(Math.random() * 9999)}`;
    }
    const { data, error } = await supabase
      .from("communities" as any)
      .insert({
        name: name.trim(),
        slug,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
        community_type: communityType,
        join_policy: joinPolicy,
        visibility: "public",
        created_by: user.id,
      })
      .select("slug")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao criar comunidade");
      return;
    }
    toast.success("Comunidade criada!");
    qc.invalidateQueries({ queryKey: ["communities-list"] });
    setOpen(false);
    navigate(`/comunidades/${(data as any).slug}`);
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="gold" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Criar comunidade
        </Button>
      )}
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Nova Comunidade"
        description="Crie um hub para reunir jogadores."
      >
        <div>
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Casa do Dados" />
        </div>
        <div>
          <Label>Frase curta</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Jogar, competir e evoluir juntos" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div>
          <Label>URL do logo (opcional)</Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={communityType} onValueChange={(v) => setCommunityType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Misto</SelectItem>
                <SelectItem value="boardgame">Boardgames</SelectItem>
                <SelectItem value="botc">Blood on the Clocktower</SelectItem>
                <SelectItem value="rpg">RPG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Entrada</Label>
            <Select value={joinPolicy} onValueChange={(v) => setJoinPolicy(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberta</SelectItem>
                <SelectItem value="approval">Aprovação</SelectItem>
                <SelectItem value="invite_only">Por convite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="gold" className="w-full mt-2" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Criando..." : "Criar comunidade"}
        </Button>
      </EntitySheet>
    </>
  );
};

export default CreateCommunityDialog;
