import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  notes?: { prep?: string; hooks?: string; variations?: string; secrets?: string } | null;
}

const AdventureMasterNotes = ({ notes }: Props) => {
  const n = notes || {};
  const items: { key: string; label: string; content?: string; danger?: boolean }[] = [
    { key: 'prep', label: 'Dicas de preparação', content: n.prep },
    { key: 'hooks', label: 'Ganchos da aventura', content: n.hooks },
    { key: 'variations', label: 'Ajustes e variações', content: n.variations },
    { key: 'secrets', label: 'Segredos e spoilers', content: n.secrets, danger: true },
  ];
  const visible = items.filter(i => i.content && i.content.trim());
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem notas para o mestre ainda.</p>;
  }
  return (
    <Accordion type="multiple" className="w-full">
      {visible.map(item => (
        <AccordionItem value={item.key} key={item.key} className="border-border/50">
          <AccordionTrigger className="text-sm hover:no-underline py-3">
            <span className={item.danger ? 'flex items-center gap-2 text-amber-400' : ''}>
              {item.danger && <AlertTriangle className="h-3.5 w-3.5" />}
              {item.label}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default AdventureMasterNotes;
