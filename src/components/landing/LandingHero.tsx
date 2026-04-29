import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/home/Hero";
import { fadeUp, useMotionProps } from "@/lib/animations";

export const LandingHero = () => {
  const motionProps = useMotionProps();
  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-center">
      <Hero subtitle="Mais do que jogar, construímos amizades. Seasons competitivas, partidas agendadas, rankings e muito mais — tudo em um só lugar.">
        <motion.div {...fadeUp(0.4)} className="relative mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <motion.div {...motionProps}>
              <Button variant="gold" size="lg">Faça parte da comunidade</Button>
            </motion.div>
          </Link>
          <a href="#jogos">
            <motion.div {...motionProps}>
              <Button variant="outline" size="lg">Ver os jogos</Button>
            </motion.div>
          </a>
        </motion.div>
      </Hero>

      <motion.a
        href="#stats"
        {...fadeUp(0.9)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/80 hover:text-gold transition-colors group"
      >
        <span className="text-base md:text-lg font-bold uppercase tracking-[0.3em]">Explorar</span>
        <ChevronDown className="h-8 w-8 md:h-10 md:w-10 animate-bounce text-gold/80 group-hover:text-gold" strokeWidth={2.5} />
      </motion.a>
    </div>
  );
};
