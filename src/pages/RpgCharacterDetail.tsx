import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Lock, Pencil, Skull, Sword, Sparkles, BookOpen, Shield, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EntitySheet } from '@/components/shared/EntitySheet';
import { CharacterForm } from '@/components/rpg/CharacterForm';
import { useRpgCharacterDetail } from '@/hooks/useRpgCharacterDetail';
import { useAuth } from '@/contexts/AuthContext';

const statusBadge = (status: string) => {
  switch (status) {
    case 'dead':
      return (
        <Badge variant="destructive" className="gap-1 text-[10px]">
          <Skull className="h-3 w-3" /> Caído
        </Badge>
      );
    case 'retired':
      return (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          Aposentado
        </Badge>
      );
    case 'left':
      return (
        <Badge variant="outline" className="gap-1 text-[10px]">
          Saiu
        </Badge>
      );
    case 'active':
      return (
        <Badge className="gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
          Ativo
        </Badge>
      );
    default:
      return null;
  }
};

const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const RpgCharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useRpgCharacterDetail(id);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (data?.character?.name) document.title = `${data.character.name} | Personagem`;
  }, [data?.character?.name]);

  if (isLoading) {
    return (
      <div className="container py-6 max-w-5xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground mb-4">Personagem não encontrado.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }
  const c = data.character;
  const isOwner = user?.id === c.player_id;
  const hasFallen = data.appearances.some((a) => a.status === 'dead');

  return (
    <div className="container py-4 md:py-6 max-w-5xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 mb-4
          ${
            hasFallen
              ? 'border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card'
              : 'border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card'
          }`}
      >
        {c.portrait_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${c.portrait_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/30" />

        <div className="relative flex flex-col md:flex-row gap-6">
          {/* Portrait */}
          <div className="flex-shrink-0">
            <div
              className={`relative h-40 w-40 md:h-48 md:w-48 rounded-2xl overflow-hidden border-2 ${
                hasFallen ? 'border-destructive/50' : 'border-gold/40'
              }`}
            >
              {c.portrait_url ? (
                <img
                  src={c.portrait_url}
                  alt={c.name}
                  className={`h-full w-full object-cover ${hasFallen ? 'grayscale' : ''}`}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-secondary">
                  <Sword className="h-16 w-16 text-gold/40" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1
                className={`text-3xl md:text-4xl font-bold tracking-tight ${
                  hasFallen ? 'line-through decoration-destructive/60' : ''
                }`}
              >
                {c.name}
              </h1>
              {!c.is_public && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Lock className="h-2.5 w-2.5" /> Privado
                </Badge>
              )}
              {hasFallen && (
                <Badge variant="destructive" className="gap-1">
                  <Skull className="h-3 w-3" /> Caído em batalha
                </Badge>
              )}
            </div>
            <p className="text-base text-muted-foreground mb-3">
              {[c.race, c.class].filter(Boolean).join(' • ') || 'Aventureiro'}
              {c.level ? ` • Nível ${c.level}` : ''}
              {c.alignment ? ` • ${c.alignment}` : ''}
            </p>

            {data.owner && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={data.owner.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{data.owner.name?.[0]}</AvatarFallback>
                </Avatar>
                Jogado por{' '}
                <Link
                  to={`/perfil/${data.owner.nickname || data.owner.id}`}
                  className="text-foreground font-medium hover:text-gold"
                >
                  {data.owner.nickname || data.owner.name}
                </Link>
                {data.system && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{data.system.name}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {c.external_url && (
                <a href={c.external_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Mais informações
                  </Button>
                </a>
              )}
              {isOwner && (
                <Button size="sm" variant="gold" className="gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Main column */}
        <div className="space-y-4 min-w-0">
          {c.backstory && (
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-gold" />
                <h2 className="text-lg font-bold">Backstory</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {c.backstory}
              </p>
            </section>
          )}

          {(c.traits || c.gear) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {c.traits && (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-gold" />
                    <h3 className="text-sm font-bold">Traços marcantes</h3>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.traits}</p>
                </section>
              )}
              {c.gear && (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-gold" />
                    <h3 className="text-sm font-bold">Equipamento</h3>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.gear}</p>
                </section>
              )}
            </div>
          )}

          {/* Campanhas */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" />
                <h2 className="text-lg font-bold">Jornadas</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {data.appearances.length} campanha{data.appearances.length === 1 ? '' : 's'}
              </span>
            </div>
            {data.appearances.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Este personagem ainda não viveu nenhuma aventura.
              </div>
            ) : (
              <div className="space-y-2">
                {data.appearances.map((a) => (
                  <Link
                    key={a.id}
                    to={a.campaign?.slug ? `/campanhas/${a.campaign.slug}` : '#'}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 hover:border-gold/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                      {a.campaign?.image_url ? (
                        <img src={a.campaign.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gold/60">
                          <Sword className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {a.campaign?.name || 'Campanha'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Entrou em {dateLong(a.joined_at)}
                        {a.exited_at && ` · saiu em ${dateLong(a.exited_at)}`}
                      </p>
                    </div>
                    {statusBadge(a.status)}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold mb-3">Ficha</h3>
            <dl className="space-y-2 text-xs">
              <Row label="Raça" value={c.race} />
              <Row label="Classe" value={c.class} />
              <Row label="Nível" value={c.level?.toString() ?? '—'} />
              <Row label="Alinhamento" value={c.alignment} />
              <Row label="Sistema" value={data.system?.name ?? null} />
              <Row label="Visibilidade" value={c.is_public ? 'Pública' : 'Privada'} />
              <Row label="Criado em" value={dateLong(c.created_at)} />
            </dl>
          </section>
        </aside>
      </div>

      {isOwner && (
        <EntitySheet
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Editar Personagem"
          description="Atualize a ficha ou apague este personagem."
        >
          <CharacterForm character={c} onSuccess={() => setEditOpen(false)} />
        </EntitySheet>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex items-center justify-between gap-2">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium text-right">{value || '—'}</dd>
  </div>
);

export default RpgCharacterDetail;
