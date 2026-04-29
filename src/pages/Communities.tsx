import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Calendar, Shield, Search, UsersRound } from "lucide-react";
import { useCommunities, useGlobalCommunityStats } from "@/hooks/useCommunities";
import CommunityCard from "@/components/communities/CommunityCard";
import CreateCommunityDialog from "@/components/communities/CreateCommunityDialog";

const formatNum = (n: number) => n.toLocaleString("pt-BR");

const Communities = () => {
  const { data: communities = [], isLoading } = useCommunities();
  const { data: stats } = useGlobalCommunityStats();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "members" | "matches">("members");

  const filtered = useMemo(() => {
    let list = [...communities];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.tagline ?? "").toLowerCase().includes(s) ||
          (c.description ?? "").toLowerCase().includes(s),
      );
    }
    if (typeFilter !== "all") list = list.filter((c) => c.community_type === typeFilter);
    list.sort((a, b) => {
      if (sort === "members") return b.members_count - a.members_count;
      if (sort === "matches") return b.matches_count - a.matches_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [communities, search, typeFilter, sort]);

  const featured = useMemo(
    () => [...communities].sort((a, b) => b.members_count - a.members_count).slice(0, 3),
    [communities],
  );
  const popular = useMemo(
    () => [...communities].sort((a, b) => b.members_count - a.members_count).slice(0, 5),
    [communities],
  );

  useEffect(() => {
    document.title = "Comunidades | Amizade AzD";
  }, []);

  return (
    <>
      <div className="container py-6 space-y-6 pb-24 md:pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <UsersRound className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Comunidades</h1>
            <p className="text-sm text-muted-foreground">Encontre e participe de comunidades AzD</p>
          </div>
        </motion.div>

        {/* How it works */}
        <Card className="bg-card border-border">
          <CardContent className="py-5">
            <h2 className="font-semibold mb-4">Como as comunidades funcionam?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { n: 1, t: "Encontre", d: "Explore comunidades que combinam com seu estilo de jogo." },
                { n: 2, t: "Participe", d: "Envie uma solicitação e aguarde a aprovação." },
                { n: 3, t: "Jogue junto", d: "Participe de partidas, torneios e eventos exclusivos." },
                { n: 4, t: "Evolua", d: "Suba no ranking e fortaleça sua comunidade." },
              ].map((s) => (
                <div key={s.n} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center text-gold font-bold text-sm">
                    {s.n}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.t}</p>
                    <p className="text-xs text-muted-foreground">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: UsersRound, label: "Comunidades", value: stats?.communities ?? 0 },
            { icon: Users, label: "Membros", value: stats?.members ?? 0 },
            { icon: Calendar, label: "Partidas realizadas", value: stats?.matches ?? 0 },
            { icon: Trophy, label: "Torneios ativos", value: stats?.tournaments ?? 0 },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <s.icon className="h-6 w-6 text-gold" />
                <div>
                  <p className="text-xl font-bold">{formatNum(s.value)}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured + popular */}
        {communities.length > 0 && (
          <div className="grid lg:grid-cols-[1fr_280px] gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">Comunidades em destaque</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((c, i) => (
                  <CommunityCard key={c.id} community={c} index={i} />
                ))}
              </div>
            </div>
            <Card className="bg-card border-border h-fit">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Comunidades populares</h3>
                </div>
                <ol className="space-y-2">
                  {popular.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-4">{i + 1}</span>
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-gold text-xs font-bold">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <a href={`/comunidades/${c.slug}`} className="flex-1 min-w-0 hover:text-gold">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.members_count} membros</p>
                      </a>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All communities + filters */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-4">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Todas as comunidades</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ordenar por:</span>
                <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="members">Mais membros</SelectItem>
                    <SelectItem value="matches">Mais partidas</SelectItem>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nenhuma comunidade encontrada.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((c, i) => (
                  <CommunityCard key={c.id} community={c} index={i} variant="row" />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Card className="bg-card border-border">
              <CardContent className="py-4 space-y-3">
                <h3 className="font-semibold">Filtrar comunidades</h3>
                <div>
                  <Label className="text-xs">Buscar por nome</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Digite o nome…"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tipo de comunidade</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="mixed">Misto</SelectItem>
                      <SelectItem value="boardgame">Boardgames</SelectItem>
                      <SelectItem value="botc">Blood on the Clocktower</SelectItem>
                      <SelectItem value="rpg">RPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gold/10 to-transparent border-gold/30">
              <CardContent className="py-5 text-center">
                <Shield className="h-8 w-8 mx-auto text-gold mb-2" />
                <p className="font-semibold">Não encontrou um Grupo?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Crie sua própria comunidade e convide seus amigos para jogar juntos!
                </p>
                <CreateCommunityDialog />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Communities;
