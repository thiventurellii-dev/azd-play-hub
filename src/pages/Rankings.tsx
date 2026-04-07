import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoardgameRankingCard, BloodRankingCard, EmptyRanking } from "@/components/shared/RankingCards";
import { useSeasonsList, useBoardgameRankings, useBloodRankings } from "@/hooks/useRankingsData";

const Rankings = () => {
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasonsList();
  const [selectedSeason, setSelectedSeason] = useState("");
  const [activeTab, setActiveTab] = useState("boardgame");

  const filteredSeasons = seasons.filter((s) => s.type === activeTab);

  // Auto-select season when tab or seasons change
  useEffect(() => {
    const filtered = seasons.filter((s) => s.type === activeTab);
    if (filtered.length > 0) {
      const active = filtered.find((s) => s.status === "active");
      setSelectedSeason(active?.id || filtered[0].id);
    } else {
      setSelectedSeason("");
    }
  }, [activeTab, seasons]);

  const selectedSeasonObj = seasons.find((s) => s.id === selectedSeason);
  const isBoardgame = selectedSeasonObj?.type === "boardgame";

  const { data: rankings = [], isLoading: rankingsLoading } = useBoardgameRankings(
    isBoardgame ? selectedSeason : undefined
  );
  const { data: bloodRankings = [], isLoading: bloodLoading } = useBloodRankings(
    !isBoardgame ? selectedSeason : undefined
  );

  const loading = seasonsLoading || rankingsLoading || bloodLoading;

  const LoadingSpinner = () => (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );

  return (
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">Classificação por season</p>
        </div>
        {filteredSeasons.length > 0 && (
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {filteredSeasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
          <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
        </TabsList>

        <TabsContent value="boardgame">
          {loading ? <LoadingSpinner /> : rankings.length === 0 ? <EmptyRanking /> : (
            <div className="space-y-2">
              {rankings.map((r, i) => <BoardgameRankingCard key={r.player_id} entry={r} index={i} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blood">
          {loading ? <LoadingSpinner /> : bloodRankings.length === 0 ? <EmptyRanking /> : (
            <div className="space-y-2">
              {bloodRankings.map((r, i) => <BloodRankingCard key={r.player_id} entry={r} index={i} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;
