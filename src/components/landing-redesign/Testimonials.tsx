import { SectionHead } from "./SectionHead";

const testimonials = [
  {
    text: "Comecei sem conhecer quase ninguém. Depois de alguns jogos, fiz amigos que jogo até hoje. A plataforma ajuda muito a manter tudo organizado.",
    initials: "FC",
    name: "Felipe C.",
    role: "Membro desde 2018",
    bg: "hsl(220 50% 35%)",
  },
  {
    text: "O Blood on the Clocktower aqui é de outro nível. Scripts variados, jogadores experientes, mas que recebem bem os novatos. Sempre alguém animado pra jogar no final de semana.",
    initials: "AT",
    name: "Ana T.",
    role: "Membro desde 2023 · Jogadora BotC",
    bg: "hsl(160 40% 28%)",
  },
  {
    text: "Disputar e ganhar as seasons é muito bom, mas o melhor mesmo é o papo depois das partidas. Esses são os momentos que me ficam guardados.",
    initials: "TV",
    name: "Thiago V.",
    role: "Membro desde 2012 · 1º lugar S1",
    bg: "hsl(43 60% 28%)",
  },
];

export const Testimonials = () => (
  <section id="depoimentos" className="border-t border-border/60 py-20 md:py-24">
    <div className="container">
      <SectionHead
        eyebrow="Quem já está numa mesa toda semana"
        title={<>O que a galera diz da AzD.</>}
        description="Histórias reais de quem entrou na comunidade e nunca mais largou o tabuleiro."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-border/60 bg-surface p-7 flex flex-col"
          >
            <p className="text-base text-foreground/90 leading-relaxed mb-6 flex-1">
              "{t.text}"
            </p>
            <div className="flex items-center gap-3 pt-5 border-t border-border/60">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-background flex-shrink-0"
                style={{ background: t.bg }}
              >
                {t.initials}
              </div>
              <div>
                <div className="text-sm font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
