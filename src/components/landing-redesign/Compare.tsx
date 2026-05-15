import { Check, X } from "lucide-react";
import { SectionHead } from "./SectionHead";

const rows: { without: string; with: string }[] = [
  {
    without: "Grupos de WhatsApp bagunçados, mensagens perdidas",
    with: "Salas com confirmação, vagas e lembrete automático",
  },
  {
    without: "“Quem ganhou semana passada?” Ninguém lembra",
    with: "Histórico persistente com pontuação e posições",
  },
  {
    without: "Difícil encontrar gente nova pra jogar",
    with: "Comunidade aberta, com quem joga o que você curte",
  },
  {
    without: "Sem nenhum tipo de progressão ou ranking",
    with: "MMR atualizado a cada partida e seasons mensais",
  },
  {
    without: "Sempre os mesmos 3 jogos, ninguém arrisca novidades",
    with: "Catálogo com o que está sendo jogado de fato",
  },
];

export const Compare = () => (
  <section className="border-t border-border/60 bg-surface py-20 md:py-24">
    <div className="container">
      <SectionHead
        eyebrow="Por quê AzD"
        title={<>O que muda na prática.</>}
        description="Não é “mais um app”. É a diferença entre marcar partida no grupo da família e ter um sistema feito pra quem leva o hobby a sério."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-background p-7">
          <div className="flex items-center justify-between mb-5">
            <span className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Sem AzD
            </span>
            <span className="text-2xl font-bold text-muted-foreground/50">—</span>
          </div>
          <ul className="divide-y divide-border/40">
            {rows.map((r) => (
              <li key={r.without} className="py-3.5 flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center">
                  <X className="w-3 h-3 text-muted-foreground" />
                </span>
                <span>{r.without}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-background p-7 border-gold/40 shadow-[0_30px_60px_-40px_hsl(43_100%_50%/0.5)]">
          <div className="flex items-center justify-between mb-5">
            <span className="mono text-[11px] uppercase tracking-[0.18em] text-gold">
              Com AzD
            </span>
            <span className="text-2xl font-bold text-gold">+</span>
          </div>
          <ul className="divide-y divide-border/40">
            {rows.map((r) => (
              <li key={r.with} className="py-3.5 flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-gold" />
                </span>
                <span>{r.with}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);
