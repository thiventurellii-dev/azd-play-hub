import { useLandingData } from "@/hooks/useLandingData";

const Item = ({ value, label }: { value: number | string; label: string }) => (
  <div className="flex flex-col gap-2 px-6 py-2 text-center md:text-left md:[&:not(:first-child)]:border-l md:border-border/60">
    <span className="display-tight font-black text-foreground text-[clamp(32px,4.5vw,52px)] tabular-nums">
      {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
    </span>
    <span className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </span>
  </div>
);

export const StatsRedesign = () => {
  const { stats } = useLandingData();
  return (
    <section
      id="stats"
      className="border-y border-border/60 bg-surface py-12 md:py-14"
    >
      <div className="container grid grid-cols-2 md:grid-cols-4 gap-y-6">
        <Item value={stats.players} label="Jogadores na plataforma" />
        <Item value={stats.matches} label="Partidas registradas" />
        <Item value={stats.seasons} label="Seasons criadas" />
        <Item value={stats.games} label="Jogos no catálogo" />
      </div>
    </section>
  );
};
