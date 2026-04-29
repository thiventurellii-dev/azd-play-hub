import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Share2,
  Skull,
  Sword,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EntitySheet } from '@/components/shared/EntitySheet';
import { CharacterForm } from '@/components/rpg/CharacterForm';
import { useRpgCharacterDetail } from '@/hooks/useRpgCharacterDetail';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { RpgSessionEventType } from '@/types/rpg';

const monthYear = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
};
const shortDate = (iso?: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const fullDate = (iso?: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const eventMeta: Record<RpgSessionEventType, { label: string; dot: string; chip: string }> = {
  death:          { label: 'Morte',      dot: 'bg-destructive',     chip: 'bg-destructive/15 text-destructive border-destructive/30' },
  level_up:       { label: 'Level up',   dot: 'bg-emerald-500',     chip: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  milestone:      { label: 'Marco',      dot: 'bg-gold',            chip: 'bg-gold/15 text-gold border-gold/30' },
  legendary_item: { label: 'Item lendário', dot: 'bg-purple-500',   chip: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  important_npc:  { label: 'NPC',        dot: 'bg-blue-500',        chip: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  betrayal:       { label: 'Traição',    dot: 'bg-orange-500',      chip: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  achievement:    { label: 'Momento heróico',  dot: 'bg-gold',            chip: 'bg-gold/15 text-gold border-gold/30' },
  alliance:       { label: 'Aliança',    dot: 'bg-teal-500',        chip: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  rivalry:        { label: 'Rivalidade', dot: 'bg-red-500',         chip: 'bg-red-500/15 text-red-400 border-red-500/30' },
  revelation:     { label: 'Revelação',  dot: 'bg-indigo-500',      chip: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  discovery:      { label: 'Descoberta', dot: 'bg-lime-500',        chip: 'bg-lime-500/15 text-lime-400 border-lime-500/30' },
  defeat:         { label: 'Derrota',    dot: 'bg-zinc-500',         chip: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  moral_dilemma:  { label: 'Dilema moral', dot: 'bg-orange-500',     chip: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};

const statusPill = (status: string) => {
  switch (status) {
    case 'active':
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Ativo</span>;
    case 'dead':
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive"><Skull className="h-3 w-3" /> Caída</span>;
    case 'retired':
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Aposentado</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Saiu</span>;
  }
};

const campaignBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">Em curso</span>;
    case 'completed':
      return <span className="text-[11px] px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 font-medium">Concluída</span>;
    case 'planning':
      return <span className="text-[11px] px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-medium">Planejamento</span>;
    case 'abandoned':
      return <span className="text-[11px] px-2 py-0.5 rounded-full border border-muted text-muted-foreground bg-muted/30 font-medium">Abandonada</span>;
    default:
      return null;
  }
};

const StatBox = ({ value, label }: { value: string | number; label: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <p className="text-2xl font-bold leading-none mb-1">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);

const RpgCharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useRpgCharacterDetail(id);
  const [editOpen, setEditOpen] = useState(false);
  const [createSibOpen, setCreateSibOpen] = useState(false);

  useEffect(() => {
    if (data?.character?.name) document.title = `${data.character.name} | Personagem`;
  }, [data?.character?.name]);

  if (isLoading) {
    return (
      <div className="container py-6 max-w-5xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <Skeleton className="h-72 w-full rounded-2xl" />
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
  const stats = data.stats ?? { campaigns: 0, sessions: 0, minutes: 0, since: c.created_at, overall_status: 'active' as const };
  const isOwner = user?.id === c.player_id;
  const isFallen = stats.overall_status === 'dead';
  const ownerHandle = data.owner?.nickname || data.owner?.id;
  const hours = Math.round((stats.minutes || 0) / 60);
  const initials = (c.name || '?').slice(0, 1).toUpperCase();

  const handleShare = async () => {
    const url = `${window.location.origin}/rpg/personagens/${c.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  return (
    <div className="container py-4 md:py-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>
            {data.owner ? (
              <>Perfil de <span className="text-foreground/80">{data.owner.nickname || data.owner.name}</span></>
            ) : 'Voltar'}
          </span>
          <span className="opacity-40 mx-1">/</span>
          <span className="text-foreground">{c.name}</span>
        </button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* HERO compacto */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 mb-4 ${
          isFallen
            ? 'border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card'
            : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          {/* Portrait quadrado */}
          <div
            className={`relative h-28 w-28 md:h-32 md:w-32 rounded-2xl overflow-hidden border-2 flex-shrink-0 ${
              isFallen ? 'border-destructive/40' : 'border-emerald-500/30 bg-emerald-500/5'
            }`}
          >
            {c.portrait_url ? (
              <img
                src={c.portrait_url}
                alt={c.name}
                className={`h-full w-full object-cover ${isFallen ? 'grayscale' : ''}`}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className={`text-5xl font-bold ${isFallen ? 'text-destructive/60' : 'text-emerald-400/80'}`}>
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isFallen ? 'line-through decoration-destructive/60' : ''}`}>
                {c.name}
              </h1>
              {statusPill(stats.overall_status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {[c.race, c.class].filter(Boolean).join(' • ') || 'Aventureiro'}
              {c.level ? ` • Nível ${c.level}` : ''}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {[c.alignment, data.system?.name].filter(Boolean).join(' • ') || '—'}
            </p>

            {c.traits && (
              <p className="italic text-sm text-foreground/90 mt-3">
                "{c.traits.split('\n')[0].slice(0, 140)}"
              </p>
            )}

            {data.owner && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={data.owner.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px]">{data.owner.name?.[0]}</AvatarFallback>
                </Avatar>
                <span>Jogador</span>
                <Link
                  to={`/perfil/${ownerHandle}`}
                  className="text-foreground font-semibold hover:text-gold"
                >
                  {data.owner.nickname || data.owner.name}
                </Link>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex md:flex-col items-start gap-2 md:items-end">
            {isOwner && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" /> Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBox value={stats.campaigns} label="Campanhas" />
        <StatBox value={stats.sessions} label="Sessões" />
        <StatBox value={`${hours}h`} label="De mesa" />
        <StatBox value={monthYear(stats.since)} label="Desde" />
      </div>

      {/* Grid principal */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-4 min-w-0">
          {/* História */}
          {c.backstory && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold mb-3">História</h2>
              <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {c.backstory}
              </p>
            </section>
          )}

          {/* Campanhas */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Campanhas</h2>
              <span className="text-xs text-muted-foreground">
                {(data.appearances ?? []).length} campanha{(data.appearances ?? []).length === 1 ? '' : 's'}
              </span>
            </div>
            {(data.appearances ?? []).length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Este personagem ainda não viveu nenhuma aventura.
              </div>
            ) : (
              <div className="space-y-2">
                {(data.appearances ?? []).map((a) => {
                  const camp = a.campaign;
                  const dateRange = a.exited_at
                    ? `${fullDate(a.joined_at)} — ${fullDate(a.exited_at)}`
                    : `iniciada em ${fullDate(a.joined_at)}`;
                  const hrs = Math.round(a.total_minutes / 60);
                  return (
                    <Link
                      key={a.id}
                      to={camp?.slug ? `/campanhas/${camp.slug}` : '#'}
                      className="block rounded-xl border border-border bg-background/40 p-3 hover:border-gold/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm">{camp?.name || 'Campanha'}</p>
                        {camp && campaignBadge(camp.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {camp?.master_name && <>Mestre: <span className="text-foreground/80">{camp.master_name}</span> · </>}
                        {dateRange}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-muted-foreground">
                          {a.session_count} sessões{hrs > 0 ? ` · ${hrs}h` : ''}
                        </span>
                        {a.level_end && (
                          <span className="text-foreground/80 font-medium">
                            Nv {c.level && a.level_end <= c.level ? c.level - a.level_end + 1 : 1} → {a.level_end + (c.level && a.level_end < c.level ? (c.level - a.level_end) : 0) || c.level}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Momentos marcantes */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Momentos marcantes</h2>
              <span className="text-xs text-muted-foreground">
                {(data.moments ?? []).length} destaque{(data.moments ?? []).length === 1 ? '' : 's'}
              </span>
            </div>
            {(data.moments ?? []).length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Os momentos marcantes aparecerão conforme as sessões forem registradas.
              </div>
            ) : (
              <div className="relative pl-4 space-y-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border/60">
                {(data.moments ?? []).map((m) => {
                  const meta = eventMeta[m.event_type];
                  return (
                    <div key={m.id} className="relative">
                      <div className={`absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full ${meta.dot} ring-4 ring-card`} />
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${meta.chip}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.session_number != null && `Sessão ${m.session_number} · `}
                          {m.campaign_name}
                          {m.session_date && ` · ${shortDate(m.session_date)}`}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{m.description || '—'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-4">
          {/* Detalhes */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-bold mb-3">Detalhes</h3>
            <div className="space-y-3 text-sm">
              {c.traits && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Traços</p>
                  <p className="text-sm font-medium whitespace-pre-wrap">{c.traits}</p>
                </div>
              )}
              {c.gear && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Equipamento</p>
                  <p className="text-sm font-medium whitespace-pre-wrap">{c.gear}</p>
                </div>
              )}
              {c.alignment && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Alinhamento</p>
                  <p className="text-sm font-medium">{c.alignment}</p>
                </div>
              )}
            </div>
          </section>

          {/* Ficha externa */}
          {c.external_url && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-bold mb-1">Ficha completa</h3>
              <p className="text-xs text-muted-foreground mb-3">Mantida fora do AzD</p>
              <a href={c.external_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-1.5">
                  Abrir ficha externa <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </section>
          )}

          {/* Outros heróis */}
          {((data.siblings ?? []).length > 0 || isOwner) && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-bold mb-3">
                Outros heróis{data.owner ? ` de ${data.owner.nickname || data.owner.name}` : ''}
              </h3>
              <div className="space-y-2">
                {(data.siblings ?? []).map((s) => {
                  const isDead = s.status === 'dead';
                  const sInit = s.name?.[0]?.toUpperCase() || '?';
                  return (
                    <Link
                      key={s.id}
                      to={`/rpg/personagens/${s.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-secondary/50 transition-colors"
                    >
                      <div className={`h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ${isDead ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                        {s.portrait_url ? (
                          <img src={s.portrait_url} alt="" className={`h-full w-full object-cover ${isDead ? 'grayscale' : ''}`} />
                        ) : (
                          <span className={`text-sm font-bold ${isDead ? 'text-destructive/70' : 'text-emerald-400/80'}`}>{sInit}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-medium truncate ${isDead ? 'line-through text-muted-foreground' : ''}`}>
                            {s.name}
                          </p>
                          {isDead && <Skull className="h-3 w-3 text-destructive flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[s.class, s.level ? `Nv ${s.level}` : null].filter(Boolean).join(' · ')}
                          {isDead && s.exited_at && ` · ${shortDate(s.exited_at)}`}
                          {!isDead && s.status === 'active' && ' · Ativo'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {isOwner && (
                  <button
                    onClick={() => setCreateSibOpen(true)}
                    className="w-full mt-2 border border-dashed border-border rounded-lg p-2.5 text-xs text-muted-foreground hover:border-gold/40 hover:text-gold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Novo personagem
                  </button>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {isOwner && (
        <>
          <EntitySheet
            open={editOpen}
            onOpenChange={setEditOpen}
            title="Editar Personagem"
            description="Atualize a ficha ou apague este personagem."
          >
            <CharacterForm character={c} onSuccess={() => setEditOpen(false)} />
          </EntitySheet>
          <EntitySheet
            open={createSibOpen}
            onOpenChange={setCreateSibOpen}
            title="Novo Personagem"
            description="Crie um novo herói pra sua coleção."
          >
            <CharacterForm onSuccess={() => setCreateSibOpen(false)} />
          </EntitySheet>
        </>
      )}
    </div>
  );
};

export default RpgCharacterDetail;
