import { Check, Calendar, Users, Trophy, Crown } from "lucide-react";

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3 text-sm md:text-[15px] leading-relaxed">
    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
      <Check className="w-3 h-3 text-gold" />
    </span>
    <span className="text-foreground/90">{children}</span>
  </li>
);

const SectionShell = ({
  eyebrow,
  title,
  description,
  bullets,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  id?: string;
}) => (
  <div className="container scroll-mt-24" id={id}>
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        reverse ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold mb-4">
          {eyebrow}
        </p>
        <h2 className="display-tight font-black text-[clamp(32px,4.5vw,56px)] leading-[1.05] mb-5 text-balance">
          {title}
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-7 max-w-xl">
          {description}
        </p>
        <ul className="space-y-3">
          {bullets.map((b) => (
            <Bullet key={b}>{b}</Bullet>
          ))}
        </ul>
      </div>
      <div className="relative">{visual}</div>
    </div>
  </div>
);

/* -------------------- Visual mocks -------------------- */

const RankingMock = () => {
  const players = [
    { pos: 1, name: "Marina A.", mmr: 1284, change: "+18" },
    { pos: 2, name: "Pedro L.", mmr: 1247, change: "+9" },
    { pos: 3, name: "Ana T.", mmr: 1221, change: "+12" },
    { pos: 4, name: "Joana R.", mmr: 1198, change: "−4" },
    { pos: 5, name: "Caio V.", mmr: 1176, change: "+6" },
  ];
  const POS_COLOR: Record<number, string> = {
    1: "bg-gold/15 text-gold ring-gold/30",
    2: "bg-zinc-300/10 text-zinc-200 ring-zinc-300/30",
    3: "bg-amber-700/20 text-amber-300 ring-amber-500/30",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-[0_30px_80px_-30px_hsl(43_100%_50%/0.25)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-sm font-semibold">Season 6 · Ranking</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded bg-gold/15 text-gold ring-1 ring-gold/30">
          ao vivo
        </span>
      </div>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.pos}
            className="flex items-center gap-3 rounded-xl bg-background/60 border border-border/50 px-3 py-2.5"
          >
            <span
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ring-1 ${
                POS_COLOR[p.pos] ?? "bg-surface-raised text-muted-foreground ring-border"
              }`}
            >
              {p.pos === 1 ? <Crown className="w-3.5 h-3.5" /> : p.pos}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.mmr} MMR</p>
            </div>
            <span
              className={`text-xs font-semibold ${
                p.change.startsWith("−") ? "text-red-400" : "text-green-400"
              }`}
            >
              {p.change}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
        <span>Encerra em 12 dias</span>
        <span className="font-semibold text-foreground">142 partidas</span>
      </div>
    </div>
  );
};

const CommunityMock = () => {
  const members = ["MA", "PL", "AT", "JR", "CV", "TO", "FE"];
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-[0_30px_80px_-30px_hsl(265_85%_60%/0.25)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Comunidade
          </p>
          <p className="text-lg font-bold">Mesa do Sul · Boardgames</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30">
          aberta
        </span>
      </div>
      <div className="flex items-center mb-5">
        {members.map((m, i) => (
          <div
            key={m}
            className="w-9 h-9 rounded-full border-2 border-surface flex items-center justify-center text-[11px] font-bold"
            style={{
              marginLeft: i === 0 ? 0 : -10,
              background: `hsl(${(i * 47) % 360} 30% 35%)`,
            }}
          >
            {m}
          </div>
        ))}
        <div
          className="w-9 h-9 rounded-full border-2 border-surface bg-surface-raised flex items-center justify-center text-[11px] font-bold"
          style={{ marginLeft: -10 }}
        >
          +24
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { k: "31", l: "membros" },
          { k: "S2", l: "season" },
          { k: "12", l: "partidas/mês" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-xl bg-background/60 border border-border/50 px-3 py-3 text-center"
          >
            <p className="text-base font-bold">{s.k}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.l}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { t: "Discussão · Próximo encontro", n: "12 comentários" },
          { t: "Tópico · Top 5 jogos do mês", n: "Novo" },
        ].map((d) => (
          <div
            key={d.t}
            className="flex items-center justify-between rounded-lg bg-background/60 border border-border/40 px-3 py-2 text-sm"
          >
            <span className="truncate">{d.t}</span>
            <span className="text-[10px] text-muted-foreground ml-2">{d.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RoomMock = ({
  game,
  title,
  date,
  players,
  max,
  state,
}: {
  game: string;
  title: string;
  date: string;
  players: number;
  max: number;
  state: "open" | "full";
}) => {
  const pct = Math.min((players / max) * 100, 100);
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-1 truncate">
            {game}
          </p>
          <p className="text-sm font-bold truncate">{title}</p>
        </div>
        <div className="ml-3 flex flex-col items-end">
          <span className="text-[11px] font-semibold text-foreground/90">{date}</span>
          <span
            className={`mt-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ring-1 ${
              state === "full"
                ? "bg-red-500/15 text-red-300 ring-red-400/30"
                : "bg-green-500/15 text-green-300 ring-green-400/30"
            }`}
          >
            {state === "full" ? "Lotada" : "Vagas abertas"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={`h-full rounded-full ${state === "full" ? "bg-red-400" : "bg-gold"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {players}/{max} vagas
        </span>
      </div>
    </div>
  );
};

const RoomsMock = () => (
  <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-[0_30px_80px_-30px_hsl(43_100%_50%/0.25)]">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gold" />
        <span className="text-sm font-semibold">Próximas partidas</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        esta semana
      </span>
    </div>
    <div className="space-y-3">
      <RoomMock
        game="Wingspan"
        title="Mesa de quarta · casa do Pedro"
        date="Qua · 19h30"
        players={5}
        max={5}
        state="full"
      />
      <RoomMock
        game="Blood on the Clocktower"
        title="Trouble Brewing · online"
        date="Sex · 20h"
        players={9}
        max={15}
        state="open"
      />
      <RoomMock
        game="Pathfinder 2e"
        title="Sessão 14 · Reinos Esquecidos"
        date="Sáb · 14h"
        players={4}
        max={6}
        state="open"
      />
    </div>
    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
      <span className="text-muted-foreground">3 salas abertas</span>
      <span className="inline-flex items-center gap-1.5 font-semibold text-gold">
        <Users className="w-3.5 h-3.5" /> 18 confirmados
      </span>
    </div>
  </div>
);

/* -------------------- Sections -------------------- */

export const CapabilitiesSections = () => (
  <section className="border-t border-border/60">
    <div className="py-20 md:py-28">
      <SectionShell
        eyebrow="Seasons competitivas"
        title={
          <>
            Suba no ranking e
            <br />
            <span className="text-gold">se torne lendário.</span>
          </>
        }
        description="Cada season tem início, fim e premiação. Suas partidas valem pontos MMR que determinam sua posição no ranking. Quanto mais você joga, mais você evolui."
        bullets={[
          "Sistema de MMR com variação por posição e pontuação",
          "Histórico completo de todas as seasons anteriores",
          "Rankings públicos com top jogadores em destaque",
          "Premiações e reconhecimento aos campeões",
        ]}
        visual={<RankingMock />}
      />
    </div>

    <div className="border-t border-border/60 bg-surface/40 py-20 md:py-28">
      <SectionShell
        reverse
        eyebrow="Comunidades"
        title={
          <>
            Traga sua
            <br />
            <span className="text-gold">comunidade.</span>
          </>
        }
        description="A Amizade envolve todas as outras comunidades. Crie seu próprio grupo na plataforma. Gerencie membros, organize seus rankings, agende partidas e mantenha discussões num espaço só seu."
        bullets={[
          "Crie sua comunidade em minutos, totalmente grátis",
          "Rankings, seasons e estatísticas próprios do seu grupo",
          "Discussões, categorias e tópicos personalizados",
          "Calendário de partidas integrado com confirmação de presença",
        ]}
        visual={<CommunityMock />}
      />
    </div>

    <div className="border-t border-border/60 py-20 md:py-28">
      <SectionShell
        eyebrow="Agendamento de partidas"
        title={
          <>
            Agende. Confirme presença.
            <br />
            <span className="text-gold">Apareça.</span>
          </>
        }
        description="Agende partidas com os amigos em poucos minutos e registre os resultados. Tudo organizado, sem confusão."
        bullets={[
          "Criação rápida de salas com data, local e jogo",
          "Confirmação de presença e controle de vagas",
          "Registro do resultado direto pela plataforma",
          "Visibilidade das partidas para toda a comunidade",
        ]}
        visual={<RoomsMock />}
      />
    </div>
  </section>
);
