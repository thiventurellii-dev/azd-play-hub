import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fadeUp, useMotionProps } from "@/lib/animations";
import { SocialButtons } from "@/components/home/SocialButtons";

export const LandingFinalCTA = () => {
  const motionProps = useMotionProps();
  return (
    <section id="cta" className="border-t border-border bg-surface py-20 md:py-28 text-center">
      <div className="container">
        <motion.h2 {...fadeUp(0)} className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
          Pronto para<br /><span className="text-gold">entrar na mesa?</span>
        </motion.h2>
        <motion.p {...fadeUp(0.1)} className="mt-5 text-base md:text-lg text-muted-foreground max-w-md mx-auto">
          Crie sua conta gratuitamente, complete seu perfil e já entre na próxima partida da comunidade.
        </motion.p>
        <motion.div {...fadeUp(0.2)} className="mt-10 flex justify-center">
          <Link to="/register">
            <motion.div {...motionProps}>
              <Button variant="gold" size="lg" className="text-base px-8 py-6">
                Criar conta grátis
              </Button>
            </motion.div>
          </Link>
        </motion.div>
        <motion.p {...fadeUp(0.3)} className="mt-5 text-xs text-muted-foreground/70">
          Sem custo. Sem mensalidade. Só jogo e amizade.
        </motion.p>

        <motion.div {...fadeUp(0.4)} className="mt-12 pt-10 border-t border-border/60">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Junte-se também a nossas comunidades</p>
          <SocialButtons />
        </motion.div>
      </div>
    </section>
  );
};
