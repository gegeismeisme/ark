'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readCacheSnapshot, writeCacheSnapshot } from '@/lib/cache/local-db';
import type { TaskItem, TaskSummaryRow } from '../../types';
import { useTranslations } from '@/lib/i18n/client';

type UseTasksArgs = {
  supabase: SupabaseClient;
  orgId: string | null;
  selectedGroupId: string | null;
};

type UseTasksResult = {
  list: TaskItem[];
  loading: boolean;
  error: string | null;
  refresh: (groupId?: string | null) => Promise<void>;
  assignmentSummary: (taskId: string) => string;
  deleteTasks: (taskIds: string[]) => Promise<void>;
};

type TaskSummaryMap = Record<string, TaskSummaryRow>;
type TaskSnapshot = {
  tasks: TaskItem[];
  summaries: TaskSummaryMap;
};

export function useTasksState({ supabase, orgId, selectedGroupId }: UseTasksArgs): UseTasksResult {
  const t = useTranslations();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<TaskSummaryMap>({});
  const orgRef = useRef<string | null>(orgId);
  const groupRef = useRef<string | null>(selectedGroupId);

  useEffect(() => {
    orgRef.current = orgId;
  }, [orgId]);

  useEffect(() => {
    groupRef.current = selectedGroupId;
  }, [selectedGroupId]);

  const refresh = useCallback(
    async (groupIdParam?: string | null) => {
      const groupId = groupIdParam ?? selectedGroupId;
      if (!orgId || !groupId) {
        setTasks([]);
        setSummaries({});
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const targetOrgId = orgId;
      const targetGroupId = groupId;
      void readCacheSnapshot<Record<string, TaskSnapshot>>('taskList', targetOrgId).then(
        (cached) => {
          const snapshot = cached?.[targetGroupId];
          if (snapshot && orgRef.current === targetOrgId && groupRef.current === targetGroupId) {
            setTasks(snapshot.tasks);
            setSummaries(snapshot.summaries);
          }
        },
      );

      const { data: taskRows, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
            id,
            group_id,
            title,
            description,
            due_at,
            created_at,
            require_attachment,
            task_assignments(assignee_id, status)
          `
        )
        .eq('organization_id', orgId)
        .eq('group_id', groupId)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (orgRef.current !== targetOrgId || groupRef.current !== targetGroupId) {
        return;
      }

      if (taskError) {
        setTasks([]);
        setSummaries({});
        setLoading(false);
        setError(taskError.message);
        return;
      }

      const mapped = (taskRows ?? []) as TaskItem[];
      setTasks(mapped);

      const taskIds = mapped.map((task) => task.id);
      if (taskIds.length === 0) {
        setSummaries({});
        setLoading(false);
        return;
      }

      const { data: summaryRows, error: summaryError } = await supabase
        .from('task_assignment_summary')
        .select(
          'task_id, assignment_count, completed_count, accepted_count, changes_requested_count, overdue_count'
        )
        .in('task_id', taskIds);

      if (summaryError) {
        console.error('[tasks] fetch summary failed:', summaryError);
        setSummaries({});
        setLoading(false);
        return;
      }

      const summaryMap: TaskSummaryMap = {};
      (summaryRows ?? []).forEach((row) => {
        summaryMap[row.task_id] = row as TaskSummaryRow;
      });
      setSummaries(summaryMap);
      setLoading(false);
      void (async () => {
        const existing =
          (await readCacheSnapshot<Record<string, TaskSnapshot>>('taskList', targetOrgId)) ?? {};
        existing[targetGroupId] = { tasks: mapped, summaries: summaryMap };
        await writeCacheSnapshot('taskList', existing, targetOrgId);
      })();
    },
    [orgId, selectedGroupId, supabase]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const assignmentSummary = useCallback(
    (taskId: string) => {
      const summary = summaries[taskId];
      if (!summary || summary.assignment_count === 0) {
        return t('dashboard.tasks.summary.noneAssigned');
      }
      const {
        assignment_count,
        completed_count,
        accepted_count,
        changes_requested_count,
        overdue_count,
      } = summary;
      const parts = [
        t('dashboard.tasks.summary.completed', {
          completed: completed_count,
          total: assignment_count,
        }),
        t('dashboard.tasks.summary.accepted', {
          accepted: accepted_count,
          total: assignment_count,
        }),
      ];
      if (changes_requested_count > 0) {
        parts.push(
          t('dashboard.tasks.summary.changesRequested', {
            count: changes_requested_count,
          })
        );
      }
      if (overdue_count > 0) {
        parts.push(t('dashboard.tasks.summary.overdue', { count: overdue_count }));
      }
      return parts.join(' · ');
    },
    [summaries, t]
  );

  const deleteTasks = useCallback(
    async (taskIds: string[]) => {
      if (!taskIds.length) return;
      const now = new Date().toISOString();
      const { error: archiveError } = await supabase
        .from('tasks')
        .update({ archived_at: now })
        .in('id', taskIds);

      if (archiveError) {
        setError(archiveError.message);
        return;
      }

      await refresh();
    },
    [refresh, supabase]
  );

  return {
    list: tasks,
    loading,
    error,
    refresh,
    assignmentSummary,
    deleteTasks,
  };
}
