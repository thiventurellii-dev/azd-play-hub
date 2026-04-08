import { supabase } from '@/lib/supabaseExternal';

const EDGE_FUNCTION_BASE = `https://tlygyryaiwjcamzgnixg.supabase.co/functions/v1`;

/**
 * Calls a Lovable Cloud edge function with the external Supabase session token.
 * Edge functions are still hosted on Lovable Cloud but operate on the external Supabase.
 */
export async function invokeEdgeFunction(functionName: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${EDGE_FUNCTION_BASE}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return { data: null, error: { message: data?.error || `HTTP ${res.status}` } };
  }

  return { data, error: null };
}
