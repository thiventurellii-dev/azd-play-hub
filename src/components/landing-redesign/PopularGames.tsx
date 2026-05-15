import { Link } from "react-router-dom";
import { useLandingData, type PopularGame } from "@/hooks/useLandingData";
import { SectionHead } from "./SectionHead";

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, hsl(43 60% 30%), hsl(20 50% 18%))",
  "linear-gradient(135deg, hsl(220 50% 30%), hsl(240 40% 15%))",
  "linear-gradient(135deg, hsl(150 40% 25%), hsl(170 40% 12%))",
  "linear-gradient(135deg, hsl(0 50% 30%), hsl(15 40% 15%))",
  "linear-gradient(135deg, hsl(280 35% 25%), hsl(260 35% 12%))",
  "linear-gradient(135deg, hsl(35 50% 30%), hsl(20 40% 15%))",
];

const GameCard = ({ game, idx }: { game: PopularGame; idx: number }) => {
  const players =
    game.min_players && game.max_players
      ? game.min_players === game.max_players
        ? `${game.min_players} jog`
        : `${game.min_players}–${game.max_players} jog`
      : null;

  return (
    <Link
      to={`/games/${game.id}`}
      className="flex-shrink-0 w-[200px] rounded-xl border border-border/60 bg-surface p-3 hover:border-border hover:-translate-y-1 transition-all"
    >
      <div
        className="aspect-[3/4] rounded-lg overflow-hidden border border-border/60 mb-3 relative"
        style={{ background: FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length] }}
      >
        {game.image_url && (
          <img
            src={game.image_url}
            alt={game.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/90 truncate">
            {game.name}
          </p>
        </div>
      </div>
      <p className="text-sm font-semibold truncate">{game.name}</p>
      <p className="mono text-[11px] text-muted-foreground mt-1">
        {game.category ?? "—"}
        {players ? ` · ${players}` : ""}
        {game.matchCount > 0 && (
          <>
            {" · "}
            <span className="text-gold">
              {game.matchCount} {game.matchCount === 1 ? "partida" : "partidas"}
            </span>
          </>
        )}
      </p>
    </Link>
  );
};

export const PopularGames = () => {
  const { popularGames } = useLandingData();

  if (!popularGames.length) return null;

  return (
    <section id="jogos" className="border-t border-border/60 py-20 md:py-24">
      <div className="container">
        <SectionHead
          eyebrow="Jogos populares"
          title={<>O que está rolando por aqui.</>}
          align="row"
          right={
            <Link
              to="/games"
              className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border text-sm font-medium hover:border-muted-foreground hover:bg-surface-raised transition-all"
            >
              Ver catálogo completo →
            </Link>
          }
        />
      </div>
      <div
        className="overflow-x-auto pb-4"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0, black 32px, black calc(100% - 32px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0, black 32px, black calc(100% - 32px), transparent 100%)",
        }}
      >
        <div className="container">
          <div className="flex gap-4 min-w-max">
            {popularGames.map((g, i) => (
              <GameCard key={g.id} game={g} idx={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
