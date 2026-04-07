import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoardgameRankingCard, BloodRankingCard, EmptyRanking } from "@/components/shared/RankingCards";
import type { RankingEntry, BloodRankingEntry, SeasonBase } from "@/types/database";

const Rankings = () => {
  const [seasons, setSeasons] = useState<SeasonBase[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [bloodRankings, setBloodRankings] = useState<BloodRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("boardgame");

  const filteredSeasons = seasons.filter((s) => s.type === activeTab);

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase.from("seasons").select("*").order("start_date", { ascending: false });
      if (data && data.length > 0) {
        const mapped = data.map((s) => ({ ...s, type: (s as any).type || "boardgame" })) as SeasonBase[];
        setSeasons(mapped);
        const active = mapped.find((s) => s.status === "active" && s.type === "boardgame");
        setSelectedSeason(active?.id || mapped.filter((s) => s.type === "boardgame")[0]?.id || mapped[0].id);
      }
      setLoading(false);
    };
    fetchSeasons();
  }, []);

  useEffect(() => {
    const filtered = seasons.filter((s) => s.type === activeTab);
    if (filtered.length > 0) {
      const active = filtered.find((s) => s.status === "active");
      setSelectedSeason(active?.id || filtered[0].id);
    } else {
      setSelectedSeason("");
    }
  }, [activeTab, seasons]);

  useEffect(() => {
    if (!selectedSeason) return;
    const season = seasons.find((s) => s.id === selectedSeason);
    if (!season) return;

    const fetchRankings = async () => {
      setLoading(true);
      if (season.type === "blood") {
        const { data } = await supabase
          .from("blood_mmr_ratings")
          .select("*")
          .eq("season_id", selectedSeason)
          .order("total_points", { ascending: false });
        if (data && data.length > 0) {
          const playerIds = (data as any[]).map((r) => r.player_id);
          const { data: profiles } = await supabase.from("profiles").select("id, name, nickname").in("id", playerIds);
          const pMap: Record<string, string> = {};
          for (const p of profiles || []) pMap[p.id] = (p as any).nickname || p.name;
          setBloodRankings((data as any[]).map((r) => ({ ...r, player_name: pMap[r.player_id] || "?" })));
        } else {
          setBloodRankings([]);
        }
        setRankings([]);
      } else {
        const { data } = await supabase
          .from("mmr_ratings")
          .select("player_id, current_mmr, games_played, wins, profiles(name, nickname)")
          .eq("season_id", selectedSeason)
          .order("current_mmr", { ascending: false });
        if (data) {
          setRankings(
            data.map((r: any) => ({
              ...r,
              player_name: r.profiles?.nickname || r.profiles?.name || "Unknown",
            }))
          );
        } else {
          setRankings([]);
        }
        setBloodRankings([]);
      }
      setLoading(false);
    };
    fetchRankings();
  }, [selectedSeason, seasons]);

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
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
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
          {loading ? (
            <LoadingSpinner />
          ) : rankings.length === 0 ? (
            <EmptyRanking />
          ) : (
            <div className="space-y-2">
              {rankings.map((r, i) => (
                <BoardgameRankingCard key={r.player_id} entry={r} index={i} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blood">
          {loading ? (
            <LoadingSpinner />
          ) : bloodRankings.length === 0 ? (
            <EmptyRanking />
          ) : (
            <div className="space-y-2">
              {bloodRankings.map((r, i) => (
                <BloodRankingCard key={r.player_id} entry={r} index={i} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;
