import { Link } from "react-router-dom";
import FriendsList from "@/components/friendlist/FriendsList";
import type { CommunityItem } from "@/hooks/usePlayerProfileData";

interface Props {
  profileId: string;
  communities: CommunityItem[];
}

export const ProfileFooterGrid = ({ profileId, communities }: Props) => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <FriendsList userId={profileId} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Comunidades</h3>
          <span className="text-xs text-muted-foreground">{communities.length}</span>
        </div>
        {communities.length > 0 ? (
          <div className="space-y-2">
            {communities.slice(0, 6).map((c) => {
              const memberSince = new Date(c.joined_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });
              return (
                <Link
                  key={c.id}
                  to={`/comunidades/${c.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40 hover:border-gold/40 transition-colors"
                >
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Membro desde {memberSince}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Não participa de nenhuma comunidade ainda.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileFooterGrid;
