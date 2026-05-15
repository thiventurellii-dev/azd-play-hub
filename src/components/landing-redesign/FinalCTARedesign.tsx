import { Link } from "react-router-dom";

const DiscordIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.6 14.6 0 0 0-.66 1.36 18.5 18.5 0 0 0-5.797 0A14.4 14.4 0 0 0 9.44 3a19.7 19.7 0 0 0-3.762 1.37C2.235 9.046 1.4 13.58 1.798 18.058a19.9 19.9 0 0 0 6.073 3.07c.486-.66.92-1.362 1.293-2.1a12.9 12.9 0 0 1-2.037-.98c.171-.125.338-.255.5-.39a14.18 14.18 0 0 0 12.748 0c.163.135.33.265.5.39-.65.388-1.333.715-2.04.98.373.737.808 1.439 1.295 2.1a19.86 19.86 0 0 0 6.072-3.07c.5-5.177-.838-9.673-3.886-13.69ZM8.02 15.331c-1.18 0-2.157-1.085-2.157-2.42 0-1.336.957-2.42 2.157-2.42 1.21 0 2.176 1.094 2.157 2.42 0 1.335-.957 2.42-2.157 2.42Zm7.974 0c-1.18 0-2.157-1.085-2.157-2.42 0-1.336.956-2.42 2.157-2.42 1.21 0 2.176 1.094 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
  </svg>
);

const WhatsappIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.71.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347ZM12.04 21.785h-.003a9.87 9.87 0 0 1-5.031-1.378l-.36-.214-3.741.982 1-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 0 1 2.893 6.992c-.003 5.45-4.437 9.886-9.889 9.886Zm8.413-18.297A11.81 11.81 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
  </svg>
);

const CommunityCard = ({ icon, label, desc, color }: { icon: React.ReactNode; label: string; desc: string; color: string }) => (
  <a
    href="#"
    className="rounded-[14px] p-5 flex flex-col gap-3 transition-all"
    style={{ background: "var(--lr-bg)", border: "1px solid var(--lr-line-soft)" }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.borderColor = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.borderColor = "var(--lr-line-soft)";
    }}
  >
    <div
      className="grid place-items-center rounded-[10px]"
      style={{ width: 38, height: 38, background: `color-mix(in oklab, ${color} 18%, transparent)` }}
      aria-hidden
    >
      {icon}
    </div>
    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--lr-fg)" }}>{label}</div>
    <div style={{ fontSize: 13, color: "var(--lr-fg-3)", lineHeight: 1.45 }}>{desc}</div>
    <div className="mt-auto" style={{ fontSize: 12, color, fontWeight: 600 }}>Entrar →</div>
  </a>
);

export const FinalCTARedesign = () => (
  <section id="cta" className="relative overflow-hidden" style={{ paddingTop: 120, paddingBottom: 0, borderTop: "1px solid var(--lr-line-soft)" }}>
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: "radial-gradient(900px 500px at 50% 110%, color-mix(in oklab, var(--lr-gold) 28%, transparent), transparent 70%), var(--lr-bg-2)",
      }}
    />
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--lr-gold) 4%, transparent) 0 1px, transparent 1px 80px)",
        opacity: 0.6,
      }}
    />
    <div className="lr-container relative">
      <div className="text-center mx-auto" style={{ maxWidth: 900 }}>
        <div className="lr-eyebrow" style={{ color: "var(--lr-gold)" }}>Season em andamento</div>
        <h2
          className="lr-display mx-auto mt-4"
          style={{ fontSize: "clamp(40px, 6.5vw, 84px)", maxWidth: 900, textWrap: "balance" as React.CSSProperties["textWrap"] }}
        >
          Sua próxima partida<br />
          <span style={{ color: "var(--lr-gold)" }}>começa aqui.</span>
        </h2>
        <p className="mx-auto mt-6" style={{ fontSize: 18, color: "var(--lr-fg-2)", maxWidth: 540 }}>
          Crie sua conta. Em menos de um minuto você está numa comunidade.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link to="/register" className="lr-btn lr-btn-gold lr-btn-lg" style={{ minWidth: 220 }}>Criar minha conta</Link>
          <a href="#comunidades" className="lr-btn lr-btn-outline lr-btn-lg">Explorar comunidades</a>
        </div>
      </div>

      <div className="mx-auto" style={{ marginTop: 96, paddingTop: 56, borderTop: "1px solid var(--lr-line-soft)", maxWidth: 900 }}>
        <div className="lr-eyebrow text-center">Junte-se também a nossas comunidades</div>
        <h3 className="lr-display text-center mt-3" style={{ fontSize: "clamp(24px, 3.5vw, 36px)" }}>
          Onde a galera conversa todo dia.
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
          <CommunityCard
            icon={<DiscordIcon color="oklch(0.62 0.18 270)" />}
            label="Discord"
            desc="Servidor oficial AZD — partidas, estratégias, papo geral"
            color="oklch(0.62 0.18 270)"
          />
          <CommunityCard
            icon={<WhatsappIcon color="oklch(0.7 0.16 150)" />}
            label="WhatsApp · Board Game"
            desc="Grupo geral de jogos de tabuleiro"
            color="oklch(0.7 0.16 150)"
          />
          <CommunityCard
            icon={<WhatsappIcon color="oklch(0.65 0.2 25)" />}
            label="WhatsApp · Blood"
            desc="Grupo dedicado a Blood on the Clocktower"
            color="oklch(0.65 0.2 25)"
          />
        </div>
      </div>

      <div style={{ height: 88 }} />
    </div>
  </section>
);
