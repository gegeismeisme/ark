'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';

export type ActiveOrganization = {
  id: string;
  name: string;
  slug: string | null;
  role: string | null;
  description: string | null;
  visibility: string | null;
};

type UseActiveOrganizationResult = {
  organization: ActiveOrganization | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useActiveOrganization(session: Session | null): UseActiveOrganizationResult {
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) {
      setOrganization(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

  const { data, error: queryError } = await supabase
      .from('organization_members')
      .select('role, organizations!inner(id, name, slug, description, visibility)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('removed_at', null)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (queryError) {
      setOrganization(null);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const membership = data?.[0] ?? null;
    const org =
      membership && 'organizations' in membership
        ? Array.isArray(membership.organizations)
          ? membership.organizations[0]
          : membership.organizations
        : null;

    if (org) {
      setOrganization({
        id: org.id,
        name: org.name,
        slug: org.slug ?? null,
        role: membership.role ?? null,
        description: org.description ?? null,
        visibility: org.visibility ?? null,
      });
    } else {
      setOrganization(null);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return useMemo(
    () => ({
      organization,
      loading,
      error,
      refresh,
    }),
    [organization, loading, error, refresh],
  );
}
