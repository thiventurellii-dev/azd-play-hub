import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { createGuestPlayer, type GuestPlayer } from "@/lib/guestPlayers";
import { UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (guest: GuestPlayer) => void;
}

const AddGuestDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setNickname(""); setName(""); setEmail(""); setPhone("");
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      notify("error", "Nick é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const guest = await createGuestPlayer(
        { nickname, name, email, phone },
        user?.id || null,
      );
      if (guest) {
        notify("success", `Convidado "${guest.nickname}" criado`);
        onCreated?.(guest);
        reset();
        onOpenChange(false);
      }
    } catch (err: any) {
      notify("error", err.message || "Erro ao criar convidado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-gold" />
            Adicionar convidado
          </DialogTitle>
          <DialogDescription>
            Crie um perfil de jogador sem conta. Ele poderá reivindicar o perfil depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="guest-nick">Nick <span className="text-destructive">*</span></Label>
            <Input
              id="guest-nick"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Como ele é chamado na mesa"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Nome completo</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-email">E-mail</Label>
            <Input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Opcional — ajuda no pareamento futuro"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-phone">Telefone</Label>
            <Input
              id="guest-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Convidados aparecem no histórico e estatísticas, mas não computam MMR/ranking até reivindicarem o perfil.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="gold" onClick={handleSave} disabled={saving || !nickname.trim()}>
            {saving ? "Criando..." : "Criar convidado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddGuestDialog;
