import { useRef } from "react";
import { Camera, Pencil, Lock, MoreVertical, BadgeCheck, MapPin, Calendar } from "lucide-react";
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

interface Props {
  profile: any;
  role: string;
  isMaster: boolean;
  isStoryteller: boolean;
  mainCommunity: CommunityItem | null;
  isOwnProfile: boolean;
  uploadingAvatar: boolean;
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
