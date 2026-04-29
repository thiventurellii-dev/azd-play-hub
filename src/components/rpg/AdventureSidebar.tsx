import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { AdventureDetail } from '@/hooks/useRpgAdventureDetail';

interface Props { adventure: AdventureDetail; }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
    {children}
  </div>
);

const AdventureSidebar = ({ adventure }: Props) => {
  const materials = adventure.materials || [];

  return (
    <div className="space-y-3">
      <Section title="Estatísticas no AzD">
        <div className="grid gap-3">
          <div>
            <p className="text-2xl font-bold text-gold leading-none">0</p>
            <p className="text-[10px] text-muted-foreground mt-1">sessões realizadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">0h</p>
            <p className="text-[10px] text-muted-foreground mt-1">horas acumuladas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400 leading-none">0</p>
            <p className="text-[10px] text-muted-foreground mt-1">campanhas em curso</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-3 italic">
          Estatísticas serão calculadas conforme sessões forem registradas.
        </p>
      </Section>

      {adventure.system && (
        <Section title="Compatibilidade">
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {adventure.system.name}
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2">Adaptável a outros sistemas</p>
        </Section>
      )}

      {(materials.length > 0 || adventure.materials_url) && (
        <Section title="Inclui">
          {materials.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-muted-foreground py-1 border-b border-border/40 last:border-0">
              <span>{m.label}</span>
              <span className="text-foreground/80">{m.value}</span>
            </div>
          ))}
          {adventure.materials_url && (
            <Button asChild variant="outline" size="sm" className="w-full mt-3 border-gold/30 text-gold hover:bg-gold/10">
              <a href={adventure.materials_url} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar materiais
              </a>
            </Button>
          )}
        </Section>
      )}
    </div>
  );
};

export default AdventureSidebar;
