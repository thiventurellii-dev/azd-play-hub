import { EntitySheet } from "@/components/shared/EntitySheet";
import MatchRoomForm, { type MatchRoomData } from "@/components/forms/MatchRoomForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: MatchRoomData;
  onSaved: () => void;
  isAdminMode?: boolean;
}

const EditRoomDialog = ({ open, onOpenChange, room, onSaved, isAdminMode = false }: Props) => (
  <EntitySheet
    open={open}
    onOpenChange={onOpenChange}
    title="Editar Sala"
    description="Atualize os detalhes da sala de partida."
  >
    <MatchRoomForm
      room={room}
      isAdminMode={isAdminMode}
      onSuccess={() => { onOpenChange(false); onSaved(); }}
    />
  </EntitySheet>
);

export default EditRoomDialog;
