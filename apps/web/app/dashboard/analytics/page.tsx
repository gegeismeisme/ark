'use client';

import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../../../lib/supabaseClient';
import { useOrgContext } from '../org-provider';
import {
  GroupOverviewList,
  SummaryCards,
  TaskExecutionRow,
  TaskExecutionTable,
  type GroupOverviewRow,
} from './components';

type SummaryRow = {
  task_id: string;
  organization_id: string | null;
  group_id: string | null;
  assignment_count: number;
  completed_count: number;
  accepted_count: number;
  changes_requested_count: number;
  overdue_count: number;
  due_reminder_count: number;
  overdue_reminder_count: number;
  pending_due_reminder_count: number;
  pending_overdue_reminder_count: number;
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
  dueReminders: number;
  overdueReminders: number;
  pendingDue: number;
  pendingOverdue: number;
};

const DEFAULT_TASK_TITLE = '未命名任务';
const DEFAULT_GROUP_NAME = '未分配小组';
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
    return value ?? '—';
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

      const taskIds = rows.map((row) => row.task_id);

      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, due_at, group_id, groups(id, name)')
        .in('id', taskIds);

      if (cancelled) return;

      const meta = (taskData ?? []).reduce<Record<string, TaskMeta>>((acc, row: TaskRow) => {
        const groups = Array.isArray(row.groups)
          ? row.groups
          : row.groups
          ? [row.groups]
          : [];
        const primaryGroup = groups[0] ?? null;
        acc[row.id] = {
          title: row.title ?? DEFAULT_TASK_TITLE,
          dueAt: row.due_at ?? null,
          groupId: primaryGroup?.id ?? null,
          groupName: primaryGroup?.name ?? DEFAULT_GROUP_NAME,
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
        dueReminders: acc.dueReminders + row.due_reminder_count,
        overdueReminders: acc.overdueReminders + row.overdue_reminder_count,
        pendingDue: acc.pendingDue + row.pending_due_reminder_count,
        pendingOverdue: acc.pendingOverdue + row.pending_overdue_reminder_count,
      }),
      {
        assignments: 0,
        completed: 0,
        accepted: 0,
        changes: 0,
        overdue: 0,
        dueReminders: 0,
        overdueReminders: 0,
        pendingDue: 0,
        pendingOverdue: 0,
      }
    );
  }, [summaryRows]);

  const taskRows = useMemo<TaskExecutionRow[]>(() => {
    return summaryRows
      .map((row) => {
        const meta = taskMeta[row.task_id];
        return {
          taskId: row.task_id,
          title: meta?.title ?? DEFAULT_TASK_TITLE,
          groupId: meta?.groupId ?? row.group_id ?? null,
          groupName: meta?.groupName ?? DEFAULT_GROUP_NAME,
          dueAt: meta?.dueAt ?? row.earliest_due_at ?? null,
          assignments: row.assignment_count,
          completed: row.completed_count,
          accepted: row.accepted_count,
          changes: row.changes_requested_count,
          overdue: row.overdue_count,
          dueReminders: row.due_reminder_count,
          overdueReminders: row.overdue_reminder_count,
          pendingDue: row.pending_due_reminder_count,
          pendingOverdue: row.pending_overdue_reminder_count,
          completionRate: formatPercent(row.completed_count, row.assignment_count),
          acceptanceRate: formatPercent(row.accepted_count, row.completed_count),
        };
      })
      .sort((a, b) => b.assignments - a.assignments);
  }, [summaryRows, taskMeta]);

  const groupRows = useMemo<GroupOverviewRow[]>(() => {
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
        dueReminders: number;
        overdueReminders: number;
        pendingDue: number;
        pendingOverdue: number;
      }
    >();

    summaryRows.forEach((row) => {
      const meta = taskMeta[row.task_id];
      const groupId = meta?.groupId ?? row.group_id;
      const key = groupId ?? UNASSIGNED_KEY;
      const current = map.get(key) ?? {
        groupId: groupId ?? null,
        groupName: meta?.groupName ?? DEFAULT_GROUP_NAME,
        assignments: 0,
        completed: 0,
        accepted: 0,
        changes: 0,
        overdue: 0,
        dueReminders: 0,
        overdueReminders: 0,
        pendingDue: 0,
        pendingOverdue: 0,
      };

      current.assignments += row.assignment_count;
      current.completed += row.completed_count;
      current.accepted += row.accepted_count;
      current.changes += row.changes_requested_count;
      current.overdue += row.overdue_count;
      current.dueReminders += row.due_reminder_count;
      current.overdueReminders += row.overdue_reminder_count;
      current.pendingDue += row.pending_due_reminder_count;
      current.pendingOverdue += row.pending_overdue_reminder_count;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.assignments - a.assignments);
  }, [summaryRows, taskMeta]);

  const groupOptions = useMemo(
    () =>
      Array.from(
        new Map(
          taskRows.map((row) => [
            row.groupId ?? UNASSIGNED_KEY,
            { id: row.groupId, name: row.groupName ?? DEFAULT_GROUP_NAME },
          ])
        ).values()
      ),
    [taskRows]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">数据分析</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">数据分析</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未选择组织，请先在顶部导航中选择或创建组织后再查看报表。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">数据分析</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          掌握任务派发、验收与提醒的关键指标，帮助你了解当前执行进度。
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载统计数据...
        </div>
      ) : summaryRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          暂无任务数据，开始派发任务后即可查看分析结果。
        </div>
      ) : (
        <div className="space-y-6">
          <SummaryCards totals={totals} />
          <TaskExecutionTable rows={taskRows} groups={groupOptions} formatDate={formatDate} />
          <GroupOverviewList rows={groupRows} />
        </div>
      )}
    </div>
  );
}
