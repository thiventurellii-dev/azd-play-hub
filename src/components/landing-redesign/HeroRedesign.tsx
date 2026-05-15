import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLandingData } from "@/hooks/useLandingData";
import azdLogo from "@/assets/azd-logo.png";

function formatMmr(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const HeroRedesign = () => {
  const { activeSeason, topPlayers } = useLandingData();

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 400px at 80% -10%, hsl(43 100% 50% / 0.18), transparent 60%), radial-gradient(600px 300px at 0% 30%, hsl(220 80% 50% / 0.10), transparent 60%)",
        }}
      />
      <div className="container relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-14 py-20 md:py-28 items-center">
        {/* Left */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 mb-7"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Plataforma da Comunidade AzD
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="display-tight font-black text-[clamp(40px,6.4vw,76px)] mb-5"
          >
            Mais do que jogar,
            <br />
            <span className="text-gold">construímos amizades</span>
            <span className="text-muted-foreground/60">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl"
          >
            Agende partidas, entre em comunidades, acompanhe seu MMR em seasons e conecte-se
            com quem ama jogos de mesa, RPG e Blood on the Clocktower. Tudo num só lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-gold text-gold-foreground font-semibold hover:bg-gold/90 transition-all hover:-translate-y-0.5"
            >
              Criar conta grátis
            </Link>
            <a
              href="#comunidades"
              className="inline-flex items-center justify-center h-14 px-8 rounded-full border border-border text-foreground font-medium hover:border-muted-foreground hover:bg-surface-raised transition-all hover:-translate-y-0.5"
            >
              Ver como funciona →
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-5 text-sm text-muted-foreground"
          >
            <span className="text-gold">✓</span> Em 1 minuto você está numa sala.
          </motion.p>
        </div>

        {/* Right — mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
          style={{ perspective: 1400 }}
        >
          <div
            className="space-y-3.5"
            style={{ transform: "rotateY(-6deg) rotateX(4deg)", transformStyle: "preserve-3d" }}
          >
            {/* Card 1 — Ranking */}
            <div className="bg-surface-raised border border-gold/30 rounded-2xl p-5 shadow-[0_30px_60px_-30px_hsl(43_100%_50%/0.4)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span>🏆</span>
                  <span className="truncate">{activeSeason?.name ?? "Season ativa"}</span>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {activeSeason ? `encerra em ${activeSeason.daysLeft}d` : "—"}
                </span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {(topPlayers.length
                  ? topPlayers
                  : [
                      { name: "—", mmr: 0 },
                      { name: "—", mmr: 0 },
                      { name: "—", mmr: 0 },
                    ]
                ).slice(0, 4).map((p, i) => (
                  <li
                    key={i}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                      i === 0 ? "bg-gold/10 border border-gold/30" : ""
                    }`}
                  >
                    <span className={`truncate ${i === 0 ? "text-gold font-semibold" : ""}`}>
                      {i + 1}. {p.name}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {p.mmr ? formatMmr(p.mmr) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2 — Sala / Logo */}
            <div className="bg-surface-raised border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src={azdLogo} alt="AzD" className="h-7 w-auto invert" />
                  <span className="text-sm font-bold">Comunidade Amizade</span>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-domain-positive">
                  ativa
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Boardgames, RPG e Blood on the Clocktower. Toda semana tem mesa.
              </p>
            </div>

            {/* Card 3 — Partida recente */}
            <div className="bg-surface-raised border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span>🎲</span>
                  <span className="font-medium">Próxima sessão</span>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  agendar agora
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full w-3/4 bg-gold rounded-full" />
                </div>
                <span className="text-xs text-muted-foreground">vagas abertas</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
