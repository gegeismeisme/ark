import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

type StatusMap = Record<string, { missing: number }>;

type UseMemberTagStatusResult = {
  status: StatusMap;
  loading: boolean;
  error: string | null;
  refresh: (memberIds?: string[]) => Promise<void>;
};

/**
 * Batch fetch required tag completion counts for a set of members in an organization.
 * Returns a map keyed by member_id with `{ missing }` counts.
 */
export function useMemberTagStatus(
  organizationId: string | null,
  memberIds: string[] | null,
): UseMemberTagStatusResult {
  const [status, setStatus] = useState<StatusMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(
    async (overrideMemberIds?: string[]) => {
      if (!organizationId) {
        setStatus({});
        setError(null);
        return;
      }
      const targets = overrideMemberIds ?? memberIds ?? [];
      if (!targets.length) {
        setStatus({});
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);

      const [requiredCategoriesRes, memberTagsRes] = await Promise.all([
        supabase
          .from('organization_tag_categories')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_required', true),
        supabase
          .from('member_tags')
          .select(
            `
              member_id,
              organization_tags (
                category_id
              )
            `,
          )
          .in('member_id', targets),
      ]);

      if (requiredCategoriesRes.error || memberTagsRes.error) {
        setError(requiredCategoriesRes.error?.message ?? memberTagsRes.error?.message ?? 'Unknown error');
        setLoading(false);
        return;
      }

      type RequiredRow = { id: string };
      type MemberTagRow = { member_id: string; organization_tags?: { category_id: string } | { category_id: string }[] };

      const requiredIds = new Set<string>(
        ((requiredCategoriesRes.data as RequiredRow[] | null | undefined) ?? []).map((row) => row.id).filter(Boolean),
      );

      const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      };

      const categoriesByMember = new Map<string, Set<string>>();
      (memberTagsRes.data as MemberTagRow[] | null | undefined)?.forEach((row) => {
        if (!row?.member_id) return;
        const categories = toArray(row.organization_tags)
          .map((tag) => tag?.category_id)
          .filter((categoryId): categoryId is string => Boolean(categoryId));
        if (!categories.length) return;
        if (!categoriesByMember.has(row.member_id)) {
          categoriesByMember.set(row.member_id, new Set<string>());
        }
        const bucket = categoriesByMember.get(row.member_id)!;
        categories.forEach((id) => bucket.add(id));
      });

      const next: StatusMap = {};
      targets.forEach((memberId) => {
        if (!requiredIds.size) {
          next[memberId] = { missing: 0 };
          return;
        }
        const selected = categoriesByMember.get(memberId) ?? new Set<string>();
        let missing = 0;
        requiredIds.forEach((catId) => {
          if (!selected.has(catId)) missing += 1;
        });
        next[memberId] = { missing };
      });

      setStatus(next);
      setLoading(false);
    },
    [organizationId, memberIds],
  );

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  return useMemo(
    () => ({
      status,
      loading,
      error,
      refresh: async (ids?: string[]) => {
        bump();
        await refresh(ids);
      },
    }),
    [status, loading, error, refresh, bump],
  );
}
