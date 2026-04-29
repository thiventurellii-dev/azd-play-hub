import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Hero } from "@/components/home/Hero";

export const LandingHero = () => {
  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-center bg-background">
      <Hero subtitle="Mais do que jogar, construímos amizades. Seasons competitivas, partidas agendadas, rankings e muito mais — tudo em um só lugar." />

      <div className="pointer-events-none absolute bottom-8 inset-x-0 flex justify-center">
        <motion.a
          href="#stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="pointer-events-auto flex flex-col items-center gap-2 text-foreground/80 hover:text-gold transition-colors group"
        >
          <span className="text-base md:text-lg font-bold uppercase tracking-[0.3em]">Explorar</span>
          <ChevronDown className="h-8 w-8 md:h-10 md:w-10 animate-bounce text-gold/80 group-hover:text-gold" strokeWidth={2.5} />
        </motion.a>
      </div>
    </div>
  );
};
