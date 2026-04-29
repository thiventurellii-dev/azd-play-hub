import { Sparkles, MapPin, Trophy, Award, Users, Pencil } from "lucide-react";
import { SplitSection } from "./SplitSection";

const ProfileMockup = () => (
  <div className="max-w-md mx-auto md:ml-auto space-y-3">
    {/* Header card mimicking our actual Profile page */}
    <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-3 right-3 p-1.5 rounded-md border border-border text-muted-foreground">
        <Pencil className="w-3.5 h-3.5" />
      </div>
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-muted to-gold flex items-center justify-center text-2xl font-extrabold text-background ring-2 ring-gold/30 ring-offset-2 ring-offset-card">
            MR
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="text-lg font-extrabold leading-tight truncate">Marcos Rodrigues</div>
          <div className="text-xs text-muted-foreground mt-0.5">@marcos.rod</div>
          <div className="flex items-center gap-1 text-[0.7rem] text-muted-foreground mt-1.5">
            <MapPin className="w-3 h-3" /> São Paulo, SP
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[0.65rem] font-medium text-gold border border-gold/30">
              <Sparkles className="h-3 w-3" /> Nv 14
            </span>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-gold/40 text-gold bg-gold/5 inline-flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5" /> Campeão S5
            </span>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border text-muted-foreground inline-flex items-center gap-1">
              <Award className="w-2.5 h-2.5" /> Veterano
            </span>
          </div>
        </div>
      </div>

      {/* XP progress */}
      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gold inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Nível 14
          </span>
          <span className="text-muted-foreground">820 / 1.200 XP</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full bg-gold rounded-full" style={{ width: "68%" }} />
        </div>
        <p className="text-[10px] text-muted-foreground">12.420 XP totais</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mt-5">
        {[
          { num: "74", lbl: "Partidas" },
          { num: "31%", lbl: "Vitórias", accent: true },
          { num: "12", lbl: "Badges" },
          { num: "23", lbl: "Amigos", icon: Users },
        ].map((s) => (
          <div key={s.lbl} className="bg-surface rounded-lg p-2.5 text-center">
            <div className={`text-base font-extrabold tracking-tight ${s.accent ? "text-gold" : ""}`}>{s.num}</div>
            <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Recent matches with contextual color tint, mirroring RecentMatchCardCompact */}
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Últimas partidas
      </div>
      {[
        {
          game: "Brass: Birmingham",
          date: "26/04",
          pos: "1º",
          mmr: "+32,00",
          tint: "bg-[linear-gradient(135deg,_hsl(45_50%_11%/0.85)_0%,_transparent_55%)]",
          posClass: "text-gold",
          mmrClass: "text-yellow-100",
          winner: true,
        },
        {
          game: "Blood on the Clocktower",
          date: "20/04",
          pos: "3º",
          mmr: "+8,50",
          tint: "bg-[linear-gradient(135deg,_hsl(158_55%_10%/0.6)_0%,_transparent_55%)]",
          posClass: "text-emerald-300/85",
          mmrClass: "text-emerald-200",
        },
        {
          game: "Ruins of Arnak",
          date: "13/04",
          pos: "2º",
          mmr: "+18,25",
          tint: "bg-[linear-gradient(135deg,_hsl(158_55%_10%/0.6)_0%,_transparent_55%)]",
          posClass: "text-emerald-300/85",
          mmrClass: "text-emerald-200",
        },
        {
          game: "Brass: Birmingham",
          date: "06/04",
          pos: "4º",
          mmr: "−12,00",
          tint: "bg-[linear-gradient(135deg,_hsl(355_45%_11%/0.55)_0%,_transparent_55%)]",
          posClass: "text-red-300/80",
          mmrClass: "text-red-200",
        },
      ].map((r, i) => (
        <div
          key={i}
          className={`relative flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 ${r.tint}`}
        >
          {r.winner && (
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gold via-gold/50 to-transparent" />
          )}
          <span className="flex-1 text-sm font-medium truncate">{r.game}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{r.date}</span>
          <span className={`text-xs font-bold w-8 text-center ${r.posClass}`}>{r.pos}</span>
          <span className={`text-xs font-semibold w-16 text-right tabular-nums ${r.mmrClass}`}>{r.mmr}</span>
        </div>
      ))}
    </div>
  </div>
);

export const LandingProfileSection = () => (
  <SplitSection
    id="perfil"
    tag="Perfil do Jogador"
    title={<>Seu perfil completo<br />e <span className="text-gold">Personalizado</span></>}
    body="Avatar, nível, XP, badges, estatísticas e histórico de partidas — tudo em um só lugar. O foco é você e a sua jornada na comunidade."
    features={[
      "Avatar, nickname, localização e pronomes personalizáveis",
      "Sistema de XP e níveis por participação na comunidade",
      "Estatísticas detalhadas por jogo e por season",
      "Badges, conquistas e histórico de amigos",
    ]}
    cta={{ label: "Criar meu perfil", to: "/register" }}
    mockup={<ProfileMockup />}
  />
);
