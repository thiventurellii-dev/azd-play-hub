import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sword, Users, UserPlus, Calendar, Crown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  active: 'Ativa',
  completed: 'Concluída',
  abandoned: 'Abandonada',
};

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
      <div className="container py-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
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

  return (
    <div className="container py-4 md:py-6 max-w-6xl">
      <button
        onClick={() => navigate('/campanhas')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para campanhas
      </button>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-4 grid gap-5 md:grid-cols-[140px_1fr_280px]"
      >
        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/15 via-secondary to-background flex items-center justify-center">
          {c.image_url ? (
            <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            <Sword className="h-12 w-12 text-gold/40" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{c.name}</h1>
            <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30">
              {statusLabel[c.status] || c.status}
            </Badge>
          </div>
          {data.adventure && (
            <p className="text-xs text-muted-foreground mb-2">
              Aventura:{' '}
              <button
                className="underline hover:text-foreground"
                onClick={() => navigate(`/aventuras/${data.adventure!.slug || data.adventure!.id}`)}
              >
                {data.adventure.name}
              </button>
            </p>
          )}
          {c.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
              {c.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={data.master?.avatar_url || undefined} />
              <AvatarFallback>{data.master?.name?.[0] ?? 'M'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight flex items-center gap-1">
                <Crown className="h-3 w-3 text-gold" /> Mestre
              </p>
              <p className="text-sm font-medium leading-tight">
                {data.master?.nickname || data.master?.name || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar de ações */}
        <div className="space-y-2">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Party
              </span>
              <span className="font-medium">
                {acceptedMembers.length}/{c.max_players ?? '∞'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Sessões
              </span>
              <span className="font-medium">{data.sessions.length}</span>
            </div>
          </div>

          {/* Botões de ação */}
          {!user ? null : isMaster ? (
            <div className="space-y-2">
              <Button className="w-full gap-2" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Convidar jogador
              </Button>
              {pendingRequests.length > 0 && (
                <p className="text-[11px] text-gold text-center">
                  {pendingRequests.length} pedido(s) pendente(s)
                </p>
              )}
            </div>
          ) : myMembership?.status === 'invited' ? (
            <Button className="w-full" onClick={handleAcceptInvite}>
              Aceitar convite
            </Button>
          ) : myMembership?.status === 'pending_request' ? (
            <Button className="w-full" disabled variant="outline">
              Pedido enviado
            </Button>
          ) : isAcceptedMember ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setAttachOpen(true)}
              >
                <Plus className="h-4 w-4" /> Vincular personagem
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={handleLeave}>
                Sair da campanha
              </Button>
            </div>
          ) : c.open_join ? (
            <Button className="w-full" onClick={handleJoin}>
              Entrar na campanha
            </Button>
          ) : (
            <Button className="w-full" onClick={handleJoin}>
              Pedir vaga
            </Button>
          )}
        </div>
      </motion.div>

      {/* TABS */}
      <Tabs defaultValue="party" className="space-y-4">
        <TabsList>
          <TabsTrigger value="party">Party</TabsTrigger>
          <TabsTrigger value="chronicle">Crônica</TabsTrigger>
          <TabsTrigger value="wall">Mural</TabsTrigger>
          {isMaster && <TabsTrigger value="manage">Gerenciar</TabsTrigger>}
        </TabsList>

        <TabsContent value="party">
          <PartyGrid members={data.characters} masterId={c.master_id} />
        </TabsContent>

        <TabsContent value="chronicle">
          <ChronicleTimeline sessions={data.sessions} events={data.events} />
        </TabsContent>

        <TabsContent value="wall">
          <CampaignWall
            campaignId={c.id}
            posts={data.posts}
            canPost={isMaster || isAcceptedMember}
            masterId={c.master_id}
          />
        </TabsContent>

        {isMaster && (
          <TabsContent value="manage" className="space-y-4">
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Pedidos de entrada</h3>
                <div className="space-y-2">
                  {pendingRequests.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profile?.avatar_url || undefined} />
                        <AvatarFallback>{m.profile?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.profile?.name}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          updateMembership.mutate({ id: m.id, status: 'accepted' })
                        }
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateMembership.mutate({ id: m.id, status: 'declined' })
                        }
                      >
                        Recusar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invited.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Convites pendentes</h3>
                <div className="space-y-2">
                  {invited.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profile?.avatar_url || undefined} />
                        <AvatarFallback>{m.profile?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium flex-1 truncate">
                        {m.profile?.name}
                      </p>
                      <Badge variant="outline">Aguardando</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2">Membros ativos</h3>
              <div className="space-y-2">
                {acceptedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback>{m.profile?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium flex-1 truncate">
                      {m.profile?.name}
                      {m.player_id === c.master_id && (
                        <span className="ml-2 text-[10px] text-gold">★ Mestre</span>
                      )}
                    </p>
                    {m.player_id !== c.master_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateMembership.mutate({ id: m.id, status: 'left' })
                        }
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

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
