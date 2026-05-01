import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ScoringSubcategory {
  key: string;
  label: string;
  type: string;
}

interface ScoringCategory {
  key: string;
  label: string;
  type: string;
  subcategories?: ScoringSubcategory[];
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
  const prevPlayerIdsRef = useRef<string>('');

  useEffect(() => {
    const currentIds = players.map(p => p.id).sort().join(',');
    if (currentIds === prevPlayerIdsRef.current) return;
    prevPlayerIdsRef.current = currentIds;

    setPlayerScores(
      players.map(p => ({
        player_id: p.id,
        player_name: p.name,
        scores: {},
        total: 0,
      }))
    );
  }, [players]);

  const getScorableFields = (): ScoringSubcategory[] => {
    if (!schema) return [];
    const fields: ScoringSubcategory[] = [];
    for (const cat of schema.categories) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) {
          fields.push(sub);
        }
      } else if (cat.type === 'number') {
        fields.push({ key: cat.key, label: cat.label, type: cat.type });
      }
    }
    return fields;
  };

  const scorableFields = getScorableFields();

  const recalcTotal = (scores: Record<string, number>) => {
    if (scorableFields.length > 0) {
      return scorableFields.reduce((sum, f) => sum + (scores[f.key] || 0), 0);
    }
    return 0;
  };

  const updateScore = (playerIdx: number, fieldKey: string, rawValue: string) => {
    const value = rawValue === '' ? 0 : parseFloat(rawValue.replace(',', '.')) || 0;
    const updated = [...playerScores];
    const newScores = { ...updated[playerIdx].scores, [fieldKey]: value };
    updated[playerIdx] = {
      ...updated[playerIdx],
      scores: newScores,
      total: recalcTotal(newScores),
    };
    setPlayerScores(updated);
    onScoresChange(updated);
  };

  const updateSimpleScore = (playerIdx: number, rawValue: string) => {
    const value = rawValue === '' ? 0 : parseFloat(rawValue) || 0;
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

  if (!schema || scorableFields.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Pontuação Total (sem categorias configuradas)</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jogador</TableHead>
              <TableHead className="w-[120px]">
                <span className="flex items-center gap-1">
                  Pontuação
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      Em caso de empate, use decimais para o critério de desempate (ex: 10,05)
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
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
                    step="0.01"
                    value={ps.total === 0 ? '' : ps.total}
                    onChange={e => updateSimpleScore(i, e.target.value)}
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

  const hasGroupedCategories = schema.categories.some(c => c.subcategories && c.subcategories.length > 0);

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
          {hasGroupedCategories ? (
            schema.categories.map(cat => (
              <>{/* Category header row */}
                <TableRow key={`header-${cat.key}`} className="bg-secondary/30">
                  <TableCell colSpan={playerScores.length + 1} className="font-semibold text-gold text-sm sticky left-0 bg-secondary/30 z-10">
                    {cat.label}
                  </TableCell>
                </TableRow>
                {(cat.subcategories || []).map(sub => (
                  <TableRow key={sub.key}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10 pl-6">{sub.label}</TableCell>
                    {playerScores.map((ps, i) => (
                      <TableCell key={ps.player_id}>
                        <Input
                          type="number"
                          step="0.01"
                          value={ps.scores[sub.key] === undefined || ps.scores[sub.key] === 0 ? '' : ps.scores[sub.key]}
                          onChange={e => updateScore(i, sub.key, e.target.value)}
                          className="w-[80px] mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ))
          ) : (
            scorableFields.map(field => (
              <TableRow key={field.key}>
                <TableCell className="font-medium sticky left-0 bg-card z-10">{field.label}</TableCell>
                {playerScores.map((ps, i) => (
                  <TableCell key={ps.player_id}>
                    <Input
                      type="number"
                      value={ps.scores[field.key] === undefined || ps.scores[field.key] === 0 ? '' : ps.scores[field.key]}
                      onChange={e => updateScore(i, field.key, e.target.value)}
                      className="w-[80px] mx-auto"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
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
