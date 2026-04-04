import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChevronRight, Gamepad2, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface Season {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  prize: string | null;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  prize_4th_6th: number;
  prize_7th_10th: number;
  type: "boardgame" | "blood";
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-muted text-muted-foreground border-border",
};
const statusLabels: Record<string, string> = { active: "Ativa", upcoming: "Em breve", finished: "Finalizada" };

const computeStatus = (start: string, end: string): string => {
  const now = new Date();
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T23:59:59");
  if (now < s) return "upcoming";
  if (now > e) return "finished";
  return "active";
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const Seasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonGames, setSeasonGames] = useState<Record<string, string[]>>({});
  const [seasonScripts, setSeasonScripts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [seasonsRes, sgRes, sbsRes] = await Promise.all([
        supabase.from("seasons").select("*").order("start_date", { ascending: true }),
        supabase.from("season_games").select("season_id, game_id"),
        supabase.from("season_blood_scripts").select("season_id, script_id"),
      ]);

      const seasonsData: Season[] = (seasonsRes.data || []).map((s) => ({
        ...s,
        status: computeStatus(s.start_date, s.end_date),
        prize_1st: s.prize_1st || 0,
        prize_2nd: s.prize_2nd || 0,
        prize_3rd: s.prize_3rd || 0,
        prize_4th_6th: (s as any).prize_4th_6th || 0,
        prize_7th_10th: (s as any).prize_7th_10th || 0,
        type: (s as any).type || "boardgame",
      }));
      setSeasons(seasonsData);

      const sgData = sgRes.data || [];
      if (sgData.length > 0) {
        const gameIds = [...new Set(sgData.map((sg) => sg.game_id))];
        const { data: gamesData } = await supabase.from("games").select("id, name").in("id", gameIds);
        const gameMap: Record<string, string> = {};
        for (const g of gamesData || []) gameMap[g.id] = g.name;
        const map: Record<string, string[]> = {};
        for (const sg of sgData) {
          if (!map[sg.season_id]) map[sg.season_id] = [];
          const name = gameMap[sg.game_id];
          if (name) map[sg.season_id].push(name);
        }
        setSeasonGames(map);
      }

      const sbsData = (sbsRes.data || []) as any[];
      if (sbsData.length > 0) {
        const scriptIds = [...new Set(sbsData.map((s) => s.script_id))];
        const { data: scriptsData } = await supabase.from("blood_scripts").select("id, name").in("id", scriptIds);
        const scriptMap: Record<string, string> = {};
        for (const s of (scriptsData || []) as any[]) scriptMap[s.id] = s.name;
        const map: Record<string, string[]> = {};
        for (const sbs of sbsData) {
          if (!map[sbs.season_id]) map[sbs.season_id] = [];
          const name = scriptMap[sbs.script_id];
          if (name) map[sbs.season_id].push(name);
        }
        setSeasonScripts(map);
      }

      setLoading(false);
    };
    fetch();
  }, []);

  const boardgameSeasons = seasons.filter((s) => s.type === "boardgame");
  const bloodSeasons = seasons.filter((s) => s.type === "blood");

  const renderPrize = (s: Season) => {
    const isBlood = s.type === "blood";
    if (isBlood) {
      const total = s.prize_1st * 3 + s.prize_4th_6th * 3 + s.prize_7th_10th * 3;
      if (total <= 0) return null;
      return (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-gold">
            <Trophy className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-semibold">R$ {total} em premiação</span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {s.prize_1st > 0 && <span>🥇 1º-3º R$ {s.prize_1st} cada</span>}
            {s.prize_4th_6th > 0 && <span>🥈 4º-6º R$ {s.prize_4th_6th} cada</span>}
            {s.prize_7th_10th > 0 && <span>🥉 7º-10º R$ {s.prize_7th_10th} cada</span>}
          </div>
        </div>
      );
    }
    const total = s.prize_1st + s.prize_2nd + s.prize_3rd;
    if (total <= 0) return null;
    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-gold">
          <Trophy className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-semibold">R$ {total} em premiação</span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {s.prize_1st > 0 && <span>🥇 R$ {s.prize_1st}</span>}
          {s.prize_2nd > 0 && <span>🥈 R$ {s.prize_2nd}</span>}
          {s.prize_3rd > 0 && <span>🥉 R$ {s.prize_3rd}</span>}
        </div>
      </div>
    );
  };

  const renderSeasonCard = (s: Season, i: number) => {
    const games = seasonGames[s.id] || [];
    const scripts = seasonScripts[s.id] || [];
    return (
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
      >
        <Link to={`/seasons/${s.id}`}>
          <Card className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer group h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{s.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-3">
              <div>
                {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
                {s.type === "boardgame" && games.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    <Gamepad2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{games.join(", ")}</span>
                  </div>
                )}
                {s.type === "blood" && scripts.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    <span className="flex-shrink-0">🩸</span>
                    <span className="truncate">{scripts.join(", ")}</span>
                  </div>
                )}
                {renderPrize(s)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(s.start_date)} — {formatDate(s.end_date)}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  const renderSeasonList = (list: Season[]) =>
    list.length === 0 ? (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center text-muted-foreground">Nenhuma season criada ainda.</CardContent>
      </Card>
    ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{list.map((s, i) => renderSeasonCard(s, i))}</div>
    );

  return (
    <div className="container py-10">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Seasons</h1>
      </div>
      <p className="text-muted-foreground mb-8">Temporadas de competição da comunidade</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <Tabs defaultValue="boardgame" className="space-y-6">
          <TabsList>
            <TabsTrigger value="boardgame">🎲 Boardgames</TabsTrigger>
            <TabsTrigger value="blood">🩸 Blood on the Clocktower</TabsTrigger>
          </TabsList>
          <TabsContent value="boardgame">{renderSeasonList(boardgameSeasons)}</TabsContent>
          <TabsContent value="blood">{renderSeasonList(bloodSeasons)}</TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Seasons;
