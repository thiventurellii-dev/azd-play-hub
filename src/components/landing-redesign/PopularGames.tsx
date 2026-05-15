import { Link } from "react-router-dom";
import { useState } from "react";
import { useLandingData, type PopularGame } from "@/hooks/useLandingData";
import { SectionHead } from "./SectionHead";

// Stable color from name (3 distinct hues per game)
function gameColors(name: string): { from: string; to: string; accent: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    from: `hsl(${hue} 55% 32%)`,
    to: `hsl(${(hue + 30) % 360} 60% 14%)`,
    accent: `hsl(${(hue + 180) % 360} 70% 60%)`,
  };
}

function initials(name: string): string {
  const words = name.replace(/[:\-–]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const FallbackCover = ({ name }: { name: string }) => {
  const { from, to, accent } = gameColors(name);
  const ini = initials(name);
  const id = `g-${name.replace(/\W+/g, "")}`;
  return (
    <svg viewBox="0 0 240 320" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill={`url(#${id})`} />
      {/* decorative shapes */}
      <circle cx="200" cy="60" r="44" fill={accent} opacity="0.18" />
      <circle cx="40" cy="280" r="60" fill={accent} opacity="0.12" />
      <text
        x="120"
        y="170"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="92"
        fill="white"
        fillOpacity="0.92"
        letterSpacing="-3"
      >
        {ini}
      </text>
    </svg>
  );
};

const Cover = ({ game }: { game: PopularGame }) => {
  const [errored, setErrored] = useState(false);
  const showImage = game.image_url && !errored;
  return (
    <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border/60 mb-3 relative bg-surface-raised">
      {showImage ? (
        <img
          src={game.image_url!}
          alt={game.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <FallbackCover name={game.name} />
      )}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/95 line-clamp-2 leading-tight">
          {game.name}
        </p>
      </div>
    </div>
  );
};

const GameCard = ({ game }: { game: PopularGame }) => {
  const players =
    game.min_players && game.max_players
      ? game.min_players === game.max_players
        ? `${game.min_players} jog`
        : `${game.min_players}–${game.max_players} jog`
      : null;
  const matchLabel =
    game.matchCount > 0
      ? `${game.matchCount} ${game.matchCount === 1 ? "partida" : "partidas"}`
      : "sem partidas";

  return (
    <Link
      to={`/games/${game.id}`}
      className="group flex-shrink-0 w-[220px] rounded-xl border border-border/60 bg-surface p-3 hover:border-gold/40 hover:-translate-y-1 transition-all"
    >
      <Cover game={game} />
      <p className="text-sm font-semibold truncate group-hover:text-gold transition-colors">
        {game.name}
      </p>
      <p className="text-sm font-medium mt-1 flex items-center gap-1.5 flex-wrap">
        {game.category && <span className="text-muted-foreground">{game.category}</span>}
        {players && <span className="text-muted-foreground">· {players}</span>}
        <span className={`ml-auto ${game.matchCount > 0 ? "text-gold" : "text-muted-foreground/60"}`}>
          {matchLabel}
        </span>
      </p>
    </Link>
  );
};

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-[220px] rounded-xl border border-border/60 bg-surface p-3">
    <div className="aspect-[3/4] rounded-lg bg-surface-raised animate-pulse mb-3" />
    <div className="h-4 bg-surface-raised rounded animate-pulse mb-2" />
    <div className="h-3 w-2/3 bg-surface-raised rounded animate-pulse" />
  </div>
);

export const PopularGames = () => {
  const { popularGames, loading } = useLandingData();

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
            {loading && popularGames.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : popularGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </div>
      </div>

      {!loading && popularGames.length === 0 && (
        <div className="container mt-6">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum jogo cadastrado ainda.
          </p>
        </div>
      )}
    </section>
  );
};
