import { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

interface DashboardCardProps {
  title: string;
  icon: ReactNode;
  delay: number;
  loading?: boolean;
  children: ReactNode;
}

export const DashboardCard = ({ title, icon, delay, loading, children }: DashboardCardProps) => (
  <motion.div {...fadeUp(delay)}>
    <div className="rounded-xl border border-border bg-card p-5 hover:border-gold/40 transition-all cursor-pointer h-full">
      <h3 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
        {icon} {title}
      </h3>
      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
        </div>
      ) : (
        children
      )}
    </div>
  </motion.div>
);
