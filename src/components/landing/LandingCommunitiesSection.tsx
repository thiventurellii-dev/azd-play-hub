import { Users, MessageCircle, Calendar } from "lucide-react";
import { SplitSection } from "./SplitSection";

const CommunitiesMockup = () => (
  <div className="space-y-3 max-w-md">
    {[
      { icon: Users, name: "Amizade (AzD)", meta: "29 membros · 5 seasons", color: "hsl(43 80% 35%)", featured: true },
      { icon: MessageCircle, name: "Sua comunidade aqui", meta: "Crie em minutos · grátis", color: "hsl(220 30% 30%)" },
      { icon: Calendar, name: "Outra comunidade", meta: "Rankings · partidas · discussões", color: "hsl(160 30% 25%)" },
    ].map((c, i) => {
      const Icon = c.icon;
      return (
        <div
          key={i}
          className={`bg-card border rounded-2xl p-5 flex items-center gap-4 ${
            c.featured ? "border-gold/40 shadow-[0_0_0_1px_hsl(var(--gold)/0.15),0_8px_32px_-12px_hsl(var(--gold)/0.3)]" : "border-border"
          }`}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: c.color }}
          >
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-base font-bold truncate">{c.name}</div>
              {c.featured && (
                <span className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold text-background">
                  Ativa
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.meta}</div>
          </div>
        </div>
      );
    })}
    <div className="text-center text-xs text-muted-foreground pt-2">
      + suas próprias categorias, regras e rankings
    </div>
  </div>
);

export const LandingCommunitiesSection = () => (
  <SplitSection
    id="comunidades"
    tag="Comunidades"
    title={<>Traga sua<br /><span className="text-gold">Comunidade</span></>}
    body="A amizade envolve todas as outras comunidade. Crie sua própria comunidade na plataforma — gerencie membros, organize seus rankings, agende partidas e mantenha discussões num espaço só seu."
    features={[
      "Crie sua comunidade em minutos, totalmente grátis",
      "Rankings, seasons e estatísticas próprios do seu grupo",
      "Discussões, categorias e tópicos personalizados",
      "Calendário de partidas integrado com confirmação de presença",
    ]}
    cta={{ label: "Criar minha comunidade", to: "/register" }}
    mockup={<CommunitiesMockup />}
    className="bg-surface border-t border-border"
  />
);
