import type { MemberTagIndex, TaskSummaryRow, TaskTagCategory, TagSelectionType } from '../../types';

export type TagFilters = Record<string, string[]>;

export type SelectionTypeLookup = Map<string, TagSelectionType>;

type MatchesFiltersArgs = {
  userId: string;
  memberTagIndex: MemberTagIndex;
  relevantCategoryIds: Set<string>;
  tagFilters: TagFilters;
  selectionTypeByCategory: SelectionTypeLookup;
};

type Translator = (key: string, vars?: Record<string, number>) => string;

export function createSelectionTypeLookup(categories: TaskTagCategory[]): SelectionTypeLookup {
  const map: SelectionTypeLookup = new Map();
  categories.forEach((category) => {
    map.set(category.id, category.selectionType);
  });
  return map;
}

export function userMatchesFilters({
  userId,
  memberTagIndex,
  relevantCategoryIds,
  tagFilters,
  selectionTypeByCategory,
}: MatchesFiltersArgs): boolean {
  if (!relevantCategoryIds.size) return true;

  const userTags = memberTagIndex.get(userId) ?? new Set<string>();
  let matches = true;

  relevantCategoryIds.forEach((categoryId) => {
    if (!matches) return;
    const activeFilters = tagFilters[categoryId] ?? [];
    if (activeFilters.length === 0) return;
    const selectionType = selectionTypeByCategory.get(categoryId) ?? 'single';

    if (selectionType === 'single') {
      matches = activeFilters.some((tagId) => userTags.has(tagId));
    } else {
      matches = activeFilters.every((tagId) => userTags.has(tagId));
    }
  });

  return matches;
}

export function formatAssignmentSummary(
  summary: TaskSummaryRow | undefined,
  translate: Translator,
): string {
  if (!summary || summary.assignment_count === 0) {
    return translate('dashboard.tasks.summary.noneAssigned');
  }

  const { assignment_count, completed_count, accepted_count, changes_requested_count, overdue_count } =
    summary;

  const parts = [
    translate('dashboard.tasks.summary.completed', {
      completed: completed_count,
      total: assignment_count,
    }),
    translate('dashboard.tasks.summary.accepted', {
      accepted: accepted_count,
      total: assignment_count,
    }),
  ];

  if (changes_requested_count > 0) {
    parts.push(
      translate('dashboard.tasks.summary.changesRequested', { count: changes_requested_count }),
    );
  }

  if (overdue_count > 0) {
    parts.push(translate('dashboard.tasks.summary.overdue', { count: overdue_count }));
  }

  return parts.join(' · ');
}
