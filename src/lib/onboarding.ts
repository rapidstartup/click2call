import { supabase } from './supabase';

/**
 * Whether the current user has at least one widget. Used to decide whether a
 * newly-authenticated user should be routed to /onboarding or straight to
 * /dashboard. Fails "open" (treats errors as "has widgets") so a transient
 * query failure never traps a user in an onboarding loop.
 */
export async function hasAnyWidgets(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('widgets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return true;
    return (count ?? 0) > 0;
  } catch {
    return true;
  }
}

/** Path to send a user to right after they authenticate. */
export async function postAuthRedirectPath(userId: string): Promise<string> {
  const hasWidgets = await hasAnyWidgets(userId);
  return hasWidgets ? '/dashboard' : '/onboarding';
}
