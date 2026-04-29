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
      <Button variant="gold" className="min-h-[44px] w-full sm:w-[200px] px-3" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4 mr-1 shrink-0" /> Agendar Partida
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Sala de Partida</DialogTitle>
            <DialogDescription>
              Crie uma sala para agendar uma partida com outros jogadores.
            </DialogDescription>
          </DialogHeader>
          <MatchRoomForm
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
