import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

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

export const LandingTestimonials = () => (
  <section id="comunidade" className="relative overflow-hidden py-20 md:py-28">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,hsl(var(--gold)/0.06),transparent_70%)] pointer-events-none" />
    <div className="container relative">
      <motion.blockquote {...fadeUp(0)} className="text-center text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
        "Mais do que jogar,<br />
        <span className="text-gold">construímos amizades."</span>
      </motion.blockquote>
      <motion.p {...fadeUp(0.15)} className="mt-6 text-center text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
        A AzD é uma comunidade de pessoas com interesses em comum. Pessoas que se divertem, competem e já planejam as próximas partidas antes mesmo de finalizar a atual!
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
