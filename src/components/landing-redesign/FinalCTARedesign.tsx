import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLandingData } from "@/hooks/useLandingData";
import { SocialButtons } from "@/components/home/SocialButtons";
import { supabase } from "@/lib/supabaseExternal";

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

          {discordUrl && (
            <div className="mb-8 flex justify-center">
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 h-14 px-8 rounded-full bg-[#5865F2] text-white font-semibold hover:bg-[#4752c4] transition-all hover:-translate-y-0.5 shadow-[0_20px_40px_-20px_rgba(88,101,242,0.6)]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                  <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Entrar no Discord da AzD
              </a>
            </div>
          )}

          <SocialButtons />
        </div>
      </div>
    </section>
  );
};
