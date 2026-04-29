import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import type { PlayerTag } from '@/components/profile/PlayerTagsSelector';

export const useProfileTags = (userId?: string | null) => {
  const [tags, setTags] = useState<PlayerTag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setTags([]); return; }
    setLoading(true);
    supabase.from('profile_tags').select('tag').eq('user_id', userId).then(({ data }) => {
      setTags(((data || []) as any[]).map(r => r.tag as PlayerTag));
      setLoading(false);
    });
  }, [userId]);

  return { tags, setTags, loading };
};

export const saveProfileTags = async (userId: string, newTags: PlayerTag[]) => {
  // Replace strategy: delete all, then insert new
  await supabase.from('profile_tags').delete().eq('user_id', userId);
  if (newTags.length > 0) {
    const { error } = await supabase
      .from('profile_tags')
      .insert(newTags.map(tag => ({ user_id: userId, tag })) as any);
    if (error) throw error;
  }
};
