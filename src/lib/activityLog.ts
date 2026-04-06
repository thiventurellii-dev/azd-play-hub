import { supabase } from '@/integrations/supabase/client';

export async function logActivity(
  userId: string,
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId?: string,
  oldData?: any,
  newData?: any
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      old_data: oldData || null,
      new_data: newData || null,
    } as any);
  } catch (err) {
    console.warn('[ActivityLog] Failed to log:', err);
  }
}
