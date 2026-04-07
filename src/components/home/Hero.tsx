import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import logo from "@/assets/azd-logo.png";

interface HeroProps {
  compact?: boolean;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Hero = ({ compact = false, subtitle, children }: HeroProps) => (
  <section className="relative flex flex-col items-center justify-center px-4 text-center overflow-hidden"
    style={{ paddingTop: compact ? "5rem" : "8rem", paddingBottom: compact ? "5rem" : "8rem" }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <img
        src={logo}
        alt="AzD"
        className={`mx-auto drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)] ${compact ? "h-24 w-24 mb-6" : "h-32 w-32 mb-8"}`}
      />
    </motion.div>
    <motion.h1
      {...fadeUp(0.2)}
      className={`relative font-black tracking-tight ${compact ? "text-4xl md:text-6xl" : "text-5xl md:text-7xl"}`}
    >
      Ami<span className="text-gold">z</span>ade
    </motion.h1>
    {subtitle && (
      <motion.p {...fadeUp(0.3)} className="relative mt-3 max-w-lg text-muted-foreground">
        {subtitle}
      </motion.p>
    )}
    {children}
  </section>
);
