import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditActionButton } from "@/components/shared/EditActionButton";
import EditMatchDialog from "@/components/matches/EditMatchDialog";

const positionColors: Record<number, string> = {
  1: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  2: "bg-gray-400/15 text-gray-300 border-gray-400/30",
  3: "bg-amber-700/15 text-amber-500 border-amber-700/30",
};

interface Props {
  allHistory: any[];
  uniquePlayers: { id: string; name: string }[];
  gameId: string;
  onSaved: () => void;
}

const GameMatchHistory = ({ allHistory, uniquePlayers, gameId, onSaved }: Props) => {
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [editMatchOpen, setEditMatchOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<any>(null);

  const filteredHistory = useMemo(() => {
    let h = [...allHistory];
    const now = new Date();
    if (timeFilter === "3m") h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    else if (timeFilter === "6m") h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    else if (timeFilter === "1y") h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    if (typeFilter === "competitive") h = h.filter((m) => m.season_id);
    else if (typeFilter === "casual") h = h.filter((m) => !m.season_id);
    if (playerFilter && playerFilter !== "all") h = h.filter((m) => m.results.some((r: any) => r.player_id === playerFilter));
    return h;
  }, [allHistory, timeFilter, typeFilter, playerFilter]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const pagedHistory = filteredHistory.slice(page * pageSize, (page + 1) * pageSize);

  if (allHistory.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Histórico de Partidas</h2>
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o tempo</SelectItem>
              <SelectItem value="1y">1 ano</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="3m">3 meses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="competitive">Competitivas</SelectItem>
              <SelectItem value="casual">Não-Competitivas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={playerFilter} onValueChange={(v) => { setPlayerFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Jogador..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniquePlayers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(0); }}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5/pág</SelectItem>
              <SelectItem value="10">10/pág</SelectItem>
              <SelectItem value="20">20/pág</SelectItem>
            </SelectContent>
          </Select>
          {(timeFilter !== "all" || typeFilter !== "all" || (playerFilter !== "" && playerFilter !== "all")) && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setTimeFilter("all"); setTypeFilter("all"); setPlayerFilter("all"); setPage(0); }}>
              <span className="text-xs">✕</span> Limpar Filtros
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {pagedHistory.map((m) => (
            <div key={m.id} className="border border-border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{new Date(m.played_at).toLocaleDateString("pt-BR")}</span>
                <div className="flex items-center gap-2">
                  {m.season_id && <Badge variant="outline" className="text-xs">Competitiva</Badge>}
                  {m.duration_minutes && <span className="text-xs text-muted-foreground">{m.duration_minutes} min</span>}
                  <EditActionButton entityType="match" onClick={() => { setEditMatch(m); setEditMatchOpen(true); }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.results.map((r: any) => (
                  <Badge key={r.id} variant="outline" className={positionColors[r.position] || ""}>
                    {r.position}º {r.player_name} ({r.score || 0}pts)
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Próxima</Button>
          </div>
        )}
      </CardContent>

      <EditMatchDialog
        open={editMatchOpen}
        onOpenChange={setEditMatchOpen}
        match={editMatch ? {
          id: editMatch.id,
          played_at: editMatch.played_at,
          duration_minutes: editMatch.duration_minutes,
          season_id: editMatch.season_id,
          game_id: gameId,
          results: editMatch.results?.map((r: any) => ({
            id: r.id, player_id: r.player_id, player_name: r.player_name,
            position: r.position, score: r.score || 0, is_first: false,
          })) || [],
        } : null}
        onSaved={onSaved}
      />
    </Card>
  );
};

export default GameMatchHistory;
