import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNotification } from "@/components/NotificationDialog";
import { ChevronLeft, ChevronRight, Check, Trash2, UserPlus, Skull, Shield, ChevronsUpDown, UserCircle2 } from "lucide-react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { submitBloodMatch } from "@/lib/bloodRatings";
import { cn } from "@/lib/utils";
import AddGuestDialog from "@/components/players/AddGuestDialog";
import { fetchUnclaimedGuests, type GuestPlayer } from "@/lib/guestPlayers";

interface Season {
  id: string;
  name: string;
}
interface BloodScript {
  id: string;
  name: string;
  victory_conditions: string[];
}
interface BloodCharacter {
  id: string;
  script_id: string;
  name: string;
  name_en: string;
  role_type: string;
  team: string;
}
interface Player {
  id: string;
  name: string;
  nickname?: string;
}
interface BloodPlayerEntry {
  player_id: string;
  is_guest: boolean;
  character_id: string;
  team: "good" | "evil";
}

interface Props {
  onComplete?: (matchId?: string) => void;
}

const NewMatchBotcFlow = ({ onComplete }: Props) => {
  const { notify } = useNotification();
  const [step, setStep] = useState(1);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [scripts, setScripts] = useState<BloodScript[]>([]);
  const [characters, setCharacters] = useState<BloodCharacter[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guests, setGuests] = useState<GuestPlayer[]>([]);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  // After creating a guest from a specific picker, route the selection back
  const [pendingGuestTarget, setPendingGuestTarget] = useState<
    | { kind: "storyteller" }
    | { kind: "team"; team: "good" | "evil"; idx: number }
    | null
  >(null);

  const [seasonId, setSeasonId] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [playedDate, setPlayedDate] = useState("");
  const [playedTime, setPlayedTime] = useState("");
  const [duration, setDuration] = useState("");
  const [platform, setPlatform] = useState("");

  const [storytellerId, setStorytellerId] = useState("");
  const [storytellerIsGuest, setStorytellerIsGuest] = useState(false);
  const [evilPlayers, setEvilPlayers] = useState<BloodPlayerEntry[]>([
    { player_id: "", is_guest: false, character_id: "", team: "evil" },
  ]);
  const [goodPlayers, setGoodPlayers] = useState<BloodPlayerEntry[]>([
    { player_id: "", is_guest: false, character_id: "", team: "good" },
  ]);

  const [winningTeam, setWinningTeam] = useState<"good" | "evil">("good");
  const [selectedVictoryConditions, setSelectedVictoryConditions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [playerPopovers, setPlayerPopovers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchBase = async () => {
      const [s, sc, ch, p] = await Promise.all([
        supabase
          .from("seasons")
          .select("id, name")
          .eq("type", "blood" as any)
          .neq("status", "finished")
          .neq("status", "upcoming")
          .order("start_date", { ascending: false }),
        supabase.from("blood_scripts").select("id, name, victory_conditions").order("name"),
        supabase.from("blood_characters").select("id, script_id, name, name_en, role_type, team"),
        supabase.from("profiles").select("id, name, nickname").order("name"),
      ]);
      setSeasons((s.data || []) as Season[]);
      setScripts(
        (sc.data || []).map((x: any) => ({
          ...x,
          victory_conditions: Array.isArray(x.victory_conditions) ? x.victory_conditions : [],
        })) as BloodScript[],
      );
      setCharacters((ch.data || []) as BloodCharacter[]);
      setPlayers((p.data || []) as Player[]);
      fetchUnclaimedGuests().then(setGuests);
    };
    fetchBase();
  }, []);

  const selectedScript = scripts.find((s) => s.id === scriptId);
  const scriptVictoryConditions = selectedScript?.victory_conditions || [];

  const scriptCharacters = characters.filter((c) => c.script_id === scriptId);
  const evilChars = scriptCharacters.filter((c) => c.team === "evil");
  const goodChars = scriptCharacters.filter((c) => c.team === "good");

  // Build set of currently used ids (works for both profiles and guests since UUIDs don't collide)
  const allSelectedPlayerIds = [
    storytellerId,
    ...evilPlayers.map((p) => p.player_id),
    ...goodPlayers.map((p) => p.player_id),
  ].filter(Boolean);

  const resolveName = (id: string, isGuest: boolean) => {
    if (!id) return "";
    if (isGuest) {
      const g = guests.find((gg) => gg.id === id);
      return g?.nickname || g?.name || "Convidado";
    }
    const p = players.find((pp) => pp.id === id);
    return p?.nickname || p?.name || "?";
  };

  const addPlayer = (team: "good" | "evil") => {
    if (team === "evil") setEvilPlayers([...evilPlayers, { player_id: "", is_guest: false, character_id: "", team: "evil" }]);
    else setGoodPlayers([...goodPlayers, { player_id: "", is_guest: false, character_id: "", team: "good" }]);
  };
  const removePlayer = (team: "good" | "evil", idx: number) => {
    if (team === "evil") setEvilPlayers(evilPlayers.filter((_, i) => i !== idx));
    else setGoodPlayers(goodPlayers.filter((_, i) => i !== idx));
  };
  const updatePlayer = (team: "good" | "evil", idx: number, patch: Partial<BloodPlayerEntry>) => {
    if (team === "evil") {
      const updated = [...evilPlayers];
      updated[idx] = { ...updated[idx], ...patch };
      setEvilPlayers(updated);
    } else {
      const updated = [...goodPlayers];
      updated[idx] = { ...updated[idx], ...patch };
      setGoodPlayers(updated);
    }
  };

  const handleSubmit = async () => {
    if (!seasonId || !scriptId || !playedDate || !playedTime || !storytellerId) {
      return notify("error", "Preencha todos os campos obrigatórios");
    }
    const allP = [...evilPlayers, ...goodPlayers];
    if (allP.some((p) => !p.player_id || !p.character_id)) {
      return notify("error", "Preencha jogador e personagem para todos os participantes");
    }
    setSaving(true);
    try {
      const createdMatch = await submitBloodMatch({
        seasonId,
        scriptId,
        playedAt: new Date(`${playedDate}T${playedTime}`).toISOString(),
        durationMinutes: parseInt(duration) || null,
        storytellerId,
        storytellerIsGuest,
        winningTeam,
        players: allP.map((p) => ({
          player_id: p.player_id,
          is_guest: p.is_guest,
          character_id: p.character_id,
          team: p.team,
        })),
        victoryConditions: selectedVictoryConditions,
        platform: platform || null,
      });
      notify("success", "Partida de Blood registrada!");
      onComplete?.((createdMatch as any)?.id);
      setStep(1);
      setEvilPlayers([{ player_id: "", is_guest: false, character_id: "", team: "evil" }]);
      setGoodPlayers([{ player_id: "", is_guest: false, character_id: "", team: "good" }]);
      setDuration("");
      setPlayedDate("");
      setPlayedTime("");
      setStorytellerId("");
      setStorytellerIsGuest(false);
      setScriptId("");
      setSelectedVictoryConditions([]);
    } catch (err: any) {
      notify("error", err.message || "Erro ao registrar partida");
    } finally {
      setSaving(false);
    }
  };

  const PlayerCombobox = ({
    value,
    isGuest,
    onSelect,
    excludeIds,
    popoverKey,
    onAddGuestClick,
  }: {
    value: string;
    isGuest: boolean;
    onSelect: (id: string, isGuest: boolean) => void;
    excludeIds: string[];
    popoverKey: string;
    onAddGuestClick: () => void;
  }) => {
    const isOpen = playerPopovers[popoverKey] || false;
    const setOpen = (open: boolean) => setPlayerPopovers((prev) => ({ ...prev, [popoverKey]: open }));
    const label = value ? resolveName(value, isGuest) : "Buscar jogador...";
    const availableGuests = guests.filter((g) => !excludeIds.includes(g.id) || g.id === value);
    return (
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="justify-between w-full font-normal text-left">
            <span className="flex items-center gap-2 truncate">
              {value && isGuest && <UserCircle2 className="h-4 w-4 text-amber-400 shrink-0" />}
              <span className="truncate">{label}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar jogador ou convidado..." />
            <CommandList
              className="max-h-[260px] overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
            >
              <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
              <CommandGroup heading="Jogadores">
                {players.map((p) => (
                  <CommandItem
                    key={`p-${p.id}`}
                    value={`${p.nickname || ""} ${p.name}`}
                    disabled={excludeIds.includes(p.id) && !(value === p.id && !isGuest)}
                    onSelect={() => {
                      onSelect(p.id, false);
                      setOpen(false);
                    }}
                    className="data-[selected=true]:bg-secondary/70"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !isGuest && value === p.id ? "opacity-100 text-gold" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{p.nickname || p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {availableGuests.length > 0 && (
                <CommandGroup heading="Convidados">
                  {availableGuests.map((g) => (
                    <CommandItem
                      key={`g-${g.id}`}
                      value={`${g.nickname} ${g.name || ""} convidado guest`}
                      onSelect={() => {
                        onSelect(g.id, true);
                        setOpen(false);
                      }}
                      className="data-[selected=true]:bg-secondary/70"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isGuest && value === g.id ? "opacity-100 text-gold" : "opacity-0",
                        )}
                      />
                      <UserCircle2 className="mr-2 h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">{g.nickname}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] border-amber-500/40 text-amber-300 bg-amber-500/10"
                      >
                        convidado
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                onClick={() => {
                  setOpen(false);
                  onAddGuestClick();
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" /> + Convidado
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderPlayerSelectors = (team: "evil" | "good", playersList: BloodPlayerEntry[], chars: BloodCharacter[]) => {
    const isEvil = team === "evil";
    return (
      <div
        className={`space-y-3 p-4 rounded-lg border ${isEvil ? "border-red-500/30 bg-red-500/5" : "border-blue-500/30 bg-blue-500/5"}`}
      >
        <div className="flex items-center gap-2">
          {isEvil ? <Skull className="h-5 w-5 text-red-400" /> : <Shield className="h-5 w-5 text-blue-400" />}
          <Label className={`${isEvil ? "text-red-400" : "text-blue-400"} font-semibold`}>
            {isEvil ? "Time Maligno" : "Time Benigno"}
          </Label>
        </div>
        {playersList.map((ep, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
            <PlayerCombobox
              value={ep.player_id}
              isGuest={ep.is_guest}
              onSelect={(id, isGuest) => updatePlayer(team, i, { player_id: id, is_guest: isGuest })}
              excludeIds={allSelectedPlayerIds}
              popoverKey={`${team}-${i}`}
              onAddGuestClick={() => {
                setPendingGuestTarget({ kind: "team", team, idx: i });
                setAddGuestOpen(true);
              }}
            />
            <Select value={ep.character_id} onValueChange={(v) => updatePlayer(team, i, { character_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Personagem" />
              </SelectTrigger>
              <SelectContent>
                {chars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.role_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ep.player_id && (
              <Button variant="ghost" size="icon" onClick={() => removePlayer(team, i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addPlayer(team)}>
          <UserPlus className="h-4 w-4 mr-1" /> Adicionar {isEvil ? "Maligno" : "Benigno"}
        </Button>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🩸 Nova Partida — Blood on the Clocktower</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 w-8 rounded-full ${s <= step ? "bg-gold" : "bg-secondary"}`} />
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. Cabeçalho</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Season *</Label>
                <Select value={seasonId} onValueChange={setSeasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Script *</Label>
                <Select
                  value={scriptId}
                  onValueChange={(v) => {
                    setScriptId(v);
                    setEvilPlayers([{ player_id: "", is_guest: false, character_id: "", team: "evil" }]);
                    setGoodPlayers([{ player_id: "", is_guest: false, character_id: "", team: "good" }]);
                    setSelectedVictoryConditions([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o script" />
                  </SelectTrigger>
                  <SelectContent>
                    {scripts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <DatePickerField value={playedDate} onChange={setPlayedDate} placeholder="Selecione a data" />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input type="time" value={playedTime} onChange={(e) => setPlayedTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="90" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local / Plataforma</Label>
              <Select value={platform || "none"} onValueChange={(v) => setPlatform(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Onde foi jogado?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não especificado</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Tabletop Simulator">Tabletop Simulator</SelectItem>
                  <SelectItem value="BoardGame Arena">BoardGame Arena</SelectItem>
                  <SelectItem value="Foundry">Foundry</SelectItem>
                  <SelectItem value="Outro Online">Outro Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="gold"
                onClick={() => setStep(2)}
                disabled={!seasonId || !scriptId || !playedDate || !playedTime}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">2. Jogadores</h3>
            <div className="space-y-2">
              <Label>Storyteller *</Label>
              <PlayerCombobox
                value={storytellerId}
                isGuest={storytellerIsGuest}
                onSelect={(id, isGuest) => {
                  setStorytellerId(id);
                  setStorytellerIsGuest(isGuest);
                }}
                excludeIds={allSelectedPlayerIds}
                popoverKey="storyteller"
                onAddGuestClick={() => {
                  setPendingGuestTarget({ kind: "storyteller" });
                  setAddGuestOpen(true);
                }}
              />
            </div>
            {renderPlayerSelectors("evil", evilPlayers, evilChars)}
            {renderPlayerSelectors("good", goodPlayers, goodChars)}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                variant="gold"
                onClick={() => setStep(3)}
                disabled={
                  !storytellerId || [...evilPlayers, ...goodPlayers].some((p) => !p.player_id || !p.character_id)
                }
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">3. Resultado</h3>
            <div className="space-y-2">
              <Label>Time Vencedor *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWinningTeam("good")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${winningTeam === "good" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/30"}`}
                >
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <p className="font-semibold text-blue-400">Vitória do Bem</p>
                  <p className="text-xs text-muted-foreground">Execução do Demônio</p>
                </button>
                <button
                  type="button"
                  onClick={() => setWinningTeam("evil")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${winningTeam === "evil" ? "border-red-500 bg-red-500/10" : "border-border hover:border-red-500/30"}`}
                >
                  <Skull className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="font-semibold text-red-400">Vitória do Mal</p>
                  <p className="text-xs text-muted-foreground">Vitória do Demônio</p>
                </button>
              </div>
            </div>

            {/* Victory Conditions */}
            {scriptVictoryConditions.length > 0 && (
              <div className="space-y-2 p-4 rounded-lg border border-gold/20 bg-gold/5">
                <Label className="text-gold">Condições de Vitória Especiais</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Marque se alguma condição especial ocorreu nesta partida
                </p>
                <div className="space-y-2">
                  {scriptVictoryConditions.map((vc, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedVictoryConditions.includes(vc)}
                        onCheckedChange={(checked) => {
                          setSelectedVictoryConditions((prev) =>
                            checked ? [...prev, vc] : prev.filter((v) => v !== vc),
                          );
                        }}
                      />
                      <span className="text-sm">{vc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-border rounded-lg p-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Season:</span> {seasons.find((s) => s.id === seasonId)?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Script:</span> {scripts.find((s) => s.id === scriptId)?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Data:</span> {playedDate} {playedTime}
              </p>
              {duration && (
                <p>
                  <span className="text-muted-foreground">Duração:</span> {duration} min
                </p>
              )}
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Narrador:</span>
                {storytellerIsGuest && <UserCircle2 className="h-4 w-4 text-amber-400" />}
                <span>{resolveName(storytellerId, storytellerIsGuest)}</span>
                {storytellerIsGuest && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300 bg-amber-500/10">
                    convidado
                  </Badge>
                )}
              </p>
              <div className="space-y-1 mt-2">
                {[...evilPlayers, ...goodPlayers].map((ep, i) => {
                  const ch = characters.find((c) => c.id === ep.character_id);
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-1.5 rounded ${ep.team === "evil" ? "bg-red-500/10" : "bg-blue-500/10"}`}
                    >
                      <span>{ep.team === "evil" ? "💀" : "🛡️"}</span>
                      {ep.is_guest && <UserCircle2 className="h-3.5 w-3.5 text-amber-400" />}
                      <span className="font-medium">{resolveName(ep.player_id, ep.is_guest)}</span>
                      <span className="text-muted-foreground">— {ch?.name}</span>
                      {ep.is_guest && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] border-amber-500/40 text-amber-300 bg-amber-500/10"
                        >
                          convidado
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  className={
                    winningTeam === "evil"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  }
                >
                  {winningTeam === "evil" ? "💀 Mal venceu" : "🛡️ Bem venceu"}
                </Badge>
                {selectedVictoryConditions.map((vc, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-gold/30 text-gold">
                    {vc}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button variant="gold" onClick={handleSubmit} disabled={saving}>
                <Check className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Registrar Partida"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <AddGuestDialog
        open={addGuestOpen}
        onOpenChange={(o) => {
          setAddGuestOpen(o);
          if (!o) setPendingGuestTarget(null);
        }}
        onCreated={(g) => {
          setGuests((prev) => [g, ...prev]);
          const target = pendingGuestTarget;
          if (target?.kind === "storyteller") {
            setStorytellerId(g.id);
            setStorytellerIsGuest(true);
          } else if (target?.kind === "team") {
            updatePlayer(target.team, target.idx, { player_id: g.id, is_guest: true });
          }
          setPendingGuestTarget(null);
        }}
      />
    </Card>
  );
};

export default NewMatchBotcFlow;
