import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { useAuth } from '@/contexts/AuthContext';

export interface AdventureDetail {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  tag: 'official' | 'homebrew';
  system_id: string;
  tagline?: string | null;
  level_min?: number | null;
  level_max?: number | null;
  players_min?: number | null;
  players_max?: number | null;
  duration_hours_min?: number | null;
  duration_hours_max?: number | null;
  tone?: string | null;
  genres?: string[] | null;
  intensity?: Record<string, number> | null;
  about_long?: string | null;
  highlights?: { title: string; description: string }[] | null;
  master_notes?: { prep?: string; hooks?: string; variations?: string; secrets?: string } | null;
  materials?: { label: string; value: string }[] | null;
  materials_url?: string | null;
  system?: { id: string; name: string; slug: string | null; image_url: string | null } | null;
}

export interface InterestUser {
  user_id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
}

export const useRpgAdventureDetail = (slug?: string) => {
  const { user } = useAuth();

  const advQuery = useQuery({
    queryKey: ['rpg-adventure', slug],
    enabled: !!slug,
    queryFn: async (): Promise<AdventureDetail | null> => {
      const key = slug as string;
      // Use select('*') so any extra columns the external DB has are returned;
      // missing columns simply won't appear (no error).
      let { data } = await supabase
        .from('rpg_adventures')
        .select('*')
        .eq('slug', key)
        .maybeSingle();
      if (!data) {
        const r = await supabase.from('rpg_adventures').select('*').eq('id', key).maybeSingle();
        data = r.data as any;
      }
      if (!data) {
        const { data: all } = await supabase.from('rpg_adventures').select('*');
        const { slugify } = await import('@/lib/slugify');
        data = (all || []).find((a: any) => slugify(a.name) === key) as any;
      }
      if (!data) return null;
      const adv = data as any as AdventureDetail;
      const { data: sys } = await supabase
        .from('rpg_systems')
        .select('id, name, slug, image_url')
        .eq('id', adv.system_id)
        .maybeSingle();
      adv.system = (sys as any) || null;
      return adv;
    },
  });

  const adventureId = advQuery.data?.id;

  const [interests, setInterests] = useState<InterestUser[]>([]);
  const [hasInterest, setHasInterest] = useState(false);
  const [isMestre, setIsMestre] = useState(false);

  const fetchInterests = useCallback(async () => {
    if (!adventureId) return;
    const { data } = await supabase
      .from('rpg_adventure_interests')
      .select('user_id')
      .eq('adventure_id', adventureId);
    const userIds = (data || []).map((r: any) => r.user_id);
    if (userIds.length === 0) {
      setInterests([]);
      setHasInterest(false);
      return;
    }
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, nickname, avatar_url')
      .in('id', userIds);
    const list: InterestUser[] = (profs || []).map((p: any) => ({
      user_id: p.id, name: p.name, nickname: p.nickname, avatar_url: p.avatar_url,
    }));
    setInterests(list);
    if (user) setHasInterest(userIds.includes(user.id));
  }, [adventureId, user]);

  useEffect(() => { fetchInterests(); }, [fetchInterests]);

  useEffect(() => {
    if (!user) { setIsMestre(false); return; }
    supabase
      .from('profile_tags')
      .select('tag')
      .eq('user_id', user.id)
      .eq('tag', 'mestre' as any)
      .maybeSingle()
      .then(({ data }) => setIsMestre(!!data));
  }, [user]);

  const toggleInterest = async () => {
    if (!user || !adventureId) return;
    if (hasInterest) {
      await supabase
        .from('rpg_adventure_interests')
        .delete()
        .eq('adventure_id', adventureId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('rpg_adventure_interests')
        .insert({ adventure_id: adventureId, user_id: user.id } as any);
    }
    await fetchInterests();
  };

  return {
    adventure: advQuery.data,
    isLoading: advQuery.isLoading,
    isError: advQuery.isError,
    interests,
    hasInterest,
    isMestre,
    toggleInterest,
    refetchInterests: fetchInterests,
  };
};
