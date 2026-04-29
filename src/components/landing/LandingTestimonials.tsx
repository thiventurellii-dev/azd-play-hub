import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const testimonials = [
  {
    text: "Comecei sem conhecer quase ninguém. Depois de umas três seasons, tinha amigos que jogaria com até hoje. A plataforma ajudou muito a manter tudo organizado.",
    initials: "FC",
    name: "Felipe C.",
    role: "Membro desde 2022 · 2º lugar S6",
    bg: "hsl(220 50% 35%)",
  },
  {
    text: "O Blood on the Clocktower aqui é de outro nível. Scripts variados, jogadores experientes, e sempre alguém animado pra jogar no final de semana.",
    initials: "AT",
    name: "Ana T.",
    role: "Membro desde 2023 · Veterana BotC",
    bg: "hsl(160 40% 28%)",
  },
  {
    text: "Ver minhas estatísticas evoluindo a cada partida é viciante. Mas o melhor mesmo é o papo depois da mesa — esses são os momentos que ficam.",
    initials: "GS",
    name: "Gustavo S.",
    role: "Membro desde 2023 · 4º lugar S6",
    bg: "hsl(43 60% 28%)",
  },
];

export const LandingTestimonials = () => (
  <section id="comunidade" className="relative overflow-hidden py-20 md:py-28">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,hsl(var(--gold)/0.06),transparent_70%)] pointer-events-none" />
    <div className="container relative">
      <motion.blockquote {...fadeUp(0)} className="text-center text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
        "Mais do que jogar,<br />
        <span className="text-gold">construímos amizades."</span>
      </motion.blockquote>
      <motion.p {...fadeUp(0.15)} className="mt-6 text-center text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
        A AzD é uma comunidade real — de pessoas que se encontram, passam horas na mesa, celebram vitórias e já planejam a próxima partida antes de ir embora.
      </motion.p>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            {...fadeUp(0.2 + i * 0.1)}
            className="bg-card border border-border rounded-2xl p-6 text-left"
          >
            <p className="text-sm md:text-[0.95rem] text-muted-foreground italic leading-relaxed mb-5">
              "{t.text}"
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-background flex-shrink-0"
                style={{ background: t.bg }}
              >
                {t.initials}
              </div>
              <div>
                <div className="text-sm font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
