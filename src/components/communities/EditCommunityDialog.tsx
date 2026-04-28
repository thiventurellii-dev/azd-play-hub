import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntitySheet } from "@/components/shared/EntitySheet";
import { supabase } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { CommunityFull } from "@/hooks/useCommunityDetail";

interface Props {
  community: CommunityFull;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCommunityDialog = ({ community, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [name, setName] = useState(community.name);
  const [tagline, setTagline] = useState(community.tagline ?? "");
  const [description, setDescription] = useState(community.description ?? "");
  const [logoUrl, setLogoUrl] = useState(community.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(community.cover_url ?? "");
  const [country, setCountry] = useState(community.country ?? "");
  const [tags, setTags] = useState((community.tags ?? []).join(", "));
  const [communityType, setCommunityType] = useState(community.community_type);
  const [joinPolicy, setJoinPolicy] = useState(community.join_policy);
  const [visibility, setVisibility] = useState(community.visibility);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(community.name);
    setTagline(community.tagline ?? "");
    setDescription(community.description ?? "");
    setLogoUrl(community.logo_url ?? "");
    setCoverUrl(community.cover_url ?? "");
    setCountry(community.country ?? "");
    setTags((community.tags ?? []).join(", "));
    setCommunityType(community.community_type);
    setJoinPolicy(community.join_policy);
    setVisibility(community.visibility);
  }, [open, community]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome à comunidade");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase
      .from("communities" as any)
      .update({
        name: name.trim().slice(0, 100),
        tagline: tagline.trim().slice(0, 160) || null,
        description: description.trim().slice(0, 2000) || null,
        logo_url: logoUrl.trim() || null,
        cover_url: coverUrl.trim() || null,
        country: country.trim() || community.country,
        community_type: communityType,
        join_policy: joinPolicy,
        visibility,
      })
      .eq("id", community.id);

    if (error) {
      setSubmitting(false);
      toast.error("Erro ao atualizar comunidade");
      return;
    }

    // Sync tags
    const desiredNames = Array.from(
      new Set(
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => t.slice(0, 30))
      )
    );

    // upsert tag rows
    const tagIds: string[] = [];
    for (const tagName of desiredNames) {
      const { data: existing } = await supabase
        .from("community_tags" as any)
        .select("id")
        .eq("name", tagName)
        .maybeSingle();
      if (existing) {
        tagIds.push((existing as any).id);
      } else {
        const { data: created } = await supabase
          .from("community_tags" as any)
          .insert({ name: tagName })
          .select("id")
          .single();
        if (created) tagIds.push((created as any).id);
      }
    }

    await supabase.from("community_tag_links" as any).delete().eq("community_id", community.id);
    if (tagIds.length > 0) {
      await supabase
        .from("community_tag_links" as any)
        .insert(tagIds.map((tag_id) => ({ community_id: community.id, tag_id })));
    }

    setSubmitting(false);
    toast.success("Comunidade atualizada!");
    qc.invalidateQueries({ queryKey: ["community-detail"] });
    qc.invalidateQueries({ queryKey: ["communities-list"] });
    onOpenChange(false);
  };

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Comunidade"
      description="Atualize as informações da comunidade."
    >
      <div>
        <Label>Nome *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </div>
      <div>
        <Label>Frase curta</Label>
        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>URL do logo</Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>URL da capa</Label>
          <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div>
        <Label>País</Label>
        <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Brasil" />
      </div>
      <div>
        <Label>Tags (separadas por vírgula)</Label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="competitivo, casual, presencial" />
      </div>
      <div className="grid grid-cols-3 gap-3">
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
          <Label>Visibilidade</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Pública</SelectItem>
              <SelectItem value="private">Privada</SelectItem>
              <SelectItem value="invite_only">Por convite</SelectItem>
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
        {submitting ? "Salvando..." : "Salvar alterações"}
      </Button>
    </EntitySheet>
  );
};

export default EditCommunityDialog;
