import { Button } from "@/components/ui/button";
import { Check, LogOut, Lock, Hourglass, UserPlus } from "lucide-react";
import { useCommunityMembership } from "@/hooks/useCommunityMembership";

interface Props {
  communityId: string;
  joinPolicy: "open" | "approval" | "invite_only";
}

const JoinCommunityButton = ({ communityId, joinPolicy }: Props) => {
  const { state, loading, join, leave } = useCommunityMembership(communityId, joinPolicy);

  if (state.status === "active") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm text-green-400">
          <Check className="h-4 w-4" /> {state.role === "leader" ? "Líder" : state.role === "moderator" ? "Moderador" : "Membro"}
        </span>
        {state.role !== "leader" && (
          <Button variant="outline" size="sm" disabled={loading} onClick={leave}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        )}
      </div>
    );
  }
  if (state.status === "pending") {
    return (
      <Button variant="outline" disabled>
        <Hourglass className="h-4 w-4 mr-1" /> Pedido enviado
      </Button>
    );
  }
  if (state.status === "banned") {
    return (
      <Button variant="outline" disabled>
        <Lock className="h-4 w-4 mr-1" /> Banido
      </Button>
    );
  }
  return (
    <Button variant="gold" disabled={loading} onClick={join}>
      <UserPlus className="h-4 w-4 mr-1" />
      {joinPolicy === "open"
        ? "Entrar na comunidade"
        : joinPolicy === "approval"
          ? "Solicitar entrada"
          : "Apenas por convite"}
    </Button>
  );
};

export default JoinCommunityButton;
