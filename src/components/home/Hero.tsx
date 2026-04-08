import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import logo from "@/assets/azd-logo.png";

interface HeroProps {
  compact?: boolean;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Hero = ({ compact = false, subtitle, children }: HeroProps) => (
  <section className="relative flex flex-col items-center justify-center px-4 text-center overflow-hidden py-16 sm:py-20 md:py-24 lg:py-32"
    style={compact ? { paddingTop: "3rem", paddingBottom: "3rem" } : undefined}
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
        className={`mx-auto drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)] ${compact ? "h-20 w-20 md:h-24 md:w-24 mb-4 md:mb-6" : "h-24 w-24 md:h-32 md:w-32 mb-6 md:mb-8"}`}
      />
    </motion.div>
    <motion.h1
      {...fadeUp(0.2)}
      className={`relative font-black tracking-tight ${compact ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl md:text-5xl lg:text-7xl"}`}
    >
      Ami<span className="text-gold">z</span>ade
    </motion.h1>
    {subtitle && (
      <motion.p {...fadeUp(0.3)} className="relative mt-3 max-w-lg text-sm sm:text-base text-muted-foreground px-2">
        {subtitle}
      </motion.p>
    )}
    {children}
  </section>
);
