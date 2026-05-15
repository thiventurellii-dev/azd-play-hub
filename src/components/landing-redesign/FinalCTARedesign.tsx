import { Link } from "react-router-dom";
import { useLandingData } from "@/hooks/useLandingData";
import { SocialButtons } from "@/components/home/SocialButtons";

export const FinalCTARedesign = () => {
  const { activeSeason } = useLandingData();
  return (
    <section
      id="cta"
      className="relative overflow-hidden border-t border-border/60 pt-28 md:pt-32 pb-0"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-surface"
        style={{
          background:
            "radial-gradient(900px 500px at 50% 110%, hsl(43 100% 50% / 0.28), transparent 70%), hsl(var(--surface))",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "repeating-linear-gradient(135deg, hsl(43 100% 50% / 0.04) 0 1px, transparent 1px 80px)",
        }}
      />

      <div className="container relative z-10 text-center">
        {activeSeason && (
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gold mb-5">
            {activeSeason.name} em andamento · encerra em {activeSeason.daysLeft} dias
          </p>
        )}
        <h2 className="display-tight font-black text-[clamp(40px,6.5vw,84px)] max-w-3xl mx-auto text-balance">
          Sua próxima partida
          <br />
          <span className="text-gold">começa aqui.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Crie sua conta. Em menos de um minuto você está na comunidade e pode marcar a próxima
          mesa.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-gold text-gold-foreground font-semibold hover:bg-gold/90 transition-all hover:-translate-y-0.5 min-w-[220px]"
          >
            Criar minha conta
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-14 px-8 rounded-full border border-border text-foreground font-medium hover:border-muted-foreground hover:bg-surface-raised transition-all hover:-translate-y-0.5"
          >
            Já sou membro
          </Link>
        </div>

        <div className="mt-24 pt-14 border-t border-border/60 max-w-3xl mx-auto pb-20">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Junte-se também a nossas comunidades
          </p>
          <h3 className="display-tight font-bold text-2xl md:text-3xl mb-8">
            Onde a galera conversa todo dia.
          </h3>
          <SocialButtons />
        </div>
      </div>
    </section>
  );
};
