import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

interface IsAdminState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): IsAdminState {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);

        if (!user) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (queryError) {
          if (!cancelled) {
            setIsAdmin(false);
            setError(queryError.message);
          }
          return;
        }

        const role = data && typeof data.role === 'string' ? data.role : null;
        if (!cancelled) setIsAdmin(role === 'admin');
      } catch (loadError: unknown) {
        if (!cancelled) {
          setIsAdmin(false);
          setError(loadError instanceof Error ? loadError.message : 'Unable to check admin access');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isAdmin, loading, error };
}
