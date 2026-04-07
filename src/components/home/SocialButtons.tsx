import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fadeUp, hoverSpring } from "@/lib/animations";
import { socialButtonsConfig } from "./SocialIcons";

export const SocialButtons = () => {
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("contact_links").select("name, url").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        for (const r of data) map[r.name] = r.url;
        setLinks(map);
      }
    });
  }, []);

  const visibleButtons = socialButtonsConfig.filter((btn) => links[btn.key]);
  if (visibleButtons.length === 0) return null;

  return (
    <motion.div {...fadeUp(0.5)} className="relative mt-4 flex flex-wrap justify-center gap-3">
      {visibleButtons.map((btn) => (
        <a key={btn.key} href={links[btn.key]} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button
              variant="outline"
              size="sm"
              className={`gap-2 ${btn.borderClass} ${btn.colorClass} ${btn.hoverClass}`}
            >
              {btn.icon} {btn.label}
            </Button>
          </motion.div>
        </a>
      ))}
    </motion.div>
  );
};
