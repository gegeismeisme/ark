'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';

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

const UNASSIGNED_KEY = '__unassigned__';

const formatPercent = (part: number, total: number) => {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

export default function AnalyticsPage() {
  const { activeOrg, organizationsLoading } = useOrgContext();
  const orgId = activeOrg?.id ?? null;

  const t = useTranslations();
  const locale = useLocale();

  const defaultTaskTitle = t('dashboard.analytics.defaults.taskTitle');
  const defaultGroupName = t('dashboard.analytics.defaults.groupName');

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

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
            id,
            title,
            due_at,
            group_id,
            groups ( id, name )
          `
        )
        .eq('organization_id', orgId)
        .is('archived_at', null);

      if (cancelled) return;

      if (tasksError) {
        setSummaryRows(summaryData ?? []);
        setTaskMeta({});
        setError(tasksError.message);
        setLoading(false);
        return;
      }

      const meta = (tasksData ?? []).reduce<Record<string, TaskMeta>>((acc, task) => {
        const groupRaw = Array.isArray(task.groups)
          ? task.groups[0]
          : (task.groups as { id: string; name: string } | null);

        acc[task.id] = {
          title: task.title?.trim() || defaultTaskTitle,
          dueAt: task.due_at,
          groupId: task.group_id ?? groupRaw?.id ?? null,
          groupName: groupRaw?.name ?? defaultGroupName,
        };
        return acc;
      }, {});

      setSummaryRows(summaryData ?? []);
      setTaskMeta(meta);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultGroupName, defaultTaskTitle, orgId]);

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

  const summaryMetrics = useMemo(
    () => ({
      completionRate: totals.assignments ? totals.completed / totals.assignments : 0,
      acceptanceRate: totals.completed ? totals.accepted / totals.completed : 0,
      overdueRate: totals.changes ? totals.overdue / totals.changes : 0,
      reminderCoverage: totals.assignments
        ? (totals.dueReminders + totals.overdueReminders) / totals.assignments
        : 0,
      pendingReminders: totals.pendingDue + totals.pendingOverdue,
    }),
    [totals]
  );

  const taskRows = useMemo<TaskExecutionRow[]>(() => {
    return summaryRows
      .map((row) => {
        const meta = taskMeta[row.task_id];
        return {
          taskId: row.task_id,
          title: meta?.title ?? defaultTaskTitle,
          groupId: meta?.groupId ?? row.group_id,
          groupName: meta?.groupName ?? defaultGroupName,
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
          dueAt: meta?.dueAt ?? row.earliest_due_at,
        };
      })
      .sort((a, b) => b.assignments - a.assignments);
  }, [defaultGroupName, defaultTaskTitle, summaryRows, taskMeta]);

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
        groupName: meta?.groupName ?? defaultGroupName,
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
  }, [defaultGroupName, summaryRows, taskMeta]);

  const groupOptions = useMemo(
    () =>
      Array.from(
        new Map(
          taskRows.map((row) => [
            row.groupId ?? UNASSIGNED_KEY,
            { id: row.groupId, name: row.groupName ?? defaultGroupName },
          ])
        ).values()
      ),
    [defaultGroupName, taskRows]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [locale]
  );

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('common.notSet');
      try {
        return dateFormatter.format(new Date(value));
      } catch {
        return value ?? t('common.notSet');
      }
    },
    [dateFormatter, t]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.analytics.title')}
        </h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.analytics.loadingOrg')}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.analytics.title')}
        </h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.analytics.noOrg')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.analytics.title')}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t('dashboard.analytics.subtitle')}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.analytics.loadingData')}
        </div>
      ) : summaryRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.analytics.emptyState')}
        </div>
      ) : (
        <div className="space-y-6">
          <SummaryCards totals={totals} metrics={summaryMetrics} />
          <TaskExecutionTable
            rows={taskRows}
            groups={groupOptions}
            formatDate={formatDate}
          />
          <GroupOverviewList rows={groupRows} />
        </div>
      )}
    </div>
  );
}
