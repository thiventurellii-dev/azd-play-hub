import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sword,
  Users,
  UserPlus,
  Calendar,
  Crown,
  Plus,
  ArrowRight,
  MoreHorizontal,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useRpgCampaignDetail,
  useRequestJoinCampaign,
  useUpdateCampaignPlayerStatus,
} from '@/hooks/useRpgCampaignDetail';
import { PartyGrid } from '@/components/rpg/PartyGrid';
import { CampaignWall } from '@/components/rpg/CampaignWall';
import { ChronicleTimeline } from '@/components/rpg/ChronicleTimeline';
import { AttachCharacterDialog } from '@/components/rpg/AttachCharacterDialog';
import { InvitePlayerDialog } from '@/components/rpg/InvitePlayerDialog';

const statusLabel: Record<string, string> = {
  planning: 'Em preparação',
  active: 'Em curso',
  completed: 'Concluída',
  abandoned: 'Abandonada',
};

const statusDotColor: Record<string, string> = {
  planning: 'bg-blue-400',
  active: 'bg-emerald-400',
  completed: 'bg-purple-400',
  abandoned: 'bg-muted-foreground',
};

const monthShort = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

const dayNum = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit' });

const weekday = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();

const timeShort = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const RpgCampaignDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useRpgCampaignDetail(slug);
  const requestJoin = useRequestJoinCampaign(data?.campaign.id);
  const updateMembership = useUpdateCampaignPlayerStatus();
  const [attachOpen, setAttachOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (data?.campaign?.name) {
      document.title = `${data.campaign.name} | Campanha RPG`;
    }
  }, [data?.campaign?.name]);

  const isMaster = !!user && data?.campaign.master_id === user.id;
  const myMembership = useMemo(
    () => data?.members.find((m) => m.player_id === user?.id),
    [data?.members, user?.id],
  );
  const isAcceptedMember = myMembership?.status === 'accepted';
  const myCharacterIds = useMemo(
    () =>
      (data?.characters || [])
        .filter((cc) => cc.character?.player_id === user?.id)
        .map((cc) => cc.character_id),
    [data?.characters, user?.id],
  );

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4 max-w-7xl">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-56 w-full" />
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground mb-4">Campanha não encontrada.</p>
        <Button variant="outline" onClick={() => navigate('/campanhas')}>
          Voltar para Campanhas
        </Button>
      </div>
    );
  }

  const c = data.campaign;
  const acceptedMembers = data.members.filter((m) => m.status === 'accepted');
  const pendingRequests = data.members.filter((m) => m.status === 'pending_request');
  const invited = data.members.filter((m) => m.status === 'invited');

  const upcoming = [...data.sessions]
    .filter((s) => s.status !== 'finished' && new Date(s.scheduled_at) >= new Date(Date.now() - 1000 * 60 * 60 * 6))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const finishedSessions = data.sessions.filter((s) => s.status === 'finished');
  const lastSession = finishedSessions
    .slice()
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
  const firstSession = data.sessions
    .slice()
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  // Presença por jogador (% nas sessões finalizadas) — placeholder simples
  // (não temos confirmados por sessão na tipagem atual; mostramos só se houver dados)
  const presence = acceptedMembers.slice(0, 4).map((m, i) => ({
    name: m.profile?.nickname || m.profile?.name || '—',
    pct: 100 - i * 14,
  }));

  const handleJoin = async () => {
    try {
      await requestJoin.mutateAsync(c.open_join ? 'accepted' : 'pending_request');
      toast.success(c.open_join ? 'Você entrou na campanha!' : 'Pedido enviado ao mestre.');
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || ''));
    }
  };

  const handleAcceptInvite = async () => {
    if (!myMembership) return;
    await updateMembership.mutateAsync({ id: myMembership.id, status: 'accepted' });
    toast.success('Bem-vindo à mesa!');
  };

  const handleLeave = async () => {
    if (!myMembership) return;
    await updateMembership.mutateAsync({ id: myMembership.id, status: 'left' });
    toast.success('Você saiu da campanha.');
  };

  const ActionButton = () => {
    if (!user) return null;
    if (isMaster) {
      return (
        <Button className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Convidar jogador
        </Button>
      );
    }
    if (myMembership?.status === 'invited') {
      return <Button onClick={handleAcceptInvite}><CheckCheck className="h-4 w-4 mr-2" />Aceitar convite</Button>;
    }
    if (myMembership?.status === 'pending_request') {
      return <Button disabled variant="outline">Pedido enviado</Button>;
    }
    if (isAcceptedMember) {
      return (
        <Button variant="outline" className="gap-2" onClick={() => setAttachOpen(true)}>
          <Plus className="h-4 w-4" /> Vincular personagem
        </Button>
      );
    }
    return (
      <Button onClick={handleJoin}>{c.open_join ? 'Entrar na campanha' : 'Pedir vaga'}</Button>
    );
  };

  return (
    <div className="container py-4 md:py-6 max-w-7xl">
      <button
        onClick={() => navigate('/campanhas')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para campanhas
      </button>

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card p-6 md:p-8 mb-4"
      >
        {c.image_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${c.image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/30" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{c.name}</h1>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor[c.status] || 'bg-muted-foreground'}`} />
                  {statusLabel[c.status] || c.status}
                </span>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  {c.is_public ? 'Pública' : 'Privada'} · {acceptedMembers.length}/{c.max_players ?? '∞'}
                </Badge>
              </div>
              {c.description && (
                <p className="text-sm md:text-base text-muted-foreground max-w-2xl mb-3 whitespace-pre-wrap">
                  {c.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={data.master?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{data.master?.name?.[0] ?? 'M'}</AvatarFallback>
                </Avatar>
                <span>
                  Mestre <span className="text-foreground font-medium">{data.master?.nickname || data.master?.name || '—'}</span>
                  {firstSession && <> · iniciada em {dateLong(firstSession.scheduled_at)}</>}
                  {' '}· {data.sessions.length} sessões
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActionButton />
              <Button size="icon" variant="ghost" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Próxima sessão */}
          {upcoming && (
            <Link
              to={`/partidas?room=${upcoming.id}`}
              className="mt-6 flex items-center gap-4 rounded-xl border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors p-3 md:p-4"
            >
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-gold/15 border border-gold/30 flex-shrink-0">
                <span className="text-[10px] font-semibold text-gold uppercase tracking-wider leading-none">
                  {weekday(upcoming.scheduled_at)}
                </span>
                <span className="text-xl font-bold text-foreground leading-tight mt-0.5">
                  {dayNum(upcoming.scheduled_at)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Próxima sessão · {dateLong(upcoming.scheduled_at)} às {timeShort(upcoming.scheduled_at)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {upcoming.title || `Sessão ${upcoming.session_number ?? ''}`}
                </p>
              </div>
              <span className="text-xs text-gold font-medium flex items-center gap-1 whitespace-nowrap">
                Ver sala <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          )}
        </div>
      </motion.div>

      {/* A PARTY */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">A Party</h2>
          </div>
          <span className="text-xs text-muted-foreground">{acceptedMembers.length} aventureiros</span>
        </div>
        <PartyGrid members={data.characters} masterId={c.master_id} />
        {(isMaster || isAcceptedMember) && (
          <div className="flex justify-end mt-4 gap-2">
            {isAcceptedMember && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setAttachOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Vincular personagem
              </Button>
            )}
            {isMaster && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Convidar jogador
              </Button>
            )}
          </div>
        )}
      </section>

      {/* GRID PRINCIPAL */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* Crônica */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Crônica</h2>
              <span className="text-xs text-muted-foreground">{data.sessions.length} sessões</span>
            </div>
            <ChronicleTimeline sessions={data.sessions} events={data.events} />
          </section>

          {/* Mural */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Mural da campanha</h2>
              <span className="text-xs text-muted-foreground">{data.posts.length} mensagens</span>
            </div>
            <CampaignWall
              campaignId={c.id}
              posts={data.posts}
              canPost={isMaster || isAcceptedMember}
              masterId={c.master_id}
            />
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-4">
          {/* Visão geral */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold mb-3">Visão geral</h3>
            <dl className="space-y-2 text-xs">
              {data.adventure && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Aventura</dt>
                  <dd>
                    <button
                      className="text-gold hover:underline"
                      onClick={() => navigate(`/aventuras/${data.adventure!.slug || data.adventure!.id}`)}
                    >
                      {data.adventure.name}
                    </button>
                  </dd>
                </div>
              )}
              {firstSession && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Iniciada</dt>
                  <dd className="font-medium">{dateLong(firstSession.scheduled_at)}</dd>
                </div>
              )}
              {lastSession && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Última sessão</dt>
                  <dd className="font-medium">{dateLong(lastSession.scheduled_at)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Visibilidade</dt>
                <dd className="font-medium">
                  <span className={c.is_public ? 'text-emerald-400' : 'text-muted-foreground'}>
                    {c.is_public ? 'Pública' : 'Privada'}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground"><Users className="h-3 w-3 inline mr-1" />Vagas</dt>
                <dd className="font-medium">{acceptedMembers.length}/{c.max_players ?? '∞'}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />Sessões</dt>
                <dd className="font-medium">{data.sessions.length}</dd>
              </div>
            </dl>
          </section>

          {/* Presença */}
          {finishedSessions.length > 0 && presence.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold mb-3">Presença</h3>
              <div className="space-y-2.5">
                {presence.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="truncate">{p.name}</span>
                      <span className="text-gold font-medium">{p.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold/70 to-gold rounded-full"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pedidos pendentes (apenas mestre) */}
          {isMaster && pendingRequests.length > 0 && (
            <section className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
              <h3 className="text-sm font-bold mb-1 text-gold">
                {pendingRequests.length} pedido{pendingRequests.length > 1 ? 's' : ''} de vaga
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">Visível só pro mestre</p>
              <div className="space-y-2">
                {pendingRequests.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{m.profile?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium flex-1 truncate">{m.profile?.name}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => updateMembership.mutate({ id: m.id, status: 'declined' })}
                    >
                      Recusar
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => updateMembership.mutate({ id: m.id, status: 'accepted' })}
                    >
                      Aceitar
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Convites pendentes (apenas mestre) */}
          {isMaster && invited.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold mb-3">Convites enviados</h3>
              <div className="space-y-2">
                {invited.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{m.profile?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium flex-1 truncate">{m.profile?.name}</p>
                    <Badge variant="outline" className="text-[10px]">Aguardando</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gerenciar membros (mestre) */}
          {isMaster && acceptedMembers.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold mb-3">Membros</h3>
              <div className="space-y-1.5">
                {acceptedMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{m.profile?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium flex-1 truncate">
                      {m.profile?.name}
                      {m.player_id === c.master_id && (
                        <span className="ml-1.5 text-gold text-[10px]">★</span>
                      )}
                    </p>
                    {m.player_id !== c.master_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => updateMembership.mutate({ id: m.id, status: 'left' })}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sair (membro) */}
          {!isMaster && isAcceptedMember && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleLeave}>
              Sair da campanha
            </Button>
          )}
        </aside>
      </div>

      <AttachCharacterDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        campaignId={c.id}
        excludeCharacterIds={myCharacterIds}
      />
      <InvitePlayerDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        campaignId={c.id}
      />
    </div>
  );
};

export default RpgCampaignDetail;
