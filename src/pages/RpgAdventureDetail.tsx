import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Calendar, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useRpgAdventureDetail } from '@/hooks/useRpgAdventureDetail';
import AdventureInterestCard from '@/components/rpg/AdventureInterestCard';
import AdventureIntensityBars from '@/components/rpg/AdventureIntensityBars';
import AdventureMasterNotes from '@/components/rpg/AdventureMasterNotes';
import AdventureSidebar from '@/components/rpg/AdventureSidebar';
import { EntityEditButton } from '@/components/shared/EntityEditButton';
import RpgAdventureForm from '@/components/forms/RpgAdventureForm';

const RpgAdventureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { adventure, isLoading, interests, hasInterest, isMestre, toggleInterest } =
    useRpgAdventureDetail(slug);

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!adventure) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground mb-4">Aventura não encontrada.</p>
        <Button variant="outline" onClick={() => navigate('/games')}>Voltar para Jogos</Button>
      </div>
    );
  }

  const a = adventure;
  const handleSoon = (feature: string) => () =>
    toast.info(`${feature} estará disponível em breve.`, { description: 'Funcionalidade da Fase 3 do roadmap RPG.' });

  return (
    <div className="container py-4 md:py-6 max-w-6xl">
      {/* Back */}
      <button
        onClick={() => navigate('/games')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para aventuras
      </button>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-4 grid gap-5 md:grid-cols-[140px_1fr_280px]"
      >
        {/* Cover */}
        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/15 via-secondary to-background flex items-center justify-center">
          {a.image_url ? (
            <img src={a.image_url} alt={a.name} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center px-3">
              <Sparkles className="h-8 w-8 text-gold/40 mx-auto mb-1.5" />
              <p className="text-[10px] text-muted-foreground">Capa da aventura</p>
            </div>
          )}
        </div>

        {/* Title + tags + actions */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{a.name}</h1>
            {a.tag === 'official' && (
              <Star className="h-5 w-5 text-gold fill-gold/40" />
            )}
            <div className="ml-auto">
              <EntityEditButton
                entityType="rpg"
                title="Editar Aventura"
                widthClass="sm:max-w-2xl"
              >
                {(onClose) => (
                  <RpgAdventureForm
                    adventure={{
                      id: a.id,
                      name: a.name,
                      description: a.description,
                      tag: a.tag,
                      image_url: a.image_url,
                      system_id: a.system_id,
                      slug: a.slug,
                    }}
                    onSuccess={onClose}
                  />
                )}
              </EntityEditButton>
            </div>
          </div>
          {a.tagline && <p className="text-sm text-muted-foreground mb-3">{a.tagline}</p>}
          {!a.tagline && a.description && (
            <p className="text-sm text-muted-foreground mb-3">{a.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-4">
            {a.system && (
              <Badge variant="outline" className="border-gold/30 text-gold/90">
                🎭 {a.system.name}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={a.tag === 'homebrew' ? 'border-orange-500/30 text-orange-400' : 'border-emerald-500/30 text-emerald-400'}
            >
              {a.tag === 'homebrew' ? '🏠 Homebrew' : '📖 Oficial'}
            </Badge>
            {(a.genres || []).map(g => (
              <Badge key={g} variant="secondary" className="text-muted-foreground">{g}</Badge>
            ))}
          </div>

          {/* Master-only actions */}
          {isMestre && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 border-gold/40 text-gold hover:bg-gold/10" onClick={handleSoon('Criar campanha')}>
                  <Plus className="h-3.5 w-3.5" /> Criar campanha
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSoon('Marcar sessão')}>
                  <Calendar className="h-3.5 w-3.5" /> Marcar sessão
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60">Visível apenas para mestres</p>
            </div>
          )}
        </div>

        {/* Interest card (header CTA) */}
        <div className="md:col-start-3 md:row-start-1 md:row-span-1">
          <AdventureInterestCard
            interests={interests}
            hasInterest={hasInterest}
            onToggle={toggleInterest}
          />
        </div>
      </motion.div>

      {/* Intensity */}
      {a.intensity && Object.keys(a.intensity).length > 0 && (
        <AdventureIntensityBars intensity={a.intensity} className="mb-4" />
      )}

      {/* Quick stats row */}
      {(a.level_min || a.players_min || a.duration_hours_min || a.tone) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-xl border border-border bg-card p-4 mb-4">
          {a.level_min != null && (
            <Stat label="Nível" value={`${a.level_min}${a.level_max ? ` – ${a.level_max}` : ''}`} />
          )}
          {a.players_min != null && (
            <Stat label="Jogadores" value={`${a.players_min}${a.players_max ? ` – ${a.players_max}` : ''}`} />
          )}
          {a.duration_hours_min != null && (
            <Stat label="Duração" value={`${a.duration_hours_min}${a.duration_hours_max ? ` – ${a.duration_hours_max}` : ''}h`} />
          )}
          {a.tone && <Stat label="Tom" value={a.tone} />}
        </div>
      )}

      {/* Two-column body */}
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="space-y-3">
          {(a.about_long || a.description) && (
            <Card title="Sobre a aventura">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {a.about_long || a.description}
              </p>
            </Card>
          )}

          {a.highlights && a.highlights.length > 0 && (
            <Card title="O que torna esta aventura especial">
              <div className="grid sm:grid-cols-2 gap-3">
                {a.highlights.map((h, i) => (
                  <div key={i} className="border-l-2 border-gold/50 pl-3">
                    <p className="text-sm font-medium text-foreground">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Notas para o Mestre">
            <AdventureMasterNotes notes={a.master_notes} />
          </Card>

          <Card title="Campanhas dessa aventura">
            <p className="text-xs text-muted-foreground italic">
              Em breve — sistema de campanhas será liberado na próxima fase.
            </p>
          </Card>

          <Card title="Aventureiros que se aventuraram">
            <p className="text-xs text-muted-foreground italic">
              Em breve — lista será preenchida conforme sessões forem registradas.
            </p>
          </Card>
        </div>

        <AdventureSidebar adventure={a} />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground mt-0.5">{value}</p>
  </div>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 md:p-5">
    <p className="text-sm md:text-base font-semibold text-foreground mb-3">{title}</p>
    {children}
  </div>
);

export default RpgAdventureDetail;
