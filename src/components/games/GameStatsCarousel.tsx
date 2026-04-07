import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Target, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GameStats {
  totalMatches: number;
  avgScore: number;
  highScore: number;
  highScorePlayer: string;
  worstWinScore: number;
}

interface PersonalStats {
  games: number;
  wins: number;
  winPct: number;
  avgScore: number;
  currentStreak: number;
  bestStreak: number;
}

interface DetailedStats {
  totalMatches: number;
  factions: { name: string; games: number; winPct: number }[];
  seats: { seat: number; games: number; winPct: number }[];
}

interface Props {
  stats: GameStats;
  personalStats: PersonalStats | null;
  detailedStats: DetailedStats | null;
  isLoggedIn: boolean;
  slide: number;
  setSlide: (s: number) => void;
  playerCounts: number[];
  detailPlayerCount: string;
  setDetailPlayerCount: (v: string) => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const GameStatsCarousel = ({
  stats, personalStats, detailedStats, isLoggedIn,
  slide, setSlide, playerCounts, detailPlayerCount, setDetailPlayerCount,
}: Props) => (
  <div className="relative">
    <div className="flex items-center justify-between mb-3">
      <Button variant="outline" size="icon" className="border-gold/30 hover:bg-gold/10 hover:border-gold/60 disabled:opacity-30" onClick={() => setSlide(Math.max(0, slide - 1))} disabled={slide === 0}>
        <ChevronLeft className="h-6 w-6 text-gold" />
      </Button>
      <h2 className="text-lg font-semibold text-center">
        {slide === 0 ? "Estatísticas Pessoais" : slide === 1 ? "Estatísticas Gerais" : "Estatísticas Detalhadas"}
      </h2>
      <Button variant="outline" size="icon" className="border-gold/30 hover:bg-gold/10 hover:border-gold/60 disabled:opacity-30" onClick={() => setSlide(Math.min(2, slide + 1))} disabled={slide === 2}>
        <ChevronRight className="h-6 w-6 text-gold" />
      </Button>
    </div>
    <div className="flex gap-1 justify-center mb-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-1.5 w-6 rounded-full transition-colors cursor-pointer ${i === slide ? "bg-gold" : "bg-secondary"}`} onClick={() => setSlide(i)} />
      ))}
    </div>

    <AnimatePresence mode="wait" custom={slide}>
      {slide === 1 && (
        <motion.div key="general" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><Trophy className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold text-gold">{stats.highScore}</p><p className="text-xs text-muted-foreground">Maior Pontuação</p><p className="text-xs font-medium mt-1">{stats.highScorePlayer}</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><TrendingUp className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold">{stats.avgScore}</p><p className="text-xs text-muted-foreground">Pontuação Média</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><Target className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold">{stats.worstWinScore}</p><p className="text-xs text-muted-foreground">Pior Pontuação Ganhadora</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><Hash className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold">{stats.totalMatches}</p><p className="text-xs text-muted-foreground">Total de Partidas</p></CardContent></Card>
        </motion.div>
      )}

      {slide === 0 && (
        <motion.div key="personal" custom={-1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
          {personalStats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Partidas", value: personalStats.games },
                { label: "Vitória", value: `${personalStats.winPct}%` },
                { label: "Pontuação Média", value: personalStats.avgScore },
                { label: "Maior Sequência", value: personalStats.bestStreak },
              ].map((s, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                {isLoggedIn ? "Você ainda não jogou este jogo." : "Faça login para ver suas estatísticas."}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {slide === 2 && (
        <motion.div key="detailed" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="space-y-4">
          <div className="flex gap-2 items-center flex-wrap">
            <Label className="text-sm">Nº de jogadores:</Label>
            <Select value={detailPlayerCount} onValueChange={setDetailPlayerCount}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {playerCounts.map((c) => <SelectItem key={c} value={String(c)}>{c}j</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {detailedStats ? (
            <div className="grid gap-4 md:grid-cols-2">
              {detailedStats.factions.length > 0 && (
                <Card className="bg-card border-border"><CardContent className="pt-6"><h3 className="text-sm font-semibold mb-3">% Vitória por Facção</h3><div className="space-y-2">{detailedStats.factions.map((f) => (<div key={f.name} className="flex items-center justify-between text-sm"><span>{f.name}</span><span className="text-muted-foreground">{f.games} partidas • <span className="text-gold font-medium">{f.winPct}%</span></span></div>))}</div></CardContent></Card>
              )}
              {detailedStats.seats.length > 0 && (
                <Card className="bg-card border-border"><CardContent className="pt-6"><h3 className="text-sm font-semibold mb-3">% Vitória por Posição na Mesa</h3><div className="space-y-2">{detailedStats.seats.map((s) => (<div key={s.seat} className="flex items-center justify-between text-sm"><span>Posição {s.seat}</span><span className="text-muted-foreground">{s.games} partidas • <span className="text-gold font-medium">{s.winPct}%</span></span></div>))}</div></CardContent></Card>
              )}
              {detailedStats.factions.length === 0 && detailedStats.seats.length === 0 && (
                <Card className="bg-card border-border md:col-span-2"><CardContent className="py-8 text-center text-muted-foreground">Sem dados de facções ou posições para este filtro.</CardContent></Card>
              )}
            </div>
          ) : (
            <Card className="bg-card border-border"><CardContent className="py-8 text-center text-muted-foreground">Sem dados detalhados.</CardContent></Card>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default GameStatsCarousel;
