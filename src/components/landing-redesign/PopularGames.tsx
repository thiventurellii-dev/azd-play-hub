import { Link } from "react-router-dom";
import { useState } from "react";
import { useLandingData, type PopularGame } from "@/hooks/useLandingData";
import { SectionHead } from "./SectionHead";

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
  const words = name.replace(/[:\-–·]/g, " ").split(/\s+/).filter(Boolean);
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
    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-border/60 mb-4 relative bg-surface-raised">
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
      {game.typeLabel && (
        <span className="absolute top-2.5 left-2.5 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-black/70 text-white backdrop-blur-sm">
          {game.typeLabel}
        </span>
      )}
    </div>
  );
};

const GameCard = ({ game }: { game: PopularGame }) => {
  const players =
    game.min_players && game.max_players
      ? game.min_players === game.max_players
        ? `${game.min_players} jogadores`
        : `${game.min_players}–${game.max_players} jogadores`
      : null;
  const matchLabel =
    game.matchCount > 0
      ? `${game.matchCount} ${game.matchCount === 1 ? "partida" : "partidas"}`
      : "Em breve";
  const href = game.href ?? `/games/${game.id}`;

  return (
    <Link
      to={href}
      className="group flex-shrink-0 w-[300px] sm:w-[320px] rounded-2xl border border-border/60 bg-surface p-4 hover:border-gold/40 hover:-translate-y-1 transition-all flex flex-col"
    >
      <Cover game={game} />
      <h3 className="text-base font-bold leading-tight group-hover:text-gold transition-colors line-clamp-2">
        {game.name}
      </h3>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        {players && <span>👥 {players}</span>}
        {players && <span className="text-border">·</span>}
        <span className={game.matchCount > 0 ? "text-gold font-semibold" : "text-muted-foreground"}>
          {matchLabel}
        </span>
      </div>
      {game.description && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {game.description}
        </p>
      )}
    </Link>
  );
};

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-[300px] sm:w-[320px] rounded-2xl border border-border/60 bg-surface p-4">
    <div className="aspect-[4/3] rounded-lg bg-surface-raised animate-pulse mb-4" />
    <div className="h-5 bg-surface-raised rounded animate-pulse mb-2" />
    <div className="h-3 w-2/3 bg-surface-raised rounded animate-pulse mb-3" />
    <div className="h-3 bg-surface-raised rounded animate-pulse mb-1.5" />
    <div className="h-3 w-4/5 bg-surface-raised rounded animate-pulse" />
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
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
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
