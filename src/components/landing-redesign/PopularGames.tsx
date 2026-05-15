import { Link } from "react-router-dom";

type GameCover = {
  name: string;
  weight: "Leve" | "Médio" | "Pesado";
  matches: number;
  cover: React.ReactNode;
  label: string;
};

const Shell = ({ from, to, children, label }: { from: string; to: string; children: React.ReactNode; label: string }) => {
  const id = `lr-cv-${label.replace(/\s+/g, "-")}`;
  return (
    <svg viewBox="0 0 240 320" className="w-full h-full block">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill={`url(#${id})`} />
      {children}
      <text x="120" y="295" textAnchor="middle" fill="rgba(255,255,255,0.92)" fontFamily="Inter Tight" fontWeight={700} fontSize="14" letterSpacing="2">
        {label}
      </text>
    </svg>
  );
};

const GAMES: GameCover[] = [
  {
    name: "Wingspan", weight: "Médio", matches: 12, label: "WINGSPAN",
    cover: (
      <Shell from="#5a8db5" to="#2d4a66" label="WINGSPAN">
        <circle cx="195" cy="55" r="22" fill="#f4d35e" />
        <ellipse cx="120" cy="160" rx="62" ry="22" fill="#0a0a0a" />
        <ellipse cx="100" cy="135" rx="14" ry="10" fill="#0a0a0a" />
        <path d="M150 160 Q175 110 215 130 Q190 150 165 175 Z" fill="#c46a4a" transform="rotate(-12 175 145)" />
      </Shell>
    ),
  },
  {
    name: "Terraforming Mars", weight: "Pesado", matches: 9, label: "TERRAFORMING",
    cover: (
      <Shell from="#c44b2c" to="#4a1810" label="TERRAFORMING">
        <circle cx="120" cy="135" r="58" fill="#a83a20" />
        <circle cx="100" cy="115" r="6" fill="#7a2810" />
        <circle cx="135" cy="155" r="9" fill="#7a2810" />
        <circle cx="145" cy="120" r="4" fill="#7a2810" />
        <ellipse cx="120" cy="135" rx="78" ry="14" fill="none" stroke="#f4c25a" strokeWidth="2" transform="rotate(-18 120 135)" />
        <circle cx="40" cy="50" r="1.5" fill="#fff" />
        <circle cx="200" cy="45" r="2" fill="#fff" />
        <circle cx="60" cy="220" r="1.5" fill="#fff" />
        <circle cx="190" cy="225" r="1.5" fill="#fff" />
      </Shell>
    ),
  },
  {
    name: "Ark Nova", weight: "Pesado", matches: 7, label: "ARK NOVA",
    cover: (
      <Shell from="#3d6b4f" to="#1a2e23" label="ARK NOVA">
        <path d="M70 180 Q120 80 170 180 Z" fill="#5d8a6d" />
        <rect x="118" y="120" width="4" height="14" fill="#f4c25a" />
        <rect x="111" y="127" width="18" height="4" fill="#f4c25a" />
        <g fill="#f4d35e">
          <circle cx="120" cy="220" r="6" />
          <circle cx="108" cy="232" r="4" />
          <circle cx="132" cy="232" r="4" />
          <circle cx="100" cy="244" r="3.5" />
          <circle cx="140" cy="244" r="3.5" />
        </g>
      </Shell>
    ),
  },
  {
    name: "Brass: Birmingham", weight: "Pesado", matches: 6, label: "BRASS",
    cover: (
      <Shell from="#a87144" to="#3d2818" label="BRASS">
        <g transform="translate(120 140)">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x="-6" y="-50" width="12" height="22" fill="#d4a373" transform={`rotate(${i * 45})`} />
          ))}
          <circle r="36" fill="#d4a373" />
          <circle r="14" fill="#3d2818" />
        </g>
        <rect x="40" y="200" width="14" height="40" fill="#5a3a20" />
        <rect x="186" y="210" width="14" height="30" fill="#5a3a20" />
        <ellipse cx="47" cy="195" rx="14" ry="6" fill="#7a5a3a" opacity="0.6" />
        <ellipse cx="193" cy="205" rx="12" ry="5" fill="#7a5a3a" opacity="0.6" />
      </Shell>
    ),
  },
  {
    name: "Spirit Island", weight: "Pesado", matches: 5, label: "SPIRIT ISLAND",
    cover: (
      <Shell from="#3a5a8c" to="#152540" label="SPIRIT ISLAND">
        <ellipse cx="120" cy="220" rx="80" ry="14" fill="#3d6b4a" />
        <ellipse cx="120" cy="218" rx="60" ry="9" fill="#5a8a5c" />
        <polygon points="120,140 90,210 150,210" fill="#2d4a3a" />
        <circle cx="120" cy="120" r="18" fill="#f4c25a" opacity="0.3" />
        <circle cx="120" cy="120" r="12" fill="#f4c25a" opacity="0.55" />
        <circle cx="120" cy="120" r="6" fill="#f4d35e" />
      </Shell>
    ),
  },
  {
    name: "Cascadia", weight: "Leve", matches: 8, label: "CASCADIA",
    cover: (
      <Shell from="#7ea36b" to="#3d5a3a" label="CASCADIA">
        {[
          { x: 95, y: 100, c: "#a8c47a" },
          { x: 145, y: 100, c: "#8aa86a" },
          { x: 95, y: 160, c: "#d4c89a" },
          { x: 145, y: 160, c: "#6b8e50" },
        ].map((h, i) => (
          <polygon
            key={i}
            points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
            fill={h.c}
            stroke="#2d4a2a"
            strokeWidth="1"
            transform={`translate(${h.x} ${h.y})`}
          />
        ))}
        <polygon points="200,210 192,230 208,230" fill="#3d5a3a" />
        <rect x="198" y="228" width="4" height="8" fill="#5a3a20" />
      </Shell>
    ),
  },
  {
    name: "Everdell", weight: "Médio", matches: 4, label: "EVERDELL",
    cover: (
      <Shell from="#6b8e7a" to="#2e4a3d" label="EVERDELL">
        <ellipse cx="120" cy="115" rx="55" ry="42" fill="#5a8068" />
        <ellipse cx="95" cy="100" rx="35" ry="30" fill="#6b9078" />
        <ellipse cx="145" cy="100" rx="35" ry="30" fill="#7aa088" />
        <rect x="108" y="140" width="24" height="55" fill="#6b3a20" rx="3" />
        <rect x="116" y="155" width="8" height="10" fill="#f4d35e" />
        <ellipse cx="120" cy="200" rx="40" ry="6" fill="#1a2e23" opacity="0.5" />
      </Shell>
    ),
  },
  {
    name: "Root", weight: "Médio", matches: 4, label: "ROOT",
    cover: (
      <Shell from="#d97a3c" to="#5a2a14" label="ROOT">
        <polygon points="120,80 105,90 102,98 100,108 120,140" fill="#f4d35e" />
        <path d="M120 120 Q90 145 95 200 Q120 215 145 200 Q150 145 120 120 Z" fill="#a83a20" />
        <path d="M120 130 L120 200" stroke="#5a1810" strokeWidth="1.5" />
        <path d="M120 150 L100 170 M120 150 L140 170 M120 175 L105 195 M120 175 L135 195" stroke="#5a1810" strokeWidth="1" />
      </Shell>
    ),
  },
];

export const PopularGames = () => (
  <section id="jogos" className="lr-section">
    <div className="lr-container">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
        <div>
          <div className="lr-eyebrow">Jogos populares</div>
          <h2 className="lr-display mt-3" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>O que está rolando por aqui.</h2>
        </div>
        <Link to="/games" className="lr-btn lr-btn-outline lr-btn-sm">Ver catálogo completo →</Link>
      </div>

      <div className="lr-scroll-mask">
        <div className="lr-scroll-x flex gap-3 pb-2">
          {GAMES.map((g) => (
            <div
              key={g.name}
              className="rounded-[14px] p-3 transition-all"
              style={{
                flex: "0 0 200px",
                background: "var(--lr-bg-2)",
                border: "1px solid var(--lr-line-soft)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "var(--lr-line)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.borderColor = "var(--lr-line-soft)";
              }}
            >
              <div
                className="overflow-hidden rounded-[10px]"
                style={{ aspectRatio: "3/4", border: "1px solid var(--lr-line-soft)" }}
              >
                {g.cover}
              </div>
              <div className="mt-3 text-[14px] font-semibold">{g.name}</div>
              <div className="lr-mono mt-1" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>
                {g.weight} · <span style={{ color: "var(--lr-gold)" }}>{g.matches} partidas</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
