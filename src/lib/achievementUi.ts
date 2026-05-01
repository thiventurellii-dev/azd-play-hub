import type { AchievementRarity } from "@/components/achievements/AchievementBadge";

/**
 * Tints / borders / labels para o sistema de raridade — segue exatamente
 * a paleta vintage do briefing (Common #8E9099 … Mesa #8B5A2B).
 *
 * Tudo aqui é apenas helper de UI; as cores em si vivem em `index.css`
 * (`--rarity-*`) e em `tailwind.config.ts` (`bg-rarity-*`, `border-rarity-*`).
 */

export const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
  mesa: "Validada pela Mesa",
};

export const RARITY_LABEL_SHORT: Record<AchievementRarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
  mesa: "Mesa",
};

export const RARITY_ORDER: Record<AchievementRarity, number> = {
  legendary: 5,
  epic: 4,
  mesa: 3,
  rare: 2,
  uncommon: 1,
  common: 0,
};

/**
 * Background tint (≈10% opacity) + border (≈40%) por raridade — como na
 * tabela "Paleta de cores (muted, vintage feel)" do briefing.
 * Usamos rgba com os hex exatos para garantir o feel vintage independente
 * da forma como o tailwind compila o token.
 */
export const RARITY_BG: Record<AchievementRarity, string> = {
  common: "rgba(142,144,153,0.08)",
  uncommon: "rgba(107,142,80,0.08)",
  rare: "rgba(87,128,179,0.08)",
  epic: "rgba(126,91,168,0.08)",
  legendary: "rgba(201,169,97,0.10)",
  mesa: "rgba(139,90,43,0.10)",
};

export const RARITY_BORDER: Record<AchievementRarity, string> = {
  common: "rgba(142,144,153,0.4)",
  uncommon: "rgba(107,142,80,0.4)",
  rare: "rgba(87,128,179,0.4)",
  epic: "rgba(126,91,168,0.4)",
  legendary: "rgba(201,169,97,0.5)",
  mesa: "rgba(139,90,43,0.5)",
};

export const RARITY_HEX: Record<AchievementRarity, string> = {
  common: "#8E9099",
  uncommon: "#6B8E50",
  rare: "#5780B3",
  epic: "#7E5BA8",
  legendary: "#C9A961",
  mesa: "#8B5A2B",
};

export const rarityTintStyle = (rarity: AchievementRarity) => ({
  backgroundColor: RARITY_BG[rarity],
  borderColor: RARITY_BORDER[rarity],
});

/**
 * Resolve `description_template` substituindo placeholders comuns:
 * `{threshold}`, `{game_name}`, `{count}`, `{streak}`, `{n}`.
 */
export const resolveDescription = (
  template: string | null | undefined,
  ctx: {
    threshold?: number | null;
    gameName?: string | null;
    count?: number | null;
  } = {},
): string => {
  if (!template) return "";
  const t = ctx.threshold;
  const replacements: Record<string, string> = {
    "{threshold}": t != null ? String(t) : "",
    "{game_name}": ctx.gameName ?? "este jogo",
    "{count}": ctx.count != null ? String(ctx.count) : (t != null ? String(t) : ""),
    "{n}": t != null ? String(t) : "",
    "{streak}": t != null ? String(t) : "",
  };
  let out = template;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  return out;
};
