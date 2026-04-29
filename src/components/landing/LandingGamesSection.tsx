import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import brassCover from "@/assets/brass-birmingham-cover.png";
import arnakCover from "@/assets/ruins-of-arnak-cover.png";
import troubleBrewing from "@/assets/trouble-brewing.jpg";
import overTheRiver from "@/assets/over-the-river.png";

const games = [
  {
    type: "Social / Dedutivo",
    name: "Blood on the Clocktower",
    desc: "O jogo de papel social mais complexo e satisfatório já criado. Aldeões contra Demônio em uma batalha de informação, lógica e confiança.",
    image: troubleBrewing,
    stats: [
      { num: "5–20", lbl: "Jogadores" },
      { num: "+180", lbl: "Partidas", gold: true },
      { num: "3+", lbl: "Scripts" },
    ],
  },
  {
    type: "Estratégia / Euro",
    name: "Brass: Birmingham",
    desc: "Construa redes industriais na era vitoriana. Planejamento de longo prazo, cartas, coal e o famoso tabuleiro de Birmingham.",
    image: brassCover,
    stats: [
      { num: "2–4", lbl: "Jogadores" },
      { num: "+90", lbl: "Partidas", gold: true },
      { num: "~3h", lbl: "Duração" },
    ],
  },
  {
    type: "Deck Building",
    name: "Ruins of Arnak",
    desc: "Explore ruínas, combate guardiões e evolua sua pesquisa. Uma mistura elegante de deck building com worker placement.",
    image: arnakCover,
    stats: [
      { num: "1–4", lbl: "Jogadores" },
      { num: "+70", lbl: "Partidas", gold: true },
      { num: "~2h", lbl: "Duração" },
    ],
  },
  {
    type: "Roleplay / RPG",
    name: "Mesas de RPG",
    desc: "Aventuras narrativas em sistemas variados. Crie personagens, viva histórias compartilhadas e construa campanhas com a comunidade.",
    image: overTheRiver,
    stats: [
      { num: "3–6", lbl: "Jogadores" },
      { num: "Várias", lbl: "Sessões", gold: true },
      { num: "Multi", lbl: "Sistemas" },
    ],
  },
];

export const LandingGamesSection = () => (
  <section id="jogos" className="bg-surface border-y border-border py-20 md:py-28">
    <div className="container">
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <motion.p {...fadeUp(0)} className="inline-flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.18em] uppercase text-gold mb-4">
          Catálogo
        </motion.p>
        <motion.h2 {...fadeUp(0.1)} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
          Os jogos que<br /><span className="text-gold">nos unem</span>
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
          Do dedutivo social, ao europesado ou roleplay — a comunidade AzD abraça uma variedade de títulos. Cada jogo tem seu próprio espaço com regras, scripts e histórico de partidas.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {games.map((g, i) => (
          <motion.div
            key={g.name}
            {...fadeUp(0.1 + i * 0.08)}
            className="bg-card border border-border rounded-2xl overflow-hidden hover:border-gold/40 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_16px_48px_-12px_hsl(var(--gold)/0.15)] flex flex-col"
          >
            <div className="aspect-[4/3] bg-surface-raised overflow-hidden">
              <img
                src={g.image}
                alt={g.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="text-[0.7rem] font-bold uppercase tracking-wider text-gold mb-1">{g.type}</div>
              <div className="text-lg font-bold mb-2">{g.name}</div>
              <div className="text-sm text-muted-foreground leading-relaxed flex-1">{g.desc}</div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                {g.stats.map((s) => (
                  <div key={s.lbl} className="flex flex-col">
                    <span className={`text-sm font-bold tabular-nums ${s.gold ? "text-gold" : ""}`}>{s.num}</span>
                    <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">{s.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
