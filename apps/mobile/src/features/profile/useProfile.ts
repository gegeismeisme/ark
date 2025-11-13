import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';

export type Profile = {
  id: string;
  fullName: string | null;
  createdAt: string | null;
  planTier: string | null;
};

type UseProfileResult = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateName: (nextName: string) => Promise<boolean>;
};

export function useProfile(session: Session | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, full_name, created_at, plan_tier')
      .eq('id', userId)
      .limit(1);

    if (queryError) {
      setError(queryError.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    const row = data?.[0] ?? null;
    setProfile(
      row
        ? {
            id: row.id as string,
            fullName: (row.full_name as string | null) ?? null,
            createdAt: (row.created_at as string | null) ?? null,
            planTier: (row.plan_tier as string | null) ?? null,
          }
        : null,
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateName = useCallback(
    async (nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed || !userId) return false;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', userId);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      setProfile((current) =>
        current
          ? { ...current, fullName: trimmed }
          : { id: userId, fullName: trimmed, createdAt: null, planTier: null },
      );
      return true;
    },
    [userId],
  );

  return {
    profile,
    loading,
    error,
    refresh: load,
    updateName,
  };
}
