import { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "row";
  right?: ReactNode;
}

export const SectionHead = ({ eyebrow, title, description, align = "left", right }: Props) => {
  if (align === "row") {
    return (
      <div className="mb-12 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gold mb-3">{eyebrow}</p>
          <h2 className="display-tight font-black text-[clamp(28px,3.5vw,44px)] max-w-2xl">
            {title}
          </h2>
        </div>
        {right}
      </div>
    );
  }
  return (
    <div className="mb-12 max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gold mb-3">{eyebrow}</p>
      <h2 className="display-tight font-black text-[clamp(28px,3.5vw,44px)] mb-4">{title}</h2>
      {description && <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  );
};
