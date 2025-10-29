'use client';

import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../../../lib/supabaseClient';
import { useOrgContext } from '../org-provider';

type SummaryRow = {
  task_id: string;
  organization_id: string | null;
  group_id: string | null;
  assignment_count: number;
  completed_count: number;
  accepted_count: number;
  changes_requested_count: number;
  overdue_count: number;
  earliest_due_at: string | null;
  latest_completion_at: string | null;
};

type TaskRow = {
  id: string;
  title: string | null;
  due_at: string | null;
  group_id: string | null;
  groups:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type TaskMeta = {
  title: string;
  dueAt: string | null;
  groupId: string | null;
  groupName: string | null;
};

type Totals = {
  assignments: number;
  completed: number;
  accepted: number;
  changes: number;
  overdue: number;
};

const UNASSIGNED_KEY = '__unassigned__';

const formatPercent = (part: number, total: number) => {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

export default function AnalyticsPage() {
  const { activeOrg, organizationsLoading } = useOrgContext();
  const orgId = activeOrg?.id ?? null;

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [taskMeta, setTaskMeta] = useState<Record<string, TaskMeta>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setSummaryRows([]);
      setTaskMeta({});
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data: summaryData, error: summaryError } = await supabase
        .from('task_assignment_summary')
        .select('*')
        .eq('organization_id', orgId);

      if (cancelled) return;

      if (summaryError) {
        setSummaryRows([]);
        setTaskMeta({});
        setError(summaryError.message);
        setLoading(false);
        return;
      }

      const rows = (summaryData ?? []) as SummaryRow[];
      setSummaryRows(rows);

      if (!rows.length) {
        setTaskMeta({});
        setLoading(false);
        return;
      }

      const taskIds = Array.from(new Set(rows.map((row) => row.task_id)));
      if (!taskIds.length) {
        setTaskMeta({});
        setLoading(false);
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, due_at, group_id, groups(id, name)')
        .in('id', taskIds);

      if (cancelled) return;

      if (taskError) {
        setTaskMeta({});
        setError(taskError.message);
        setLoading(false);
        return;
      }

      const meta = (taskData ?? []).reduce<Record<string, TaskMeta>>((acc, task) => {
        const row = task as TaskRow;
        const groupRaw = row.groups;
        const group =
          Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;
        acc[row.id] = {
          title: row.title ?? '未命名任务',
          dueAt: row.due_at,
          groupId: row.group_id,
          groupName: group?.name ?? (row.group_id ? '未命名小组' : null),
        };
        return acc;
      }, {});

      setTaskMeta(meta);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const totals = useMemo<Totals>(() => {
    return summaryRows.reduce<Totals>(
      (acc, row) => ({
        assignments: acc.assignments + row.assignment_count,
        completed: acc.completed + row.completed_count,
        accepted: acc.accepted + row.accepted_count,
        changes: acc.changes + row.changes_requested_count,
        overdue: acc.overdue + row.overdue_count,
      }),
      { assignments: 0, completed: 0, accepted: 0, changes: 0, overdue: 0 }
    );
  }, [summaryRows]);

  const taskTable = useMemo(() => {
    return summaryRows
      .map((row) => {
        const meta = taskMeta[row.task_id];
        const completionRate = formatPercent(row.completed_count, row.assignment_count);
        const acceptanceRate = formatPercent(row.accepted_count, row.completed_count);
        return {
          taskId: row.task_id,
          title: meta?.title ?? '未命名任务',
          groupName: meta?.groupName ?? '未分组',
          dueAt: meta?.dueAt ?? row.earliest_due_at ?? null,
          assignments: row.assignment_count,
          completed: row.completed_count,
          accepted: row.accepted_count,
          changes: row.changes_requested_count,
          overdue: row.overdue_count,
          completionRate,
          acceptanceRate,
        };
      })
      .sort((a, b) => b.assignments - a.assignments);
  }, [summaryRows, taskMeta]);

  const groupAggregation = useMemo(() => {
    const map = new Map<
      string,
      {
        groupId: string | null;
        groupName: string;
        assignments: number;
        completed: number;
        accepted: number;
        changes: number;
        overdue: number;
      }
    >();

    summaryRows.forEach((row) => {
      const meta = taskMeta[row.task_id];
      const groupId = meta?.groupId ?? row.group_id;
      const key = groupId ?? UNASSIGNED_KEY;
      const current = map.get(key) ?? {
        groupId: groupId ?? null,
        groupName: meta?.groupName ?? '未分组',
        assignments: 0,
        completed: 0,
        accepted: 0,
        changes: 0,
        overdue: 0,
      };
      current.assignments += row.assignment_count;
      current.completed += row.completed_count;
      current.accepted += row.accepted_count;
      current.changes += row.changes_requested_count;
      current.overdue += row.overdue_count;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.assignments - a.assignments);
  }, [summaryRows, taskMeta]);

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">任务分析</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">任务分析</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未选择组织，请先在导航栏中选择目标组织后再查看分析报表。
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: '活跃任务',
      value: summaryRows.length.toLocaleString('zh-CN'),
      description: '正在跟踪的任务总数',
    },
    {
      label: '指派总数',
      value: totals.assignments.toLocaleString('zh-CN'),
      description: '所有任务对应的成员指派数量',
    },
    {
      label: '完成率',
      value: formatPercent(totals.completed, totals.assignments),
      description: `${totals.completed.toLocaleString('zh-CN')} 条指派已标记完成`,
    },
    {
      label: '验收通过率',
      value: formatPercent(totals.accepted, totals.completed),
      description: `${totals.accepted.toLocaleString('zh-CN')} 条完成任务已通过验收`,
    },
    {
      label: '逾期指派',
      value: totals.overdue.toLocaleString('zh-CN'),
      description: '超过截止时间未通过验收的指派',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">任务分析</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            基于 task_assignment_summary 视图汇总指派数据，快速了解任务执行与验收情况。
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          数据加载出现问题：{error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在汇总任务数据...
        </div>
      ) : summaryRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          当前组织暂未创建任务或暂无指派记录。请先在任务中心创建任务后再查看此处统计。
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {metric.value}
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{metric.description}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                任务执行明细
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3 text-left">任务</th>
                      <th className="px-4 py-3 text-left">小组</th>
                      <th className="px-4 py-3 text-right">指派</th>
                      <th className="px-4 py-3 text-right">完成</th>
                      <th className="px-4 py-3 text-right">验收</th>
                      <th className="px-4 py-3 text-right">调整</th>
                      <th className="px-4 py-3 text-right">逾期</th>
                      <th className="px-4 py-3 text-right">完成率</th>
                      <th className="px-4 py-3 text-right">验收率</th>
                      <th className="px-4 py-3 text-right">截止</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {taskTable.map((task) => (
                      <tr key={task.taskId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {task.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {task.groupName}
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
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                小组维度概览
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {groupAggregation.map((group) => (
                  <div key={group.groupId ?? UNASSIGNED_KEY} className="px-4 py-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {group.groupName}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          指派 {group.assignments.toLocaleString('zh-CN')} · 完成{' '}
                          {group.completed.toLocaleString('zh-CN')} · 验收{' '}
                          {group.accepted.toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        完成率 {formatPercent(group.completed, group.assignments)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>需调整 {group.changes.toLocaleString('zh-CN')}</span>
                      <span>逾期 {group.overdue.toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
