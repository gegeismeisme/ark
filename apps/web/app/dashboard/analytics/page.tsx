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
const ANALYTICS_QUERY_LIMIT = 500;
const ROW_INCREMENT = 50;

const formatPercent = (part: number, total: number) => {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

export default function AnalyticsPage() {
  const { activeOrg, user, organizationsLoading } = useOrgContext();
  const orgId = activeOrg?.id ?? null;
  const userId = user?.id ?? null;
  const canViewAll = activeOrg ? ['owner', 'admin'].includes(activeOrg.role) : false;

  const t = useTranslations();
  const locale = useLocale();

  const defaultTaskTitle = t('dashboard.analytics.defaults.taskTitle');
  const defaultGroupName = t('dashboard.analytics.defaults.groupName');

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [taskMeta, setTaskMeta] = useState<Record<string, TaskMeta>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowedGroupsError, setAllowedGroupsError] = useState<string | null>(null);
  const [visibleRowLimit, setVisibleRowLimit] = useState(ROW_INCREMENT);

  useEffect(() => {
    setVisibleRowLimit(ROW_INCREMENT);
  }, [orgId]);

  const loadAllowedGroups = useCallback(async () => {
    if (!orgId || !userId || canViewAll) {
      setAllowedGroupsError(null);
      return [];
    }

    const { data, error: groupError } = await supabase
      .from('group_members')
      .select('group_id, groups!inner(id, organization_id)')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .is('removed_at', null)
      .eq('groups.organization_id', orgId);

    if (groupError) {
      setAllowedGroupsError(groupError.message);
      return [];
    }

    const ids =
      (data ?? [])
        .map((row) => row.group_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0) ?? [];
    setAllowedGroupsError(null);
    return ids;
  }, [canViewAll, orgId, userId]);

  const fetchTaskMeta = useCallback(
    async (rows: SummaryRow[]) => {
      if (!orgId) return {};
      const taskIds = Array.from(
        new Set(
          rows
            .map((row) => row.task_id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
        )
      );
      if (taskIds.length === 0) {
        return {};
      }

      const chunkSize = 100;
      const chunkPromises = [];
      for (let index = 0; index < taskIds.length; index += chunkSize) {
        const chunk = taskIds.slice(index, index + chunkSize);
        chunkPromises.push(
          supabase
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
            .in('id', chunk)
            .is('archived_at', null)
        );
      }

      const results = await Promise.all(chunkPromises);
      const meta: Record<string, TaskMeta> = {};
      for (const result of results) {
        if (result.error) {
          throw result.error;
        }
        (result.data ?? []).forEach((task) => {
          const groupValue = Array.isArray(task.groups)
            ? task.groups[0] ?? null
            : task.groups ?? null;
          meta[task.id] = {
            title: task.title?.trim() || defaultTaskTitle,
            dueAt: task.due_at,
            groupId: task.group_id,
            groupName: groupValue?.name ?? defaultGroupName,
          };
        });
      }
      return meta;
    },
    [defaultGroupName, defaultTaskTitle, orgId],
  );

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

    const summaryQuery = supabase
      .from('task_assignment_summary')
      .select('*')
      .eq('organization_id', orgId)
      .order('assignment_count', { ascending: false, nullsLast: true })
      .limit(ANALYTICS_QUERY_LIMIT);

    (async () => {
      try {
        const [allowedIds, summaryResult] = await Promise.all([
          canViewAll ? Promise.resolve<string[]>([]) : loadAllowedGroups(),
          summaryQuery,
        ]);

        if (cancelled) return;

        const { data: summaryData, error: summaryError } = summaryResult;
        if (summaryError) {
          setSummaryRows([]);
          setTaskMeta({});
          setError(summaryError.message);
          setLoading(false);
          return;
        }

        const allowedSet = canViewAll ? null : new Set(allowedIds);
        if (!canViewAll && (!allowedSet || allowedSet.size === 0)) {
          setSummaryRows([]);
          setTaskMeta({});
          setError(null);
          setLoading(false);
          return;
        }

        const filteredSummary = (summaryData ?? []).filter((row) =>
          canViewAll ? true : Boolean(row.group_id) && allowedSet?.has(row.group_id as string),
        );

        try {
          const taskMetaMap = await fetchTaskMeta(filteredSummary);
          if (cancelled) return;
          setSummaryRows(filteredSummary);
          setTaskMeta(taskMetaMap);
          setError(null);
          setLoading(false);
        } catch (metaError) {
          if (cancelled) return;
          setSummaryRows(filteredSummary);
          setTaskMeta({});
          setError(metaError instanceof Error ? metaError.message : String(metaError));
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        setSummaryRows([]);
        setTaskMeta({});
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    canViewAll,
    fetchTaskMeta,
    loadAllowedGroups,
    orgId,
  ]);

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

  const paginatedTaskRows = useMemo(
    () => taskRows.slice(0, visibleRowLimit),
    [taskRows, visibleRowLimit]
  );
  const hasMoreRows = taskRows.length > visibleRowLimit;

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
      {allowedGroupsError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {allowedGroupsError}
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
        <div className="space-y-10">
          <section
            id="summary"
            aria-labelledby="analytics-summary-heading"
            className="space-y-4 scroll-mt-24"
          >
            <div>
              <h2
                id="analytics-summary-heading"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {t('dashboard.analytics.sections.summary.title')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('dashboard.analytics.sections.summary.body')}
              </p>
            </div>
            <SummaryCards totals={totals} metrics={summaryMetrics} />
          </section>

          <section
            id="execution"
            aria-labelledby="analytics-execution-heading"
            className="space-y-4 scroll-mt-24"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="analytics-execution-heading"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {t('dashboard.analytics.sections.execution.title')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('dashboard.analytics.sections.execution.body')}
              </p>
            </div>
            <TaskExecutionTable
              rows={paginatedTaskRows}
              groups={groupOptions}
              formatDate={formatDate}
            />
            {hasMoreRows ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => setVisibleRowLimit((prev) => prev + ROW_INCREMENT)}
                >
                  {t('dashboard.analytics.loadMore')}
                </button>
              </div>
            ) : null}
          </section>

          <section
            id="groups"
            aria-labelledby="analytics-groups-heading"
            className="space-y-4 scroll-mt-24"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="analytics-groups-heading"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {t('dashboard.analytics.sections.groups.title')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('dashboard.analytics.sections.groups.body')}
              </p>
            </div>
            <GroupOverviewList rows={groupRows} />
          </section>
        </div>
      )}
    </div>
  );
}

