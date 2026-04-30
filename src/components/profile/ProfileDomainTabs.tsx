import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DomainTab = "boardgame" | "botc" | "rpg";

interface Props {
  counts: { boardgame: number; botc: number; rpg: number };
  children: (active: DomainTab) => ReactNode;
}

const TABS: { key: DomainTab; label: string; color: string }[] = [
  { key: "boardgame", label: "Boardgames", color: "border-domain-board text-domain-board" },
  { key: "botc", label: "Blood on the Clocktower", color: "border-domain-botc text-domain-botc" },
  { key: "rpg", label: "RPG", color: "border-domain-rpg text-domain-rpg" },
];

export const ProfileDomainTabs = ({ counts, children }: Props) => {
  const [active, setActive] = useState<DomainTab>("boardgame");

  return (
    <div className="space-y-4">
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto -mb-px">
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                  isActive
                    ? t.color
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}{" "}
                <span className={cn("ml-1 text-xs tabular-nums", !isActive && "opacity-60")}>
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>{children(active)}</div>
    </div>
  );
};

export default ProfileDomainTabs;
