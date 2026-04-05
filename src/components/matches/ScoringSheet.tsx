import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy } from 'lucide-react';

interface ScoringCategory {
  key: string;
  label: string;
  type: string;
}

interface ScoringSchema {
  categories: ScoringCategory[];
}

interface PlayerScore {
  player_id: string;
  player_name: string;
  scores: Record<string, number>;
  total: number;
}

interface Props {
  schema: ScoringSchema | null;
  players: { id: string; name: string }[];
  onScoresChange: (scores: PlayerScore[]) => void;
}

const ScoringSheet = ({ schema, players, onScoresChange }: Props) => {
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);

  useEffect(() => {
    setPlayerScores(
      players.map(p => ({
        player_id: p.id,
        player_name: p.name,
        scores: {},
        total: 0,
      }))
    );
  }, [players]);

  const updateScore = (playerIdx: number, categoryKey: string, value: number) => {
    const updated = [...playerScores];
    updated[playerIdx] = {
      ...updated[playerIdx],
      scores: { ...updated[playerIdx].scores, [categoryKey]: value },
    };
    // Recalculate total
    if (schema) {
      updated[playerIdx].total = schema.categories.reduce(
        (sum, cat) => sum + (updated[playerIdx].scores[cat.key] || 0), 0
      );
    } else {
      updated[playerIdx].total = value;
    }
    setPlayerScores(updated);
    onScoresChange(updated);
  };

  const updateSimpleScore = (playerIdx: number, value: number) => {
    const updated = [...playerScores];
    updated[playerIdx] = { ...updated[playerIdx], total: value };
    setPlayerScores(updated);
    onScoresChange(updated);
  };

  if (players.length === 0) {
    return <p className="text-sm text-muted-foreground">Adicione jogadores primeiro.</p>;
  }

  const maxTotal = Math.max(...playerScores.map(p => p.total), 0);
  const hasWinner = maxTotal > 0;

  // Simple scoring (no schema)
  if (!schema || schema.categories.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Pontuação Total (sem categorias configuradas)</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jogador</TableHead>
              <TableHead className="w-[120px]">Pontuação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playerScores.map((ps, i) => (
              <TableRow key={ps.player_id} className={hasWinner && ps.total === maxTotal && ps.total > 0 ? 'border-l-2 border-l-gold' : ''}>
                <TableCell className="font-medium">
                  {ps.player_name}
                  {hasWinner && ps.total === maxTotal && ps.total > 0 && (
                    <Trophy className="inline h-4 w-4 text-gold ml-2" />
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={ps.total || ''}
                    onChange={e => updateSimpleScore(i, parseInt(e.target.value) || 0)}
                    className="w-[100px]"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Dynamic scoring with categories
  return (
    <div className="space-y-3 overflow-x-auto">
      <p className="text-sm text-muted-foreground">Planilha de Pontuação</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-10">Categoria</TableHead>
            {playerScores.map(ps => (
              <TableHead key={ps.player_id} className="text-center min-w-[100px]">
                <span className="block truncate max-w-[100px]">{ps.player_name}</span>
                {hasWinner && ps.total === maxTotal && ps.total > 0 && (
                  <Trophy className="inline h-3 w-3 text-gold" />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {schema.categories.map(cat => (
            <TableRow key={cat.key}>
              <TableCell className="font-medium sticky left-0 bg-card z-10">{cat.label}</TableCell>
              {playerScores.map((ps, i) => (
                <TableCell key={ps.player_id}>
                  <Input
                    type="number"
                    value={ps.scores[cat.key] || ''}
                    onChange={e => updateScore(i, cat.key, parseInt(e.target.value) || 0)}
                    className="w-[80px] mx-auto"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {/* Total row */}
          <TableRow className="font-bold border-t-2 border-gold/30">
            <TableCell className="sticky left-0 bg-card z-10 text-gold">TOTAL</TableCell>
            {playerScores.map(ps => (
              <TableCell key={ps.player_id} className={`text-center text-lg ${hasWinner && ps.total === maxTotal && ps.total > 0 ? 'text-gold' : ''}`}>
                {ps.total}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default ScoringSheet;
