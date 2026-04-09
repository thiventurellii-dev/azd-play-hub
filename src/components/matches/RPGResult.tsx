import { Sword } from "lucide-react";

interface Props {
  resultId: string;
}

const RPGResult = ({ resultId: _resultId }: Props) => {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
      <Sword className="h-10 w-10 opacity-30" />
      <p className="text-sm">Resultados de RPG em breve</p>
    </div>
  );
};

export default RPGResult;
