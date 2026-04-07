import { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardCardProps {
  title: string;
  icon: ReactNode;
  delay: number;
  loading?: boolean;
  children: ReactNode;
}

export const DashboardCard = ({ title, icon, delay, loading, children }: DashboardCardProps) => (
  <motion.div {...fadeUp(delay)}>
    <div className="rounded-xl border border-border bg-card p-5 hover:border-gold/30 transition-colors h-full">
      <h3 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
        {icon} {title}
      </h3>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        children
      )}
    </div>
  </motion.div>
);
