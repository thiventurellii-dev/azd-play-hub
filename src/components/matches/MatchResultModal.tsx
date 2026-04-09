import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil } from "lucide-react";
import BoardgameResult from "./BoardgameResult";
import BotCResult from "./BotCResult";
import RPGResult from "./RPGResult";

interface Props {
  resultId: string;
  resultType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  participantIds?: string[];
}

const MatchResultModal = ({ resultId, resultType, open, onOpenChange, onEdit, participantIds }: Props) => {
  const { user, isAdmin } = useAuth();
  const canEdit = isAdmin || (participantIds ?? []).includes(user?.id ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Resultado da Partida</DialogTitle>
            {canEdit && onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar resultado">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {resultType === "boardgame" && <BoardgameResult resultId={resultId} />}
        {resultType === "blood" && <BotCResult resultId={resultId} />}
        {resultType === "rpg" && <RPGResult resultId={resultId} />}
      </DialogContent>
    </Dialog>
  );
};

export default MatchResultModal;
