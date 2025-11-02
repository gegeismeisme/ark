'use client';

import { useMemo, useState } from 'react';

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

const UNASSIGNED_LABEL = '未分配小组';

export function GroupOverviewList({
  rows,
  defaultPageSize = 10,
}: GroupOverviewListProps) {
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) => row.groupName.toLowerCase().includes(keyword));
  }, [rows, query]);

  const pagination = usePagination(filteredRows, { pageSize: defaultPageSize });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200 sm:flex-row sm:items-center sm:justify-between">
        <span>小组维度概览</span>
        <input
          className="w-full max-w-xs rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
          placeholder="搜索小组..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            pagination.setPage(1);
          }}
        />
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {pagination.paginatedItems.map((group) => (
          <div key={group.groupId ?? '__unassigned__'} className="px-4 py-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {group.groupName || UNASSIGNED_LABEL}
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  派发 {group.assignments.toLocaleString('zh-CN')} · 完成{' '}
                  {group.completed.toLocaleString('zh-CN')} · 验收{' '}
                  {group.accepted.toLocaleString('zh-CN')}
                </div>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                完成率{' '}
                {group.assignments
                  ? `${Math.round((group.completed / group.assignments) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>需调整 {group.changes.toLocaleString('zh-CN')}</span>
              <span>逾期 {group.overdue.toLocaleString('zh-CN')}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                到期提醒：已发 {group.dueReminders.toLocaleString('zh-CN')} · 待处理{' '}
                {group.pendingDue.toLocaleString('zh-CN')}
              </span>
              <span>
                逾期提醒：已发 {group.overdueReminders.toLocaleString('zh-CN')} · 待处理{' '}
                {group.pendingOverdue.toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        ))}

        {pagination.totalItems === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            暂无符合条件的小组数据。
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
          label="小组"
        />
      </div>
    </div>
  );
}
