import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Calendar, Trophy, Shield, Crown, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { useCommunityDetail, useCommunityRooms, useCommunitySeasons } from "@/hooks/useCommunityDetail";
import JoinCommunityButton from "@/components/communities/JoinCommunityButton";
import { useCommunityMembership } from "@/hooks/useCommunityMembership";
import DiscussionsTab from "@/components/communities/DiscussionsTab";
import EditCommunityDialog from "@/components/communities/EditCommunityDialog";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CommunityDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { data: community, isLoading } = useCommunityDetail(slug);
  const { data: rooms = [] } = useCommunityRooms(community?.id);
  const { data: seasons = [] } = useCommunitySeasons(community?.id);
  const { state: membership } = useCommunityMembership(community?.id, community?.join_policy);

  useEffect(() => {
    if (community) document.title = `${community.name} | Comunidades`;
  }, [community]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!community) {
    return (
      <div className="container py-10 text-center">
        <p className="text-muted-foreground">Comunidade não encontrada.</p>
        <Button variant="link" onClick={() => navigate("/comunidades")}>Voltar</Button>
      </div>
    );
  }

  const isLeader = membership.status === "active" && membership.role === "leader";
  const isMember = membership.status === "active";
  const canModerate =
    isMember && (membership.role === "leader" || membership.role === "moderator");
  const featuredMembers = community.members.slice(0, 5);

  return (
    <>
      <div className="container py-4 space-y-4 pb-24 md:pb-8">
        <div className="flex items-center justify-between">
          <Link to="/comunidades">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar para comunidades
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="relative h-40 bg-gradient-to-br from-secondary to-background">
            {community.cover_url && (
              <img src={community.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            )}
          </div>
          <CardContent className="pt-0 pb-5">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
              {community.logo_url ? (
                <img
                  src={community.logo_url}
                  alt={community.name}
                  className="h-24 w-24 rounded-xl object-cover border-4 border-card"
                />
              ) : (
                <div className="h-24 w-24 rounded-xl bg-secondary border-4 border-card flex items-center justify-center text-gold font-bold text-4xl">
                  {community.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold">{community.name}</h1>
                  <FavoriteButton entityType="community" entityId={community.id} size="md" />
                </div>
                {community.tagline && (
                  <p className="text-muted-foreground mt-1">{community.tagline}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> {community.visibility === "public" ? "Pública" : "Privada"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {community.country}
                  </span>
                  <span>Desde {format(new Date(community.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                {community.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {community.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <JoinCommunityButton communityId={community.id} joinPolicy={community.join_policy} />
                {(isLeader || isAdmin) && (
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Shield className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
              </div>
            </div>
            {community.description && (
              <p className="text-sm mt-4">{community.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Membros", value: community.members_count },
            { icon: Calendar, label: "Partidas realizadas", value: community.matches_count },
            { icon: Trophy, label: "Torneios", value: community.tournaments_count },
            { icon: Shield, label: "Tipo", value: community.community_type },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <s.icon className="h-6 w-6 text-gold" />
                <div>
                  <p className="text-xl font-bold capitalize">{typeof s.value === "number" ? s.value.toLocaleString("pt-BR") : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="matches">Partidas</TabsTrigger>
            <TabsTrigger value="tournaments">Torneios</TabsTrigger>
            <TabsTrigger value="discussions">Discussões</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-[1fr_300px] gap-4">
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Próximas partidas</h3>
                      <Link to="/partidas" className="text-xs text-gold hover:underline">Ver todas</Link>
                    </div>
                    {rooms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma partida agendada.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {rooms.slice(0, 4).map((r: any) => (
                          <Link key={r.id} to="/partidas" className="block">
                            <div className="rounded-lg border border-border p-3 hover:border-gold/30 transition-colors">
                              <p className="font-medium text-sm truncate">{r.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.game?.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(r.scheduled_at), "EEE, dd 'de' MMM • HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Torneios ativos</h3>
                    </div>
                    {seasons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum torneio ativo.</p>
                    ) : (
                      <div className="space-y-2">
                        {seasons.slice(0, 4).map((s: any) => (
                          <Link key={s.id} to={`/seasons/${s.id}`} className="block rounded-lg border border-border p-3 hover:border-gold/30">
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.status}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardContent className="py-5">
                    <h3 className="font-semibold mb-2">Sobre a comunidade</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {community.description || "Sem descrição."}
                    </p>
                    {community.rules && (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Regras principais</p>
                        <p className="text-sm whitespace-pre-line">{community.rules}</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="py-5">
                    <h3 className="font-semibold mb-3">Membros em destaque</h3>
                    <ol className="space-y-2">
                      {featuredMembers.map((m, i) => (
                        <li key={m.id} className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm w-4">{i + 1}</span>
                          {m.profile?.avatar_url ? (
                            <img src={m.profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-gold text-xs font-bold">
                              {(m.profile?.nickname || m.profile?.name || "?").charAt(0)}
                            </div>
                          )}
                          <span className="flex-1 text-sm font-medium truncate">
                            {m.profile?.nickname || m.profile?.name || "—"}
                          </span>
                          {m.role === "leader" && (
                            <Crown className="h-3.5 w-3.5 text-gold" />
                          )}
                          <span className="text-xs text-muted-foreground">{m.xp} XP</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="py-5">
                {community.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {community.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 py-2">
                        {m.profile?.avatar_url ? (
                          <img src={m.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-gold text-sm font-bold">
                            {(m.profile?.nickname || m.profile?.name || "?").charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.profile?.nickname || m.profile?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.role === "leader" ? "Líder" : m.role === "moderator" ? "Moderador" : "Membro"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.xp} XP</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="py-5">
                {rooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sala vinculada à comunidade.</p>
                ) : (
                  <ul className="space-y-2">
                    {rooms.map((r: any) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.game?.name} • {format(new Date(r.scheduled_at), "dd/MM • HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="py-5">
                {seasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum torneio criado nesta comunidade.</p>
                ) : (
                  <ul className="space-y-2">
                    {seasons.map((s: any) => (
                      <li key={s.id}>
                        <Link to={`/seasons/${s.id}`} className="block rounded-lg border border-border p-3 hover:border-gold/30">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.status}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discussions" className="mt-4">
            <DiscussionsTab
              communityId={community.id}
              communitySlug={community.slug}
              isMember={isMember}
              canModerate={canModerate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default CommunityDetail;
