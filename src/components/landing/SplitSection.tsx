import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface SplitSectionProps {
  id?: string;
  tag: string;
  title: React.ReactNode;
  body: string;
  features: string[];
  cta: { label: string; to: string };
  mockup: React.ReactNode;
  reverse?: boolean;
  className?: string;
}

export const SplitSection = ({ id, tag, title, body, features, cta, mockup, reverse, className }: SplitSectionProps) => (
  <section id={id} className={cn("py-20 md:py-28", className)}>
    <div className="container">
      <div className={cn("grid gap-10 md:gap-16 items-center md:grid-cols-2")}>
        <div className={cn(reverse ? "md:order-2" : "md:order-1", "order-2")}>
          <motion.p {...fadeUp(0)} className="inline-flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.18em] uppercase text-gold mb-4">
            <span className="block w-5 h-[2px] bg-gold rounded-full" />
            {tag}
          </motion.p>
          <motion.h2 {...fadeUp(0.1)} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
            {title}
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
            {body}
          </motion.p>
          <motion.ul {...fadeUp(0.25)} className="mt-7 flex flex-col gap-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm md:text-[0.95rem] text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-gold" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </motion.ul>
          <motion.div {...fadeUp(0.35)} className="mt-9">
            <Link to={cta.to}>
              <Button variant="gold" size="lg">{cta.label}</Button>
            </Link>
          </motion.div>
        </div>
        <motion.div
          {...fadeUp(0.15)}
          className={cn(reverse ? "md:order-1" : "md:order-2", "order-1")}
        >
          {mockup}
        </motion.div>
      </div>
    </div>
  </section>
);
