'use client';

import { useMemo, useState } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';

export type GroupOverviewRow = {
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
};

type GroupOverviewListProps = {
  rows: GroupOverviewRow[];
  defaultPageSize?: number;
};

const UNASSIGNED_KEY = '__unassigned__';

export function GroupOverviewList({
  rows,
  defaultPageSize = 10,
}: GroupOverviewListProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [query, setQuery] = useState('');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale]
  );

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) => row.groupName.toLowerCase().includes(keyword));
  }, [rows, query]);

  const pagination = usePagination(filteredRows, { pageSize: defaultPageSize });

  const unassignedLabel = t('dashboard.analytics.common.unassignedGroup');

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200 sm:flex-row sm:items-center sm:justify-between">
        <span>{t('dashboard.analytics.groups.heading')}</span>
        <input
          className="w-full max-w-xs rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
          placeholder={t('dashboard.analytics.groups.searchPlaceholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            pagination.setPage(1);
          }}
        />
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {pagination.paginatedItems.map((group) => {
          const groupName = group.groupName || unassignedLabel;
          const completionRate = group.assignments
            ? percentFormatter.format(group.completed / group.assignments)
            : percentFormatter.format(0);

          return (
            <div key={group.groupId ?? UNASSIGNED_KEY} className="px-4 py-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{groupName}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {t('dashboard.analytics.groups.statsLine', {
                      assignments: numberFormatter.format(group.assignments),
                      completed: numberFormatter.format(group.completed),
                      accepted: numberFormatter.format(group.accepted),
                    })}
                  </div>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t('dashboard.analytics.groups.completionRate', { rate: completionRate })}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {t('dashboard.analytics.groups.adjustments', {
                    changes: numberFormatter.format(group.changes),
                    overdue: numberFormatter.format(group.overdue),
                  })}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {t('dashboard.analytics.groups.reminders.due', {
                    sent: numberFormatter.format(group.dueReminders),
                    pending: numberFormatter.format(group.pendingDue),
                  })}
                </span>
                <span>
                  {t('dashboard.analytics.groups.reminders.overdue', {
                    sent: numberFormatter.format(group.overdueReminders),
                    pending: numberFormatter.format(group.pendingOverdue),
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {pagination.totalItems === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t('dashboard.analytics.groups.empty')}
          </div>
        ) : null}
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
          label={t('dashboard.analytics.groups.paginationLabel')}
        />
      </div>
    </div>
  );
}
