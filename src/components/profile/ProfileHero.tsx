import { useRef } from "react";
import { Camera, Pencil, Lock, MoreVertical, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import FriendButton from "@/components/friendlist/FriendButton";
import { useUserXp } from "@/hooks/useUserXp";
import { brazilianStates } from "@/lib/brazil-data";
import type { CommunityItem } from "@/hooks/usePlayerProfileData";
import { cn } from "@/lib/utils";
import { PLAYER_TAG_MAP, type PlayerTag } from "@/components/profile/PlayerTagsSelector";

// Steam logo (simple icon)
const SteamIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.566 0 .25 4.97.018 11.226L6.45 13.88a3.36 3.36 0 0 1 1.91-.59c.058 0 .115.003.172.006l2.86-4.142v-.058a4.473 4.473 0 0 1 4.473-4.473 4.473 4.473 0 0 1 4.473 4.473 4.473 4.473 0 0 1-4.554 4.473l-4.083 2.911c0 .049.005.098.005.147a3.366 3.366 0 0 1-3.367 3.367c-1.64 0-3.014-1.176-3.31-2.728L1.93 15.382C3.388 20.355 7.27 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zM7.54 18.21l-1.473-.61a2.554 2.554 0 0 0 1.319 1.355c1.296.539 2.793-.075 3.332-1.371a2.55 2.55 0 0 0 .002-1.957 2.55 2.55 0 0 0-1.371-1.376 2.547 2.547 0 0 0-1.895-.018l1.521.629a1.881 1.881 0 0 1 1.014 2.464 1.881 1.881 0 0 1-2.46 1.018l.011-.002zm11.547-9.473a2.98 2.98 0 0 0-2.977-2.977 2.98 2.98 0 0 0-2.977 2.977 2.98 2.98 0 0 0 2.977 2.976 2.98 2.98 0 0 0 2.977-2.976zm-5.207-.005a2.232 2.232 0 0 1 2.236-2.229 2.232 2.232 0 0 1 2.228 2.229 2.232 2.232 0 0 1-2.228 2.236 2.232 2.232 0 0 1-2.236-2.236z"/>
  </svg>
);

interface Props {
  profile: any;
  role: string;
  isMaster: boolean;
  isStoryteller: boolean;
  mainCommunity: CommunityItem | null;
  isOwnProfile: boolean;
  uploadingAvatar: boolean;
  playerTags?: PlayerTag[];
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
}

const pronounsLabels: Record<string, string> = {
  "ele/dele": "Ele/Dele",
  "ela/dela": "Ela/Dela",
  "elu/delu": "Elu/Delu",
  prefiro_nao_dizer: "—",
};

const SIZE = 112;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export const ProfileHero = ({
  profile,
  role,
  isMaster,
  isStoryteller,
  mainCommunity,
  isOwnProfile,
  uploadingAvatar,
  playerTags = [],
  onAvatarChange,
  onEditProfile,
  onChangePassword,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: xp } = useUserXp(profile?.id);
  const stateName =
    brazilianStates.find((s) => s.uf === profile?.state)?.name || profile?.state;
  const location = [profile?.city, stateName].filter(Boolean).join(", ");
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  const pct = xp?.pct ?? 0;
  const level = xp?.level ?? 1;
  const dashOffset = CIRC * (1 - pct / 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        {/* Avatar com anel de XP */}
        <div
          className="relative flex-shrink-0 mx-auto sm:mx-0 group cursor-pointer"
          onClick={() => isOwnProfile && fileInputRef.current?.click()}
          style={{ width: SIZE, height: SIZE }}
        >
          <svg
            className="absolute inset-0 -rotate-90"
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="hsl(var(--border))"
              strokeWidth={STROKE}
              fill="none"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="hsl(var(--gold))"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              fill="none"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-[6px] rounded-full overflow-hidden bg-secondary">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gold font-bold text-3xl">
                {(profile.nickname || profile.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            {isOwnProfile && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          {/* Pílula de nível */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gold text-gold-foreground text-[10px] font-bold tabular-nums shadow">
            Nv {level}
          </div>
          {isOwnProfile && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
              disabled={uploadingAvatar}
            />
          )}
        </div>

        {/* Identidade */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{profile.name}</h1>
            {profile.steam_id && (
              <BadgeCheck className="h-5 w-5 text-domain-info" aria-label="Verificado" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap justify-center sm:justify-start text-sm">
            {profile.nickname && (
              <span className="text-gold font-medium">@{profile.nickname}</span>
            )}
            {profile.pronouns && profile.pronouns !== "prefiro_nao_dizer" && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground">
                  {pronounsLabels[profile.pronouns] || profile.pronouns}
                </span>
              </>
            )}
          </div>

          {/* Badges contextuais (max 3) */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            {role === "admin" && (
              <Badge className="bg-gold/15 text-gold border border-gold/30 hover:bg-gold/15">
                Admin
              </Badge>
            )}
            {isMaster && (
              <Badge className="bg-domain-rpg/15 text-domain-rpg border border-domain-rpg/30 hover:bg-domain-rpg/15">
                Mestre
              </Badge>
            )}
            {isStoryteller && (
              <Badge className="bg-domain-botc/15 text-domain-botc border border-domain-botc/30 hover:bg-domain-botc/15">
                Storyteller
              </Badge>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-3 italic font-serif text-foreground/85 text-sm leading-relaxed max-w-prose mx-auto sm:mx-0">
              {profile.bio}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-3 flex items-center gap-x-3 gap-y-1 flex-wrap justify-center sm:justify-start text-xs text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {location}
              </span>
            )}
            {memberSince && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> desde {memberSince}
              </span>
            )}
            {mainCommunity && (
              <Link
                to={`/comunidades/${mainCommunity.slug}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border bg-background/40 hover:border-gold/40 transition-colors"
              >
                {mainCommunity.logo_url ? (
                  <img
                    src={mainCommunity.logo_url}
                    alt=""
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-sm bg-secondary flex items-center justify-center text-[8px] font-bold text-gold">
                    {mainCommunity.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-foreground/80">{mainCommunity.name}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-start gap-2 self-stretch sm:self-start mx-auto sm:mx-0">
          {isOwnProfile ? (
            <>
              <Button variant="gold" size="sm" onClick={onEditProfile}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar perfil
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onChangePassword}>
                    <Lock className="h-4 w-4 mr-2" /> Resetar senha
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <FriendButton targetUserId={profile.id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHero;
