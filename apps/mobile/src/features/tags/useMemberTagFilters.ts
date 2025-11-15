import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

export type TagSelectionType = 'single' | 'multiple';

export type TagOption = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
};

export type TagCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  selectionType: TagSelectionType;
  groupId: string | null;
  tags: TagOption[];
};

type MemberTagRow = {
  member_id: string;
  organization_tags?:
    | {
        id: string;
        name: string;
        category_id: string;
        is_active: boolean;
      }
    | {
        id: string;
        name: string;
        category_id: string;
        is_active: boolean;
      }[]
    | null;
};

type CategoryRow = {
  id: string;
  name: string;
  is_required: boolean;
  selection_type: TagSelectionType;
  group_id: string | null;
  organization_tags?:
    | Array<{
        id: string;
        name: string;
        is_active: boolean;
      }>
    | {
        id: string;
        name: string;
        is_active: boolean;
      }
    | null;
};

const normalizeTags = (
  row: CategoryRow,
): Array<{ id: string; name: string; is_active: boolean }> => {
  if (!row.organization_tags) return [];
  if (Array.isArray(row.organization_tags)) return row.organization_tags;
  return [row.organization_tags];
};

const buildEmptyFilters = (categories: TagCategory[]): Record<string, string[]> => {
  const filters: Record<string, string[]> = {};
  categories.forEach((category) => {
    filters[category.id] = [];
  });
  return filters;
};

export type MemberTagFiltersResult = {
  categories: TagCategory[];
  loading: boolean;
  error: string | null;
  filters: Record<string, string[]>;
  applyFilters: (next: Record<string, string[]>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  memberTagIndex: Map<string, Set<string>>;
  memberTagDisplay: Map<string, TagOption[]>;
  matchesMember: (memberId: string) => boolean;
};

export function useMemberTagFilters(orgId: string | null): MemberTagFiltersResult {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberTagRows, setMemberTagRows] = useState<MemberTagRow[]>([]);

  useEffect(() => {
    if (!orgId) {
      setCategories([]);
      setFilters({});
      setMemberTagRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      supabase
        .from('organization_tag_categories')
        .select(
          `
            id,
            name,
            is_required,
            selection_type,
            group_id,
            organization_tags(id, name, is_active)
          `,
        )
        .eq('organization_id', orgId)
        .order('name', { ascending: true }),
      supabase
        .from('member_tags')
        .select('member_id, organization_tags(id, name, category_id, is_active)')
        .eq('organization_id', orgId),
    ]).then(([categoryResult, memberTagResult]) => {
      if (cancelled) return;
      if (categoryResult.error) {
        setCategories([]);
        setFilters({});
        setMemberTagRows([]);
        setLoading(false);
        setError(categoryResult.error.message);
        return;
      }
      if (memberTagResult.error) {
        setCategories([]);
        setFilters({});
        setMemberTagRows([]);
        setLoading(false);
        setError(memberTagResult.error.message);
        return;
      }

      const mappedCategories =
        (categoryResult.data ?? []).map((row) => {
          const normalized = normalizeTags(row as CategoryRow).filter((tag) => tag.is_active);
          return {
            id: row.id,
            name: row.name,
            isRequired: row.is_required,
            selectionType: row.selection_type,
            groupId: row.group_id,
            tags: normalized.map((tag) => ({
              id: tag.id,
              name: tag.name,
              isActive: tag.is_active,
              categoryId: row.id,
              categoryName: row.name,
            })),
          } satisfies TagCategory;
        }) ?? [];

      setCategories(mappedCategories);
      setFilters((previous) => {
        if (!Object.keys(previous).length) {
          return buildEmptyFilters(mappedCategories);
        }
        const next = buildEmptyFilters(mappedCategories);
        Object.keys(previous).forEach((categoryId) => {
          if (next[categoryId]) {
            next[categoryId] = previous[categoryId];
          }
        });
        return next;
      });
      setMemberTagRows((memberTagResult.data ?? []) as MemberTagRow[]);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const memberTagIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    memberTagRows.forEach((row) => {
      const orgTags = row.organization_tags;
      const tags = Array.isArray(orgTags) ? orgTags : orgTags ? [orgTags] : [];
      const list = map.get(row.member_id) ?? new Set<string>();
      tags.forEach((tag) => {
        if (!tag?.id) return;
        list.add(tag.id);
      });
      if (list.size > 0) {
        map.set(row.member_id, list);
      }
    });
    return map;
  }, [memberTagRows]);

  const tagLookup = useMemo(() => {
    const lookup = new Map<string, TagOption>();
    categories.forEach((category) => {
      category.tags.forEach((tag) => {
        lookup.set(tag.id, tag);
      });
    });
    return lookup;
  }, [categories]);

  const memberTagDisplay = useMemo(() => {
    const map = new Map<string, TagOption[]>();
    memberTagRows.forEach((row) => {
      const orgTags = row.organization_tags;
      const tags = Array.isArray(orgTags) ? orgTags : orgTags ? [orgTags] : [];
      if (!tags.length) return;
      tags.forEach((tag) => {
        if (!tag?.id) return;
        const meta = tagLookup.get(tag.id);
        if (!meta) return;
        const list = map.get(row.member_id) ?? [];
        list.push(meta);
        map.set(row.member_id, list);
      });
    });
    return map;
  }, [memberTagRows, tagLookup]);

  const relevantCategoryIds = useMemo(
    () => new Set(categories.filter((category) => category.tags.length > 0).map((cat) => cat.id)),
    [categories],
  );

  const activeFilterCount = useMemo(() => {
    let total = 0;
    relevantCategoryIds.forEach((categoryId) => {
      total += filters[categoryId]?.length ?? 0;
    });
    return total;
  }, [filters, relevantCategoryIds]);

  const hasActiveFilters = activeFilterCount > 0;

  const selectionTypeByCategory = useMemo(() => {
    const lookup = new Map<string, TagSelectionType>();
    categories.forEach((category) => {
      lookup.set(category.id, category.selectionType);
    });
    return lookup;
  }, [categories]);

  const matchesMember = useCallback(
    (memberId: string) => {
      if (!hasActiveFilters) return true;
      const tagSet = memberTagIndex.get(memberId) ?? new Set<string>();
      let matches = true;
      relevantCategoryIds.forEach((categoryId) => {
        if (!matches) return;
        const activeFilters = filters[categoryId] ?? [];
        if (activeFilters.length === 0) return;
        const selectionType = selectionTypeByCategory.get(categoryId) ?? 'single';
        if (selectionType === 'single') {
          matches = activeFilters.some((tagId) => tagSet.has(tagId));
        } else {
          matches = activeFilters.every((tagId) => tagSet.has(tagId));
        }
      });
      return matches;
    },
    [filters, hasActiveFilters, memberTagIndex, relevantCategoryIds, selectionTypeByCategory],
  );

  const applyFilters = useCallback(
    (next: Record<string, string[]>) => {
      setFilters((prev) => {
        const merged = buildEmptyFilters(categories);
        Object.keys(prev).forEach((categoryId) => {
          if (!(categoryId in merged)) {
            merged[categoryId] = [];
          }
        });
        Object.keys(next).forEach((categoryId) => {
          merged[categoryId] = next[categoryId] ?? [];
        });
        return merged;
      });
    },
    [categories],
  );

  const clearFilters = useCallback(() => {
    setFilters(buildEmptyFilters(categories));
  }, [categories]);

  return {
    categories,
    loading,
    error,
    filters,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    memberTagIndex,
    memberTagDisplay,
    matchesMember,
  };
}
