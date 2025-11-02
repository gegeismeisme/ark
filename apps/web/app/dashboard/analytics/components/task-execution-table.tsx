'use client';

import { useMemo, useState } from 'react';

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
  id: string | null;
  name: string;
};

type TaskExecutionTableProps = {
  rows: TaskExecutionRow[];
  groups: GroupOption[];
  formatDate: (value: string | null) => string;
  defaultPageSize?: number;
};

const UNASSIGNED_LABEL = '未分配小组';

const SORT_LABELS: Record<TaskTableSort, string> = {
  due_desc: '按截止时间（晚到早）',
  due_asc: '按截止时间（早到晚）',
  completion_desc: '按完成率（高到低）',
  completion_asc: '按完成率（低到高）',
};

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
  const [filter, setFilter] = useState<FilterState>({
    groupId: 'all',
    sort: 'due_desc',
    query: '',
  });

  const groupOptions = useMemo(() => {
    const base: GroupOption[] = [{ id: null, name: UNASSIGNED_LABEL }];
    const unique = new Map<string, GroupOption>();
    groups.forEach((group) => {
      if (group.id === null) {
        unique.set('__unassigned__', { id: null, name: UNASSIGNED_LABEL });
        return;
      }
      unique.set(group.id, { id: group.id, name: group.name });
    });

    return [
      { id: 'all', name: '全部任务' },
      ...Array.from(unique.values()),
      ...base.filter((item) => rows.some((row) => row.groupId === item.id)),
    ];
  }, [groups, rows]);

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
  }, [filter.groupId, filter.query, filter.sort, rows]);

  const pagination = usePagination(filteredRows, { pageSize: defaultPageSize });

  const handleFilterChange = (partial: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
    pagination.setPage(1);
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">任务执行概览</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            根据小组与完成情况筛选任务，支持按截止时间与完成率排序。
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
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="w-40 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
            placeholder="搜索任务 / 小组"
            value={filter.query}
            onChange={(event) => handleFilterChange({ query: event.target.value })}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3 text-left">任务</th>
              <th className="px-4 py-3 text-left">小组</th>
              <th className="px-4 py-3 text-right">派发</th>
              <th className="px-4 py-3 text-right">完成</th>
              <th className="px-4 py-3 text-right">验收</th>
              <th className="px-4 py-3 text-right">调整</th>
              <th className="px-4 py-3 text-right">逾期</th>
              <th className="px-4 py-3 text-right">到期提醒</th>
              <th className="px-4 py-3 text-right">逾期提醒</th>
              <th className="px-4 py-3 text-right">完成率</th>
              <th className="px-4 py-3 text-right">验收率</th>
              <th className="px-4 py-3 text-right">截止时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pagination.paginatedItems.map((task) => (
              <tr key={task.taskId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  {task.groupName || UNASSIGNED_LABEL}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {task.assignments.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {task.completed.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {task.accepted.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {task.changes.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  {task.overdue.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  <div>{task.dueReminders.toLocaleString('zh-CN')}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    待处理 {task.pendingDue.toLocaleString('zh-CN')}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">
                  <div>{task.overdueReminders.toLocaleString('zh-CN')}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    待处理 {task.pendingOverdue.toLocaleString('zh-CN')}
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
          label="任务执行记录"
        />
      </div>
    </div>
  );
}
