import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import MatchRoomForm from "@/components/forms/MatchRoomForm";

interface Props {
  onCreated: () => void;
}

const CreateRoomDialog = ({ onCreated }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="gold" className="min-h-[44px] w-full sm:w-auto px-3" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4 mr-1 shrink-0" /> Agendar Partida / Sessão
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar partida ou sessão</DialogTitle>
            <DialogDescription>
              Crie uma sala pra reunir jogadores em um momento futuro.
            </DialogDescription>
          </DialogHeader>
          <MatchRoomForm
            hideHeader
            onSuccess={() => {
              setOpen(false);
              onCreated();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateRoomDialog;
