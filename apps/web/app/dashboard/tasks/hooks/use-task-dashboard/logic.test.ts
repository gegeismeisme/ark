import { describe, expect, it } from 'vitest';

import type { TaskTagCategory } from '../../types';
import {
  createSelectionTypeLookup,
  formatAssignmentSummary,
  userMatchesFilters,
} from './logic';

const baseCategory = (overrides: Partial<TaskTagCategory>): TaskTagCategory => ({
  id: 'cat',
  name: 'Category',
  isRequired: false,
  selectionType: 'single',
  groupId: null,
  groupName: null,
  tags: [],
  ...overrides,
});

describe('userMatchesFilters', () => {
  it('returns true when no filters are active', () => {
    const selectionLookup = createSelectionTypeLookup([baseCategory({ id: 'role' })]);
    const matches = userMatchesFilters({
      userId: 'user-1',
      memberTagIndex: new Map([['user-1', new Set(['tag-1'])]]),
      relevantCategoryIds: new Set(),
      tagFilters: {},
      selectionTypeByCategory: selectionLookup,
    });
    expect(matches).toBe(true);
  });

  it('checks single-selection categories with OR semantics', () => {
    const selectionLookup = createSelectionTypeLookup([baseCategory({ id: 'role' })]);
    const matches = userMatchesFilters({
      userId: 'user-1',
      memberTagIndex: new Map([['user-1', new Set(['math', 'science'])]]),
      relevantCategoryIds: new Set(['role']),
      tagFilters: { role: ['science'] },
      selectionTypeByCategory: selectionLookup,
    });
    expect(matches).toBe(true);
    const fails = userMatchesFilters({
      userId: 'user-1',
      memberTagIndex: new Map([['user-1', new Set(['math'])]]),
      relevantCategoryIds: new Set(['role']),
      tagFilters: { role: ['science'] },
      selectionTypeByCategory: selectionLookup,
    });
    expect(fails).toBe(false);
  });

  it('requires all tags for multi-select categories', () => {
    const selectionLookup = createSelectionTypeLookup([
      baseCategory({ id: 'skills', selectionType: 'multiple' }),
    ]);
    const matches = userMatchesFilters({
      userId: 'user-1',
      memberTagIndex: new Map([['user-1', new Set(['tag-a', 'tag-b', 'tag-c'])]]),
      relevantCategoryIds: new Set(['skills']),
      tagFilters: { skills: ['tag-a', 'tag-b'] },
      selectionTypeByCategory: selectionLookup,
    });
    expect(matches).toBe(true);

    const fails = userMatchesFilters({
      userId: 'user-1',
      memberTagIndex: new Map([['user-1', new Set(['tag-a'])]]),
      relevantCategoryIds: new Set(['skills']),
      tagFilters: { skills: ['tag-a', 'tag-b'] },
      selectionTypeByCategory: selectionLookup,
    });
    expect(fails).toBe(false);
  });
});

describe('formatAssignmentSummary', () => {
  const t = (key: string, vars?: Record<string, number>) => {
    if (!vars) return key;
    return `${key}:${Object.entries(vars)
      .map(([k, value]) => `${k}=${value}`)
      .join(',')}`;
  };

  it('returns noneAssigned when summary missing', () => {
    expect(formatAssignmentSummary(undefined, t)).toBe('dashboard.tasks.summary.noneAssigned');
    expect(
      formatAssignmentSummary(
        {
          task_id: 'task',
          assignment_count: 0,
          completed_count: 0,
          accepted_count: 0,
          changes_requested_count: 0,
          overdue_count: 0,
        },
        t,
      ),
    ).toBe('dashboard.tasks.summary.noneAssigned');
  });

  it('formats metrics and appends optional segments', () => {
    const summary = formatAssignmentSummary(
      {
        task_id: 'task',
        assignment_count: 5,
        completed_count: 3,
        accepted_count: 2,
        changes_requested_count: 1,
        overdue_count: 2,
      },
      t,
    );

    expect(summary).toContain('dashboard.tasks.summary.completed:completed=3,total=5');
    expect(summary).toContain('dashboard.tasks.summary.accepted:accepted=2,total=5');
    expect(summary).toContain('dashboard.tasks.summary.changesRequested:count=1');
    expect(summary).toContain('dashboard.tasks.summary.overdue:count=2');
  });
});
