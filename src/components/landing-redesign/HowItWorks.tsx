import { SectionHead } from "./SectionHead";

const steps = [
  {
    n: "01",
    title: "Crie sua conta",
    body: "Em 30 segundos, sem cartão. Conta o que você joga e seus interesses.",
  },
  {
    n: "02",
    title: "Entre na Comunidade",
    body: "Conheça os jogadores, descubra grupos e veja quem joga o que você curte.",
  },
  {
    n: "03",
    title: "Agende e suba no ranking",
    body: "Confirme presença, registre o resultado e acompanhe seu MMR a cada season.",
  },
];

export const HowItWorks = () => (
  <section id="como-funciona" className="border-t border-border/60 py-20 md:py-24">
    <div className="container">
      <SectionHead
        eyebrow="Como funciona"
        title={<>Da inscrição à mesa em três passos.</>}
        description="Sem onboarding cheio. Você cria a conta, entra na comunidade e já encontra a próxima partida."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-2xl border border-border/60 overflow-hidden bg-surface">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className={`relative p-8 md:p-10 ${
              i > 0 ? "border-t md:border-t-0 md:border-l border-border/60" : ""
            }`}
          >
            <p className="mono text-[11px] uppercase tracking-[0.18em] text-gold mb-8">
              {s.n} / 03
            </p>
            <h3 className="display-tight font-bold text-xl md:text-2xl mb-3">{s.title}</h3>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
