import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import type { CommunityListItem } from "@/hooks/useCommunities";

interface Props {
  community: CommunityListItem;
  index?: number;
  variant?: "featured" | "row";
}

const CommunityCard = ({ community, index = 0, variant = "featured" }: Props) => {
  if (variant === "row") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <Card className="bg-card border-border hover:border-gold/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            {community.logo_url ? (
              <img
                src={community.logo_url}
                alt={community.name}
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold text-2xl flex-shrink-0">
                {community.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold truncate">{community.name}</h3>
                <FavoriteButton entityType="community" entityId={community.id} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {community.tagline || community.description}
              </p>
              {community.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {community.tags.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] py-0">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col items-center text-center min-w-[64px]">
              <p className="text-lg font-bold text-foreground">{community.members_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Membros</p>
            </div>
            <div className="hidden sm:flex flex-col items-center text-center min-w-[64px]">
              <p className="text-lg font-bold text-foreground">{community.matches_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Partidas</p>
            </div>
            <Link to={`/comunidades/${community.slug}`}>
              <Button variant="gold" size="sm">Ver comunidade</Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-card border-border hover:border-gold/30 transition-colors h-full flex flex-col overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-secondary to-background">
          {community.cover_url && (
            <img src={community.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          )}
          <div className="absolute -bottom-8 left-4">
            {community.logo_url ? (
              <img
                src={community.logo_url}
                alt={community.name}
                className="h-16 w-16 rounded-xl object-cover border-4 border-card"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-secondary border-4 border-card flex items-center justify-center text-gold font-bold text-2xl">
                {community.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        <CardContent className="pt-10 pb-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold truncate">{community.name}</h3>
            <FavoriteButton entityType="community" entityId={community.id} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {community.tagline || community.description}
          </p>
          {community.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {community.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] py-0">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {community.members_count} membros
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {community.matches_count} partidas
            </span>
          </div>
          <Link to={`/comunidades/${community.slug}`} className="mt-3">
            <Button variant="gold" className="w-full">Ver comunidade</Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CommunityCard;
