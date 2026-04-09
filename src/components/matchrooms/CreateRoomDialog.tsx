import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { EntitySheet } from "@/components/shared/EntitySheet";
import MatchRoomForm from "@/components/forms/MatchRoomForm";

interface Props {
  onCreated: () => void;
}

const CreateRoomDialog = ({ onCreated }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="gold" className="flex-1 sm:flex-none min-h-[44px]" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4 mr-1" /> Agendar Partida
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Nova Sala de Partida"
        description="Crie uma sala para agendar uma partida com outros jogadores."
      >
        <MatchRoomForm
          onSuccess={() => { setOpen(false); onCreated(); }}
        />
      </EntitySheet>
    </>
  );
};

export default CreateRoomDialog;
