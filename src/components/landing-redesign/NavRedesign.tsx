import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export const NavRedesign = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        height: scrolled ? 60 : 76,
        background: scrolled ? "color-mix(in oklab, var(--lr-bg) 82%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
        borderBottom: scrolled ? "1px solid var(--lr-line-soft)" : "1px solid transparent",
      }}
    >
      <div className="lr-container h-full flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="AZD home">
          <div
            className="w-7 h-7 rounded-lg grid place-items-center"
            style={{ background: "var(--lr-gold)", color: "#1a1408", fontFamily: "Inter Tight", fontWeight: 800, fontSize: 16 }}
            aria-hidden
          >
            A
          </div>
          <span style={{ fontFamily: "Inter Tight", fontWeight: 600, letterSpacing: "-0.03em", fontSize: 18, color: "var(--lr-fg)" }}>
            AZD
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[14px]" style={{ color: "var(--lr-fg-2)" }}>
          {[
            ["Como funciona", "#como-funciona"],
            ["Comunidades", "#comunidades"],
            ["Jogos", "#jogos"],
            ["Seasons", "#seasons"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="hover:text-[color:var(--lr-fg)] transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/login" className="lr-btn lr-btn-ghost lr-btn-sm">Entrar</Link>
          <Link to="/register" className="lr-btn lr-btn-gold lr-btn-sm">Criar conta</Link>
        </div>
      </div>
    </nav>
  );
};
