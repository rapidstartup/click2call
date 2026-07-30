import { supabase } from './supabase';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Authentication required');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}
