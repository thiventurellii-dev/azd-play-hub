import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sword, Plus, Pencil } from 'lucide-react';
import { usePlayerCharacters } from '@/hooks/useRpgCharacters';
import { CharacterCard } from './CharacterCard';
import { EntitySheet } from '@/components/shared/EntitySheet';
import { CharacterForm } from './CharacterForm';
import type { RpgCharacter } from '@/types/rpg';

interface Props {
  playerId: string;
  isOwnProfile: boolean;
}

export const HallOfHeroes = ({ playerId, isOwnProfile }: Props) => {
  const { data: characters = [], isLoading } = usePlayerCharacters(playerId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RpgCharacter | null>(null);

  const sorted = useMemo(() => {
    return [...characters].sort((a, b) => {
      // Públicos ativos primeiro, depois por data
      if (a.is_public !== b.is_public) return a.is_public ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [characters]);

  if (!isOwnProfile && characters.length === 0) return null;

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (c: RpgCharacter) => {
    setEditing(c);
    setSheetOpen(true);
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sword className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold">Hall dos Heróis</h2>
              {characters.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {characters.length} personage{characters.length === 1 ? 'm' : 'ns'}
                </span>
              )}
            </div>
            {isOwnProfile && (
              <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo personagem
              </Button>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
          ) : sorted.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Sword className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum personagem cadastrado ainda.
              </p>
              {isOwnProfile && (
                <Button size="sm" variant="gold" onClick={openCreate}>
                  Criar primeiro personagem
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sorted.map((c) => (
                <div key={c.id} className="relative group/card">
                  <CharacterCard character={c} />
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openEdit(c);
                      }}
                      title="Editar"
                      className="absolute top-2 left-2 h-7 w-7 rounded-full bg-card/80 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:border-gold"
                    >
                      <Pencil className="h-3 w-3 text-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwnProfile && (
        <EntitySheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={editing ? 'Editar Personagem' : 'Novo Personagem'}
          description="Personagens públicos aparecem no Hall de Heróis."
        >
          <CharacterForm
            character={editing}
            onSuccess={() => setSheetOpen(false)}
          />
        </EntitySheet>
      )}
    </>
  );
};

export default HallOfHeroes;
