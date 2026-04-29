import { Trophy, Award } from "lucide-react";
import { SplitSection } from "./SplitSection";

const ProfileMockup = () => (
  <div className="max-w-md mx-auto md:ml-auto space-y-3">
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-muted to-gold flex items-center justify-center text-xl font-extrabold text-background flex-shrink-0">
          MR
        </div>
        <div>
          <div className="text-base font-bold">Marcos Rodrigues</div>
          <div className="text-xs text-muted-foreground">@marcos · membro desde jan/2023</div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-gold/40 text-gold bg-gold/10 flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5" /> Campeão S5
            </span>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border text-muted-foreground flex items-center gap-1">
              <Award className="w-2.5 h-2.5" /> Veterano
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { num: "74", lbl: "Partidas" },
          { num: "31%", lbl: "Taxa vitória", accent: true },
          { num: "12", lbl: "Badges" },
        ].map((s) => (
          <div key={s.lbl} className="bg-surface rounded-lg p-3 text-center">
            <div className={`text-base font-extrabold tracking-tight ${s.accent ? "text-gold" : ""}`}>{s.num}</div>
            <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Histórico Recente
      </div>
      {[
        { game: "Brass: Birmingham", date: "26/04", pos: "🏆 1º", change: "+32,00", positive: true, gold: true },
        { game: "Blood on the Clocktower", date: "20/04", pos: "3º", change: "+8,50", positive: true },
        { game: "Ruins of Arnak", date: "13/04", pos: "2º", change: "+18,25", positive: true },
        { game: "Brass: Birmingham", date: "06/04", pos: "4º", change: "−12,00", positive: false },
      ].map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
          <span className="flex-1 text-sm font-medium truncate">{r.game}</span>
          <span className="text-xs text-muted-foreground">{r.date}</span>
          <span className={`text-xs font-bold w-8 text-center ${r.gold ? "text-gold" : "text-muted-foreground"}`}>{r.pos}</span>
          <span className={`text-xs font-semibold w-14 text-right ${r.positive ? "text-green-400" : "text-red-400"}`}>{r.change}</span>
        </div>
      ))}
    </div>
  </div>
);

export const LandingProfileSection = () => (
  <SplitSection
    id="perfil"
    tag="Perfil do Jogador"
    title={<>Seu perfil completo<br />e <span className="text-gold">personalizado</span></>}
    body="Estatísticas, histórico de partidas, badges, conquistas e personalização — tudo em um só lugar. O foco é você e a sua jornada na comunidade."
    features={[
      "Estatísticas detalhadas por jogo e por season",
      "Histórico completo de partidas com posição e pontuação",
      "Badges e conquistas por desempenho",
      "Perfil público para compartilhar com amigos",
    ]}
    cta={{ label: "Criar meu perfil", to: "/register" }}
    mockup={<ProfileMockup />}
  />
);
