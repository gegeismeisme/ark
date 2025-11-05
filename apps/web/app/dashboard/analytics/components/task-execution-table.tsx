'use client';

import { useMemo, useState } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';

export type TaskExecutionRow = {
  taskId: string;
  title: string;
  groupId: string | null;
  groupName: string;
  assignments: number;
  completed: number;
  accepted: number;
  changes: number;
  overdue: number;
  dueReminders: number;
  overdueReminders: number;
  pendingDue: number;
  pendingOverdue: number;
  completionRate: string;
  acceptanceRate: string;
  dueAt: string | null;
};

export type TaskTableSort =
  | 'due_desc'
  | 'due_asc'
  | 'completion_desc'
  | 'completion_asc';

type FilterState = {
  groupId: string | 'all';
  sort: TaskTableSort;
  query: string;
};

type GroupOption = {
  id: string | null | 'all';
  name: string;
};

type TaskExecutionTableProps = {
  rows: TaskExecutionRow[];
  groups: GroupOption[];
  formatDate: (value: string | null) => string;
  defaultPageSize?: number;
};

const UNASSIGNED_KEY = '__unassigned__';

const parseRate = (value: string) => {
  const numeric = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

export function TaskExecutionTable({
  rows,
  groups,
  formatDate,
  defaultPageSize = 10,
}: TaskExecutionTableProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [filter, setFilter] = useState<FilterState>({
    groupId: 'all',
    sort: 'due_desc',
    query: '',
  });

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const groupOptions = useMemo(() => {
    const unassignedLabel = t('dashboard.analytics.common.unassignedGroup');
    const unique = new Map<string, GroupOption>();

    groups.forEach((group) => {
      const key = group.id === null ? UNASSIGNED_KEY : String(group.id);
      const name = group.id === null ? unassignedLabel : group.name;
      unique.set(key, { id: group.id, name });
    });

    if (rows.some((row) => row.groupId === null) && !unique.has(UNASSIGNED_KEY)) {
      unique.set(UNASSIGNED_KEY, { id: null, name: unassignedLabel });
    }

    return [
      { id: 'all' as const, name: t('dashboard.analytics.table.filters.allTasks') },
      ...Array.from(unique.values()),
    ];
  }, [groups, rows, t]);

  const sortOptions = useMemo(
    () => [
      { value: 'due_desc', label: t('dashboard.analytics.table.sort.dueDesc') },
      { value: 'due_asc', label: t('dashboard.analytics.table.sort.dueAsc') },
      {
        value: 'completion_desc',
        label: t('dashboard.analytics.table.sort.completionDesc'),
      },
      {
        value: 'completion_asc',
        label: t('dashboard.analytics.table.sort.completionAsc'),
      },
    ],
    [t]
  );

  const filteredRows = useMemo(() => {
    let result = rows;

    if (filter.groupId !== 'all') {
      result = result.filter((row) =>
        filter.groupId === null ? row.groupId === null : row.groupId === filter.groupId
      );
    }

    if (filter.query.trim()) {
      const keyword = filter.query.trim().toLowerCase();
      result = result.filter(
        (row) =>
          row.title.toLowerCase().includes(keyword) ||
          row.groupName.toLowerCase().includes(keyword)
      );
    }

    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (filter.sort) {
        case 'due_asc': {
          const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return aTime - bTime;
        }
        case 'due_desc': {
          const aTime = a.dueAt ? new Date(a.dueAt).getTime() : -Infinity;
          const bTime = b.dueAt ? new Date(b.dueAt).getTime() : -Infinity;
          return bTime - aTime;
        }
        case 'completion_asc': {
          return parseRate(a.completionRate) - parseRate(b.completionRate);
        }
        case 'completion_desc': {
          return parseRate(b.completionRate) - parseRate(a.completionRate);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [rows, filter]);

  const pagination = usePagination(filteredRows, { pageSize: defaultPageSize });

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilter((current) => ({ ...current, ...updates }));
    pagination.setPage(1);
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            {t('dashboard.analytics.table.title')}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('dashboard.analytics.table.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            value={filter.groupId === null ? 'null' : filter.groupId}
            onChange={(event) =>
              handleFilterChange({
                groupId:
                  event.target.value === 'all'
                    ? 'all'
                    : event.target.value === 'null'
                    ? null
                    : event.target.value,
              })
            }
          >
            {groupOptions.map((option) => (
              <option
                key={option.id === null ? 'null' : option.id}
                value={option.id === null ? 'null' : option.id}
              >
                {option.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            value={filter.sort}
            onChange={(event) =>
              handleFilterChange({ sort: event.target.value as TaskTableSort })
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="w-40 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
            placeholder={t('dashboard.analytics.table.searchPlaceholder')}
            value={filter.query}
            onChange={(event) => handleFilterChange({ query: event.target.value })}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3 text-left">{t('dashboard.analytics.table.columns.task')}</th>
              <th className="px-4 py-3 text-left">{t('dashboard.analytics.table.columns.group')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.assignments')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.completed')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.accepted')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.changes')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.overdue')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.dueReminders')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.overdueReminders')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.completionRate')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.acceptanceRate')}</th>
              <th className="px-4 py-3 text-right">{t('dashboard.analytics.table.columns.dueAt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pagination.paginatedItems.map((task) => (
              <tr key={task.taskId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  {task.groupName || t('dashboard.analytics.common.unassignedGroup')}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {numberFormatter.format(task.assignments)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {numberFormatter.format(task.completed)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {numberFormatter.format(task.accepted)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {numberFormatter.format(task.changes)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {numberFormatter.format(task.overdue)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  <div>{numberFormatter.format(task.dueReminders)}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('dashboard.analytics.table.reminders.pending', {
                      count: numberFormatter.format(task.pendingDue),
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  <div>{numberFormatter.format(task.overdueReminders)}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('dashboard.analytics.table.reminders.pending', {
                      count: numberFormatter.format(task.pendingOverdue),
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                  {task.completionRate}
                </td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                  {task.acceptanceRate}
                </td>
                <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">
                  {formatDate(task.dueAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3">
        <PaginationControls
          page={pagination.page}
          pageCount={pagination.pageCount}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setPage}
          pageSize={pagination.pageSize}
          onPageSizeChange={pagination.setPageSize}
          label={t('dashboard.analytics.table.paginationLabel')}
        />
      </div>
    </div>
  );
}
