'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { TaskTagCategory, TagSelectionType } from '../../types';

type RawCategoryRow = {
  id: string;
  name: string;
  is_required: boolean;
  selection_type: TagSelectionType;
  group_id: string | null;
  groups?: { id: string; name: string } | null;
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

type UseTagFiltersArgs = {
  supabase: SupabaseClient;
  orgId: string | null;
  selectedGroupId: string | null;
};

type UseTagFiltersResult = {
  list: TaskTagCategory[];
  loading: boolean;
  error: string | null;
  filterable: TaskTagCategory[];
  tagFilters: Record<string, string[]>;
  setTagFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  resetFilters: () => void;
  handleSingleChange: (categoryId: string, value: string) => void;
  handleToggle: (categoryId: string, tagId: string, checked: boolean) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  relevantCategoryIds: Set<string>;
};

function normalizeTags(
  value: RawCategoryRow['organization_tags']
): Array<{ id: string; name: string; is_active: boolean }> {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => ({
      id: item.id,
      name: item.name,
      is_active: item.is_active,
    }));
  }
  return [
    {
      id: value.id,
      name: value.name,
      is_active: value.is_active,
    },
  ];
}

function mapCategory(row: RawCategoryRow): TaskTagCategory {
  return {
    id: row.id,
    name: row.name,
    isRequired: row.is_required,
    selectionType: row.selection_type,
    groupId: row.group_id,
    groupName: row.groups?.name ?? null,
    tags: normalizeTags(row.organization_tags).map((tag) => ({
      id: tag.id,
      name: tag.name,
      isActive: tag.is_active,
    })),
  };
}

export function useTagFiltersState({
  supabase,
  orgId,
  selectedGroupId,
}: UseTagFiltersArgs): UseTagFiltersResult {
  const [categories, setCategories] = useState<TaskTagCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!orgId) {
      setCategories([]);
      setTagFilters({});
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: queryError } = await supabase
        .from('organization_tag_categories')
        .select(
          `
            id,
            name,
            is_required,
            selection_type,
            group_id,
            groups(id, name),
            organization_tags(id, name, is_active)
          `
        )
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })
        .order('organization_tags.created_at', { ascending: true });

      if (cancelled) return;

      if (queryError) {
        setCategories([]);
        setTagFilters({});
        setLoading(false);
        setError(queryError.message);
        return;
      }

      const mapped =
        (data ?? []).map((row) => mapCategory(row as RawCategoryRow)).filter(Boolean) ?? [];

      setCategories(mapped);
      setTagFilters((previous) => {
        const next: Record<string, string[]> = {};
        mapped.forEach((category) => {
          next[category.id] = previous[category.id] ?? [];
        });
        return next;
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, supabase]);

  const filterable = useMemo(() => {
    if (!selectedGroupId) {
      return categories.filter((category) => category.groupId === null && category.tags.length > 0);
    }
    return categories.filter(
      (category) =>
        (category.groupId === null || category.groupId === selectedGroupId) &&
        category.tags.length > 0
    );
  }, [categories, selectedGroupId]);

  const relevantCategoryIds = useMemo(
    () => new Set(filterable.map((category) => category.id)),
    [filterable]
  );

  const activeFilterCount = useMemo(() => {
    let total = 0;
    relevantCategoryIds.forEach((categoryId) => {
      total += tagFilters[categoryId]?.length ?? 0;
    });
    return total;
  }, [relevantCategoryIds, tagFilters]);

  const hasActiveFilters = activeFilterCount > 0;

  const resetFilters = useCallback(() => {
    setTagFilters((previous) => {
      const next: Record<string, string[]> = {};
      relevantCategoryIds.forEach((categoryId) => {
        next[categoryId] = previous[categoryId] ?? [];
      });
      Object.keys(previous).forEach((categoryId) => {
        if (!relevantCategoryIds.has(categoryId)) {
          next[categoryId] = [];
        }
      });
      return next;
    });
  }, [relevantCategoryIds]);

  const handleSingleChange = useCallback((categoryId: string, value: string) => {
    setTagFilters((prev) => ({
      ...prev,
      [categoryId]: value ? [value] : [],
    }));
  }, []);

  const handleToggle = useCallback((categoryId: string, tagId: string, checked: boolean) => {
    setTagFilters((prev) => {
      const current = prev[categoryId] ?? [];
      if (checked) {
        if (current.includes(tagId)) return prev;
        return { ...prev, [categoryId]: [...current, tagId] };
      }
      return { ...prev, [categoryId]: current.filter((id) => id !== tagId) };
    });
  }, []);

  return {
    list: categories,
    loading,
    error,
    filterable,
    tagFilters,
    setTagFilters,
    resetFilters,
    handleSingleChange,
    handleToggle,
    hasActiveFilters,
    activeFilterCount,
    relevantCategoryIds,
  };
}
