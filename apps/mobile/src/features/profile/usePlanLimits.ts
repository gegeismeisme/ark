import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

export type PlanLimits = {
  planTier: string;
  maxOrgsPerUser: number | null;
  maxGroupsPerOrganization: number | null;
  maxMembersPerOrganization: number | null;
  maxGroupAdminRolesPerUser: number | null;
};

export type PlanLimitsMap = Record<string, PlanLimits>;

type UsePlanLimitsResult = {
  limits: PlanLimits[];
  limitsMap: PlanLimitsMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function usePlanLimits(): UsePlanLimitsResult {
  const [limits, setLimits] = useState<PlanLimits[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('plan_limits')
      .select('plan_tier, max_orgs_per_user, max_groups_per_organization, max_members_per_organization, max_group_admin_roles_per_user')
      .order('plan_tier', { ascending: true });
    if (queryError) {
      setLimits([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }
    setLimits(
      (data ?? []).map((row) => ({
        planTier: (row as { plan_tier: string }).plan_tier,
        maxOrgsPerUser: (row as { max_orgs_per_user: number | null }).max_orgs_per_user,
        maxGroupsPerOrganization: (row as { max_groups_per_organization: number | null }).max_groups_per_organization,
        maxMembersPerOrganization: (row as { max_members_per_organization: number | null }).max_members_per_organization,
        maxGroupAdminRolesPerUser: (row as { max_group_admin_roles_per_user: number | null }).max_group_admin_roles_per_user,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const limitsMap = useMemo(() => {
    return limits.reduce<PlanLimitsMap>((acc, limit) => {
      acc[limit.planTier] = limit;
      return acc;
    }, {});
  }, [limits]);

  return {
    limits,
    limitsMap,
    loading,
    error,
    refresh: load,
  };
}
