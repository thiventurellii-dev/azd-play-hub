import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/NotificationDialog';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Check, ChevronDown, ChevronRight, Crown, Search, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';

interface Season { id: string; name: string; status: string; }
interface Game {
  id: string; name: string; slug: string | null;
  min_players: number | null; max_players: number | null;
  image_url: string | null;
}
interface Profile { id: string; name: string; nickname: string | null; avatar_url: string | null; }
interface Entry {
  player_id: string;
  seat_position: number;
  faction: string;
  total_score: number | null;
  scores: Record<string, number>;
  scoring_open: boolean;
}

interface SchemaField { key: string; label: string; }
interface ScoringSchema { categories: { key: string; label: string; type?: string; subcategories?: SchemaField[] }[] }

interface Props {
  onComplete?: (matchId?: string) => void;
  prefilledGameId?: string;
  prefilledPlayers?: string[];
  prefilledDate?: string;
  prefilledCommunityId?: string;
  hideHeader?: boolean;
}

const PLATFORMS = ['Presencial', 'Tabletop Simulator', 'BoardGame Arena', 'Discord', 'Outro Online'];

const NewBoardgameFlow = ({ onComplete, prefilledGameId, prefilledPlayers, prefilledDate, prefilledCommunityId, hideHeader }: Props) => {
  const { notify } = useNotification();

  // Data
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [gamePlayCounts, setGamePlayCounts] = useState<Record<string, number>>({});
  const [avgDurations, setAvgDurations] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Section 1 — Game
  const [gameId, setGameId] = useState(prefilledGameId || '');
  const [gameSearch, setGameSearch] = useState('');
  const [scoringSchema, setScoringSchema] = useState<ScoringSchema | null>(null);
  const [gameFactions, setGameFactions] = useState<string[]>([]);

  // Section 2 — When
  const [playedDate, setPlayedDate] = useState(prefilledDate || '');
  const [playedTime, setPlayedTime] = useState('20:00');
  const [duration, setDuration] = useState('');
  const [platform, setPlatform] = useState('Presencial');
  const [seasonId, setSeasonId] = useState('');
  const [linkToSeason, setLinkToSeason] = useState(true);

  // Section 3 — Players
  const initialEntries: Entry[] = (prefilledPlayers && prefilledPlayers.length > 0)
    ? prefilledPlayers.map((pid, i) => ({ player_id: pid, seat_position: i + 1, faction: '', total_score: null, scores: {}, scoring_open: false }))
    : [emptyEntry(1)];
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [showHelperHint, setShowHelperHint] = useState(true);
  const [openPicker, setOpenPicker] = useState<number | null>(null);

  // Friends quick-add
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<Set<string>>(new Set());

  // Community quick-add (only when prefilledCommunityId is set, e.g. from a community room)
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [communityMemberIds, setCommunityMemberIds] = useState<string[]>([]);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [selectedCommunityToAdd, setSelectedCommunityToAdd] = useState<Set<string>>(new Set());

  // Section 4 — Optional
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  function emptyEntry(seat: number): Entry {
    return { player_id: '', seat_position: seat, faction: '', total_score: null, scores: {}, scoring_open: false };
  }

  // Initial fetch
  useEffect(() => {
    const fetchBase = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const [s, g, p] = await Promise.all([
        supabase.from('seasons').select('id, name, status').eq('type', 'boardgame' as any).order('start_date', { ascending: false }),
        supabase.from('games').select('id, name, slug, min_players, max_players, image_url').order('name'),
        supabase.from('profiles').select('id, name, nickname, avatar_url').order('name'),
      ]);
      const allSeasons = (s.data || []) as Season[];
      setSeasons(allSeasons);
      const active = allSeasons.find(x => x.status === 'active');
      if (active) setSeasonId(active.id);
      else setLinkToSeason(false);

      const allGames = ((g.data || []) as Game[]).filter(gm => gm.slug !== 'blood-on-the-clocktower');
      setGames(allGames);
      setProfiles((p.data || []) as Profile[]);

      // Recent games + play counts (overall + avg duration)
      const { data: matches } = await supabase
        .from('matches')
        .select('game_id, duration_minutes, played_at')
        .order('played_at', { ascending: false })
        .limit(500);

      const counts: Record<string, number> = {};
      const durations: Record<string, { total: number; count: number }> = {};
      const ordered: string[] = [];
      for (const m of (matches || [])) {
        const gid = (m as any).game_id;
        counts[gid] = (counts[gid] || 0) + 1;
        if ((m as any).duration_minutes) {
          if (!durations[gid]) durations[gid] = { total: 0, count: 0 };
          durations[gid].total += (m as any).duration_minutes;
          durations[gid].count += 1;
        }
        if (!ordered.includes(gid)) ordered.push(gid);
      }
      setGamePlayCounts(counts);
      const avg: Record<string, number> = {};
      for (const [gid, d] of Object.entries(durations)) avg[gid] = Math.round(d.total / d.count);
      setAvgDurations(avg);

      const recent = ordered.slice(0, 4).map(gid => allGames.find(g => g.id === gid)).filter(Boolean) as Game[];
      setRecentGames(recent);

      // Default date = today (only if not prefilled)
      if (!prefilledDate) {
        const today = new Date();
        setPlayedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      }

      // Friends list
      if (user?.id) {
        const { data: fr } = await supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .eq('status', 'accepted' as any)
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        const ids = new Set<string>();
        for (const f of (fr || []) as any[]) {
          if (f.user_id === user.id) ids.add(f.friend_id);
          else if (f.friend_id === user.id) ids.add(f.user_id);
        }
        setFriendIds(Array.from(ids));
      }
    };
    fetchBase();
  }, []);

  // Fetch community members when prefilledCommunityId is provided
  useEffect(() => {
    if (!prefilledCommunityId) {
      setCommunityName(null);
      setCommunityMemberIds([]);
      return;
    }
    const run = async () => {
      const [{ data: comm }, { data: members }] = await Promise.all([
        supabase.from('communities' as any).select('name').eq('id', prefilledCommunityId).maybeSingle(),
        supabase.from('community_members' as any)
          .select('user_id')
          .eq('community_id', prefilledCommunityId)
          .eq('status', 'active' as any),
      ]);
      setCommunityName((comm as any)?.name ?? null);
      setCommunityMemberIds(((members || []) as any[]).map(m => m.user_id).filter(Boolean));
    };
    run();
  }, [prefilledCommunityId]);

  // Fetch schema + factions when game changes
  useEffect(() => {
    if (!gameId) { setScoringSchema(null); setGameFactions([]); return; }
    const run = async () => {
      const [schemaRes, gameRes] = await Promise.all([
        supabase.from('game_scoring_schemas').select('schema').eq('game_id', gameId).maybeSingle(),
        supabase.from('games').select('factions').eq('id', gameId).maybeSingle(),
      ]);
      setScoringSchema((schemaRes.data?.schema as any) || null);
      try {
        const fData = (gameRes.data as any)?.factions;
        let arr: any[] = [];
        if (Array.isArray(fData)) arr = fData;
        else if (typeof fData === 'string') { try { arr = JSON.parse(fData); } catch { arr = []; } }
        setGameFactions(arr.map((f: any) => typeof f === 'string' ? f : f?.name || '').filter(Boolean));
      } catch { setGameFactions([]); }
    };
    run();
  }, [gameId]);

  const selectedGame = games.find(g => g.id === gameId);
  const minPlayers = selectedGame?.min_players || 1;
  const maxPlayers = selectedGame?.max_players || 99;

  // Schema scorable fields (flat)
  const scorableFields: SchemaField[] = useMemo(() => {
    if (!scoringSchema) return [];
    const fields: SchemaField[] = [];
    for (const cat of scoringSchema.categories || []) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) fields.push({ key: sub.key, label: sub.label });
      } else if ((cat as any).type === 'number') {
        fields.push({ key: cat.key, label: cat.label });
      }
    }
    return fields;
  }, [scoringSchema]);
  const hasSchema = scorableFields.length > 0;

  // Live podium: derive position from total_score desc; tie-break by seat_position asc
  const podium = useMemo(() => {
    const filled = entries.filter(e => e.player_id);
    const ranked = [...filled].sort((a, b) => {
      const sa = a.total_score ?? -Infinity;
      const sb = b.total_score ?? -Infinity;
      if (sb !== sa) return sb - sa;
      return a.seat_position - b.seat_position;
    });
    const map: Record<string, { pos: number | null }> = {};
    let visiblePos = 0;
    for (const e of ranked) {
      if (e.total_score == null) {
        map[e.player_id] = { pos: null };
      } else {
        visiblePos += 1;
        map[e.player_id] = { pos: visiblePos };
      }
    }
    return map;
  }, [entries]);

  const filledCount = entries.filter(e => e.player_id).length;
  const scoredCount = entries.filter(e => e.player_id && e.total_score != null).length;
  const playerCountValid = filledCount >= minPlayers && filledCount <= maxPlayers;

  // Progress
  const progress = useMemo(() => {
    let total = 4; // game, date, players valid, all scored
    let done = 0;
    if (gameId) done += 1;
    if (playedDate) done += 1;
    if (playerCountValid) done += 1;
    if (filledCount > 0 && scoredCount === filledCount) done += 1;
    const pct = Math.round((done / total) * 100);

    let msg = 'Pronto pra registrar';
    if (!gameId) msg = 'Escolha um jogo';
    else if (!playedDate) msg = 'Informe a data';
    else if (!playerCountValid) {
      if (filledCount < minPlayers) msg = `Mínimo de ${minPlayers} jogadores`;
      else msg = `Máximo de ${maxPlayers} jogadores`;
    } else if (scoredCount < filledCount) {
      const missing = entries.filter(e => e.player_id && e.total_score == null);
      const first = missing[0];
      const prof = profiles.find(p => p.id === first?.player_id);
      const name = prof?.nickname || prof?.name || 'jogador';
      msg = missing.length === 1 ? `Falta a pontuação de ${name}` : `Faltam ${missing.length} pontuações`;
    }
    return { pct, msg, ready: done === total };
  }, [gameId, playedDate, playerCountValid, filledCount, scoredCount, entries, profiles, minPlayers, maxPlayers]);

  // Entry helpers
  const updateEntry = (i: number, patch: Partial<Entry>) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  };
  const addEntry = () => {
    if (entries.length >= maxPlayers) return;
    setEntries(prev => [...prev, emptyEntry(prev.length + 1)]);
  };
  const removeEntry = (i: number) => {
    setEntries(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.map((e, idx) => ({ ...e, seat_position: idx + 1 }));
    });
  };

  const updateScoreField = (i: number, key: string, raw: string) => {
    const value = raw === '' ? 0 : parseFloat(raw) || 0;
    setEntries(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const nextScores = { ...e.scores, [key]: value };
      const total = scorableFields.reduce((sum, f) => sum + (nextScores[f.key] || 0), 0);
      return { ...e, scores: nextScores, total_score: total };
    }));
  };

  const setSimpleScore = (i: number, raw: string) => {
    if (raw === '') { updateEntry(i, { total_score: null }); return; }
    const v = parseFloat(raw);
    updateEntry(i, { total_score: isNaN(v) ? null : v });
  };

  // Smart actions
  const importLastGroup = async () => {
    if (!gameId) { notify('error', 'Selecione um jogo primeiro'); return; }
    const { data: lastMatch } = await supabase
      .from('matches').select('id').eq('game_id', gameId)
      .order('played_at', { ascending: false }).limit(1).maybeSingle();
    if (!lastMatch) { notify('error', 'Nenhuma partida anterior deste jogo'); return; }
    const { data: results } = await supabase
      .from('match_results').select('player_id, seat_position').eq('match_id', (lastMatch as any).id)
      .order('seat_position', { ascending: true });
    if (!results || results.length === 0) { notify('error', 'Sem jogadores na última partida'); return; }
    setEntries(results.map((r: any, i: number) => ({
      ...emptyEntry(i + 1),
      player_id: r.player_id,
    })));
    notify('success', `${results.length} jogadores importados`);
  };

  const addCurrentUser = () => {
    if (!currentUserId) return;
    if (entries.some(e => e.player_id === currentUserId)) return;
    const empty = entries.findIndex(e => !e.player_id);
    if (empty >= 0) updateEntry(empty, { player_id: currentUserId });
    else setEntries(prev => [...prev, { ...emptyEntry(prev.length + 1), player_id: currentUserId }]);
  };

  // Submit
  const calculateElo = (results: { player_id: string; position: number }[], mmrMap: Record<string, number>) => {
    const K = 50; const n = results.length; const changes: Record<string, number> = {};
    for (const r of results) changes[r.player_id] = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const rA = mmrMap[results[i].player_id] || 1000;
        const rB = mmrMap[results[j].player_id] || 1000;
        const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
        const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));
        let sA: number, sB: number;
        if (results[i].position < results[j].position) { sA = 1; sB = 0; }
        else if (results[i].position > results[j].position) { sA = 0; sB = 1; }
        else { sA = 0.5; sB = 0.5; }
        changes[results[i].player_id] += K * (sA - eA);
        changes[results[j].player_id] += K * (sB - eB);
      }
    }
    for (const r of results) changes[r.player_id] += 5 * (n - r.position);
    return Object.fromEntries(Object.entries(changes).map(([id, c]) => [id, parseFloat(c.toFixed(2))]));
  };

  const handleSubmit = async () => {
    if (!progress.ready) { notify('error', progress.msg); return; }
    setSaving(true);
    try {
      const filled = entries.filter(e => e.player_id);
      // Final positions from podium derived order
      const ranked = [...filled].sort((a, b) => {
        const sa = a.total_score ?? -Infinity;
        const sb = b.total_score ?? -Infinity;
        if (sb !== sa) return sb - sa;
        return a.seat_position - b.seat_position;
      });
      const positionMap: Record<string, number> = {};
      ranked.forEach((e, i) => { positionMap[e.player_id] = i + 1; });

      const playerIds = filled.map(e => e.player_id);
      const effectiveSeasonId = linkToSeason && seasonId ? seasonId : (seasons.find(s => s.status === 'active')?.id || seasons[0]?.id);
      if (!effectiveSeasonId) { notify('error', 'Nenhuma season disponível'); setSaving(false); return; }

      let mmrMap: Record<string, number> = {};
      let gpMap: Record<string, number> = {};
      let winsMap: Record<string, number> = {};
      let eloChanges: Record<string, number> = {};

      if (linkToSeason && seasonId) {
        const { data: mmrData } = await supabase
          .from('mmr_ratings')
          .select('player_id, current_mmr, games_played, wins')
          .eq('season_id', seasonId).eq('game_id', gameId).in('player_id', playerIds);
        for (const m of (mmrData || [])) {
          mmrMap[(m as any).player_id] = (m as any).current_mmr;
          gpMap[(m as any).player_id] = (m as any).games_played;
          winsMap[(m as any).player_id] = (m as any).wins;
        }
        for (const pid of playerIds) {
          if (!(pid in mmrMap)) {
            mmrMap[pid] = 1000; gpMap[pid] = 0; winsMap[pid] = 0;
            await supabase.rpc('upsert_mmr_for_match', { p_player_id: pid, p_season_id: seasonId, p_game_id: gameId, p_current_mmr: 1000, p_games_played: 0, p_wins: 0 });
          }
        }
        const eloResults = filled.map(e => ({ player_id: e.player_id, position: positionMap[e.player_id] }));
        eloChanges = calculateElo(eloResults, mmrMap);
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const folder = effectiveSeasonId || 'general';
        const path = `${folder}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('match-images').upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('match-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const playedAt = new Date(`${playedDate}T${playedTime || '00:00'}`).toISOString();

      const { data: match, error: mErr } = await supabase.from('matches').insert({
        season_id: effectiveSeasonId,
        game_id: gameId,
        duration_minutes: parseInt(duration) || null,
        played_at: playedAt,
        image_url: imageUrl,
        first_player_id: null,
        platform: platform || null,
      } as any).select().single();
      if (mErr) throw mErr;

      const matchResults = filled.map(e => {
        const pos = positionMap[e.player_id];
        return {
          match_id: match.id,
          player_id: e.player_id,
          ghost_player_id: null,
          position: pos,
          score: e.total_score || 0,
          mmr_before: mmrMap[e.player_id] || 1000,
          mmr_change: eloChanges[e.player_id] || 0,
          mmr_after: (mmrMap[e.player_id] || 1000) + (eloChanges[e.player_id] || 0),
          seat_position: e.seat_position,
          faction: e.faction || null,
          is_new_player: false,
        };
      });
      const { data: insertedResults, error: rErr } = await supabase.from('match_results').insert(matchResults).select();
      if (rErr) throw rErr;

      if (hasSchema && insertedResults) {
        const detailed: any[] = [];
        for (const ir of insertedResults) {
          const e = filled.find(en => en.player_id === (ir as any).player_id);
          if (e?.scores) {
            for (const [key, value] of Object.entries(e.scores)) {
              if (typeof value === 'number' && value !== 0) {
                detailed.push({ match_result_id: (ir as any).id, category_key: key, value });
              }
            }
          }
        }
        if (detailed.length > 0) await supabase.from('match_result_scores').insert(detailed);
      }

      if (linkToSeason && seasonId) {
        for (const e of filled) {
          const isWin = positionMap[e.player_id] === 1;
          await supabase.rpc('upsert_mmr_for_match', {
            p_player_id: e.player_id,
            p_season_id: seasonId,
            p_game_id: gameId,
            p_current_mmr: (mmrMap[e.player_id] || 1000) + (eloChanges[e.player_id] || 0),
            p_games_played: (gpMap[e.player_id] || 0) + 1,
            p_wins: (winsMap[e.player_id] || 0) + (isWin ? 1 : 0),
          });
        }
      }

      notify('success', 'Partida registrada com sucesso!');
      onComplete?.(match.id);
      // Reset
      setGameId(''); setEntries([emptyEntry(1)]); setDuration('');
      setNotes(''); setImageFile(null);
    } catch (err: any) {
      notify('error', err.message || 'Erro ao registrar partida');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Sub-renders ----------
  const filteredCatalog = useMemo(() => {
    const q = gameSearch.trim().toLowerCase();
    if (!q) return [];
    return games.filter(g => g.name.toLowerCase().includes(q)).slice(0, 8);
  }, [gameSearch, games]);

  const sectionDoneClass = (done: boolean) =>
    done
      ? 'border-green-500/20'
      : 'border-gold/25';

  const StatusBubble = ({ done, n }: { done: boolean; n: number }) => done ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400">
      <Check className="h-3.5 w-3.5" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/20 text-gold text-xs font-bold">
      {n}
    </span>
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Registrar partida</h2>
            <p className="text-sm text-muted-foreground">Boardgame · partida que já aconteceu</p>
          </div>
        </div>
      )}

      {/* Section 1 — Game */}
      <div className={`rounded-xl border ${sectionDoneClass(!!gameId)} bg-card/60 p-5 space-y-4`}>
        <div className="flex items-center gap-3">
          <StatusBubble done={!!gameId} n={1} />
          <h3 className="font-semibold text-foreground">Jogo</h3>
          {gameId && (
            <button onClick={() => setGameId('')} className="ml-auto text-xs text-gold hover:underline">
              Trocar
            </button>
          )}
        </div>

        {gameId && selectedGame ? (
          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-3">
            <div className="h-14 w-14 rounded-md bg-secondary overflow-hidden flex-shrink-0">
              {selectedGame.image_url ? (
                <img src={selectedGame.image_url} alt={selectedGame.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  {selectedGame.name.slice(0, 4).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{selectedGame.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedGame.min_players}-{selectedGame.max_players} jogadores
                {gameFactions.length > 0 && ' · com facções'}
                {hasSchema && ' · schema de pontuação'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {recentGames.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recentGames.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGameId(g.id)}
                    className="group rounded-lg border border-border/40 bg-background/40 p-2 hover:border-gold/40 transition text-left"
                  >
                    <div className="aspect-square rounded-md bg-secondary overflow-hidden mb-2">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                          {g.name.slice(0, 4).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{gamePlayCounts[g.id] || 0} partidas</p>
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={gameSearch}
                onChange={e => setGameSearch(e.target.value)}
                placeholder="Buscar no catálogo..."
                className="pl-9"
              />
              {filteredCatalog.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-auto">
                  {filteredCatalog.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setGameId(g.id); setGameSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-secondary text-sm"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Section 2 — When */}
      <div className={`rounded-xl border ${sectionDoneClass(!!playedDate)} bg-card/60 p-5 space-y-4`}>
        <div className="flex items-center gap-3">
          <StatusBubble done={!!playedDate} n={2} />
          <h3 className="font-semibold text-foreground">Quando</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Data e hora</label>
            <div className="flex gap-2">
              <div className="flex-1"><DatePickerField value={playedDate} onChange={setPlayedDate} /></div>
              <Input type="time" value={playedTime} onChange={e => setPlayedTime(e.target.value)} className="w-[110px]" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Duração (min)</label>
            <div className="relative">
              <Input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="—"
              />
              {gameId && avgDurations[gameId] && (
                <button
                  type="button"
                  onClick={() => setDuration(String(avgDurations[gameId]))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gold/80 hover:text-gold"
                  title={`Média histórica: ${avgDurations[gameId]} min`}
                >
                  ↩ média {avgDurations[gameId]}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Local</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {gameId && seasons.find(s => s.status === 'active') && (
          <label className="flex items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 cursor-pointer">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={linkToSeason}
                onCheckedChange={c => setLinkToSeason(!!c)}
                className="data-[state=checked]:bg-gold data-[state=checked]:border-gold data-[state=checked]:text-black"
              />
              <span className="text-sm font-medium">
                Vale para {seasons.find(s => s.status === 'active')?.name}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">MMR será calculado</span>
          </label>
        )}
      </div>

      {/* Section 3 — Mesa e resultado */}
      <div className={`rounded-xl border ${sectionDoneClass(filledCount > 0 && scoredCount === filledCount && playerCountValid)} bg-card/60 p-5 space-y-4`}>
        <div className="flex items-center gap-3">
          <StatusBubble done={filledCount > 0 && scoredCount === filledCount && playerCountValid} n={3} />
          <h3 className="font-semibold text-foreground">Mesa e resultado</h3>
          {filledCount > 0 && (
            <span className="ml-auto text-xs text-gold/80">{scoredCount} de {filledCount} com pontuação</span>
          )}
        </div>

        {/* Smart actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={importLastGroup}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#4ab4ff]/30 bg-[#4ab4ff]/10 px-3 py-1 text-xs text-[#4ab4ff] hover:bg-[#4ab4ff]/20"
          >
            <Users className="h-3 w-3" /> + Último grupo
          </button>
          {currentUserId && (
            <button
              onClick={addCurrentUser}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#c4a8ff]/30 bg-[#c4a8ff]/10 px-3 py-1 text-xs text-[#c4a8ff] hover:bg-[#c4a8ff]/20"
            >
              <UserPlus className="h-3 w-3" /> + Eu
            </button>
          )}
          {friendIds.length > 0 && (
            <Popover open={friendsOpen} onOpenChange={(o) => { setFriendsOpen(o); if (!o) setSelectedFriendsToAdd(new Set()); }}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ffb84a]/30 bg-[#ffb84a]/10 px-3 py-1 text-xs text-[#ffb84a] hover:bg-[#ffb84a]/20"
                >
                  <UserPlus className="h-3 w-3" /> + Amigos
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar amigo..." />
                  <CommandList>
                    <CommandEmpty>Nenhum amigo disponível.</CommandEmpty>
                    <CommandGroup>
                      {profiles
                        .filter(p => friendIds.includes(p.id) && !entries.some(e => e.player_id === p.id))
                        .map(p => {
                          const checked = selectedFriendsToAdd.has(p.id);
                          return (
                            <CommandItem
                              key={p.id}
                              value={`${p.nickname || ''} ${p.name}`}
                              onSelect={() => {
                                setSelectedFriendsToAdd(prev => {
                                  const next = new Set(prev);
                                  if (next.has(p.id)) next.delete(p.id);
                                  else next.add(p.id);
                                  return next;
                                });
                              }}
                            >
                              <Checkbox checked={checked} className="mr-2 data-[state=checked]:bg-gold data-[state=checked]:border-gold" />
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={p.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">{(p.nickname || p.name).slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              {p.nickname || p.name}
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                  <span className="text-[11px] text-muted-foreground">{selectedFriendsToAdd.size} selecionado(s)</span>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={selectedFriendsToAdd.size === 0}
                    onClick={() => {
                      const ids = Array.from(selectedFriendsToAdd);
                      setEntries(prev => {
                        const next = [...prev];
                        for (const fid of ids) {
                          const empty = next.findIndex(e => !e.player_id);
                          if (empty >= 0) next[empty] = { ...next[empty], player_id: fid };
                          else next.push({ ...emptyEntry(next.length + 1), player_id: fid });
                        }
                        return next;
                      });
                      setSelectedFriendsToAdd(new Set());
                      setFriendsOpen(false);
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {prefilledCommunityId && communityMemberIds.length > 0 && (
            <Popover open={communityOpen} onOpenChange={(o) => { setCommunityOpen(o); if (!o) setSelectedCommunityToAdd(new Set()); }}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#7ee787]/30 bg-[#7ee787]/10 px-3 py-1 text-xs text-[#7ee787] hover:bg-[#7ee787]/20"
                >
                  <Users className="h-3 w-3" /> + Comunidade
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                {communityName && (
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {communityName}
                  </div>
                )}
                <Command>
                  <CommandInput placeholder="Buscar membro..." />
                  <CommandList>
                    <CommandEmpty>Nenhum membro disponível.</CommandEmpty>
                    <CommandGroup>
                      {profiles
                        .filter(p => communityMemberIds.includes(p.id) && !entries.some(e => e.player_id === p.id))
                        .map(p => {
                          const checked = selectedCommunityToAdd.has(p.id);
                          return (
                            <CommandItem
                              key={p.id}
                              value={`${p.nickname || ''} ${p.name}`}
                              onSelect={() => {
                                setSelectedCommunityToAdd(prev => {
                                  const next = new Set(prev);
                                  if (next.has(p.id)) next.delete(p.id);
                                  else next.add(p.id);
                                  return next;
                                });
                              }}
                            >
                              <Checkbox checked={checked} className="mr-2 data-[state=checked]:bg-gold data-[state=checked]:border-gold" />
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={p.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">{(p.nickname || p.name).slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              {p.nickname || p.name}
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                  <span className="text-[11px] text-muted-foreground">{selectedCommunityToAdd.size} selecionado(s)</span>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={selectedCommunityToAdd.size === 0}
                    onClick={() => {
                      const ids = Array.from(selectedCommunityToAdd);
                      setEntries(prev => {
                        const next = [...prev];
                        for (const fid of ids) {
                          const empty = next.findIndex(e => !e.player_id);
                          if (empty >= 0) next[empty] = { ...next[empty], player_id: fid };
                          else next.push({ ...emptyEntry(next.length + 1), player_id: fid });
                        }
                        return next;
                      });
                      setSelectedCommunityToAdd(new Set());
                      setCommunityOpen(false);
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[40px_1fr_auto_auto_auto_32px] gap-3 text-[10px] uppercase tracking-wide text-muted-foreground px-2">
          <div className="text-center">Assento</div>
          <div className="pl-2">Jogador</div>
          {gameFactions.length > 0 && <div className="w-[110px]">Facção</div>}
          <div className="w-[80px] text-right">Pontuação</div>
          <div className="w-[60px] text-center">Posição</div>
          <div />
        </div>

        <div className="space-y-2">
          {entries.map((e, i) => {
            const player = profiles.find(p => p.id === e.player_id);
            const podiumInfo = podium[e.player_id];
            const pos = podiumInfo?.pos ?? null;
            const usedIds = entries.filter((_, ii) => ii !== i).map(ee => ee.player_id).filter(Boolean);

            return (
              <div key={i} className="space-y-2">
                <div className="grid grid-cols-[40px_1fr_auto_auto_auto_32px] items-center gap-3 rounded-lg border border-border/40 bg-background/40 px-2 py-2">
                  {/* Seat */}
                  <Input
                    type="number"
                    min={1}
                    value={e.seat_position}
                    onChange={ev => updateEntry(i, { seat_position: parseInt(ev.target.value) || 1 })}
                    className="h-9 w-10 px-1 text-center text-sm"
                  />

                  {/* Player picker */}
                  <Popover open={openPicker === i} onOpenChange={(o) => setOpenPicker(o ? i : null)}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-2 text-left h-9 px-2 rounded hover:bg-secondary/50 min-w-0">
                        {player ? (
                          <>
                            <Avatar className="h-7 w-7"><AvatarImage src={player.avatar_url || undefined} /><AvatarFallback className="text-[10px]">{(player.nickname || player.name).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                            <span className="text-sm font-medium truncate">{player.nickname || player.name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Selecionar jogador...</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar jogador..." />
                        <CommandList>
                          <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
                          <CommandGroup>
                            {profiles.filter(p => !usedIds.includes(p.id)).map(p => (
                              <CommandItem
                                key={p.id}
                                value={`${p.nickname || ''} ${p.name}`}
                                onSelect={() => { updateEntry(i, { player_id: p.id }); setOpenPicker(null); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${e.player_id === p.id ? 'opacity-100' : 'opacity-0'}`} />
                                {p.nickname || p.name}
                                {p.nickname && <span className="ml-1 text-xs text-muted-foreground">({p.name})</span>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Faction */}
                  {gameFactions.length > 0 && (
                    <Select value={e.faction || 'none'} onValueChange={v => updateEntry(i, { faction: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue placeholder="Facção?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {gameFactions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Score input */}
                  {hasSchema ? (
                    <button
                      onClick={() => { setShowHelperHint(false); updateEntry(i, { scoring_open: !e.scoring_open }); }}
                      className="h-9 w-[80px] rounded border border-border/60 bg-background text-sm text-right pr-2 hover:border-gold/50 flex items-center justify-end gap-1"
                    >
                      {e.total_score == null ? <span className="text-muted-foreground">?</span> : <span>{e.total_score}</span>}
                      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${e.scoring_open ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      value={e.total_score == null ? '' : e.total_score}
                      onChange={ev => setSimpleScore(i, ev.target.value)}
                      className="h-9 w-[80px] text-right text-sm"
                      placeholder="?"
                    />
                  )}

                  {/* Live position */}
                  <PodiumCell pos={pos} hasScore={e.total_score != null} />

                  {/* Remove */}
                  {entries.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remover jogador"
                      aria-label="Remover jogador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>

                {/* Inline scoring breakdown */}
                {hasSchema && e.scoring_open && (
                  <div className="rounded-lg border border-[#c4a8ff]/30 bg-[#c4a8ff]/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wide text-[#c4a8ff] font-semibold">Detalhamento da pontuação</span>
                      <button onClick={() => updateEntry(i, { scoring_open: false })} className="text-[11px] text-[#c4a8ff] hover:underline flex items-center gap-1">
                        Recolher <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {scorableFields.map(f => (
                        <div key={f.key} className="space-y-1">
                          <label className="text-[10px] text-muted-foreground">{f.label}</label>
                          <Input
                            type="number"
                            value={e.scores[f.key] === undefined || e.scores[f.key] === 0 ? '' : e.scores[f.key]}
                            onChange={ev => updateScoreField(i, f.key, ev.target.value)}
                            className="h-8 text-sm text-right"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#c4a8ff]/20 text-xs">
                      <span className="text-muted-foreground">Total calculado automaticamente</span>
                      <span className="font-bold text-[#c4a8ff]">{e.total_score ?? 0} pts</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addEntry}
            disabled={entries.length >= maxPlayers}
            className="border-dashed"
          >
            <UserPlus className="h-4 w-4 mr-1" /> Adicionar jogador
          </Button>
          {hasSchema && showHelperHint && (
            <span className="text-[11px] text-muted-foreground">
              ⓘ Clique na pontuação pra abrir o detalhamento
            </span>
          )}
        </div>

        {!playerCountValid && filledCount > 0 && (
          <p className="text-xs text-destructive">{progress.msg}</p>
        )}
      </div>

      {/* Section 4 — Optional */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
        <button
          onClick={() => setOptionalOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ChevronRight className={`h-4 w-4 transition-transform ${optionalOpen ? 'rotate-90' : ''}`} />
            Foto e observações <span className="text-muted-foreground font-normal">(opcional)</span>
          </span>
          <span className="text-xs text-muted-foreground">2 campos</span>
        </button>
        {optionalOpen && (
          <div className="px-5 pb-5 space-y-3">
            <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 cursor-pointer hover:bg-secondary/40">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate flex-1">{imageFile ? imageFile.name : 'Anexar foto da partida'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={ev => setImageFile(ev.target.files?.[0] || null)} />
            </label>
            {imageFile && (
              <div className="relative inline-block">
                <img src={URL.createObjectURL(imageFile)} alt="preview" className="h-24 rounded border border-border" />
                <button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </div>
            )}
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações livres sobre a partida..."
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Footer sticky */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center justify-between gap-4 z-10">
        <div className="flex-1 min-w-0">
          <div className="h-1 w-full max-w-[200px] rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            <span className="text-gold font-semibold">{progress.pct}%</span> · {progress.msg}
          </p>
        </div>
        <Button variant="gold" onClick={handleSubmit} disabled={saving || !progress.ready}>
          {saving ? 'Salvando...' : 'Registrar partida'}
        </Button>
      </div>
    </div>
  );
};

const PodiumCell = ({ pos, hasScore }: { pos: number | null; hasScore: boolean }) => {
  if (!hasScore || pos == null) {
    return (
      <div className="w-[60px] h-9 rounded border border-dashed border-border/60 flex items-center justify-center text-muted-foreground text-sm">
        —
      </div>
    );
  }
  let bg = 'bg-secondary text-muted-foreground border-border/60';
  let icon: React.ReactNode = null;
  if (pos === 1) { bg = 'bg-gold/15 text-gold border-gold/40'; icon = <Crown className="h-3 w-3" />; }
  else if (pos === 2) { bg = 'bg-[#c0c0c0]/15 text-[#d4d4d4] border-[#c0c0c0]/40'; }
  else if (pos === 3) { bg = 'bg-[#b87333]/15 text-[#d49060] border-[#b87333]/40'; }
  return (
    <div className={`w-[60px] h-9 rounded border flex items-center justify-center gap-1 text-xs font-bold transition-colors ${bg}`}>
      {icon}
      {pos}º
    </div>
  );
};

export default NewBoardgameFlow;
