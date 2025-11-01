'use client';

import { useCallback, useEffect, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { TaskItem, TaskSummaryRow } from '../../types';

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
};

type TaskSummaryMap = Record<string, TaskSummaryRow>;

export function useTasksState({ supabase, orgId, selectedGroupId }: UseTasksArgs): UseTasksResult {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<TaskSummaryMap>({});

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

      const { data: taskRows, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
            id,
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
        return '未指派成员';
      }
      const {
        assignment_count,
        completed_count,
        accepted_count,
        changes_requested_count,
        overdue_count,
      } = summary;
      const parts = [
        `完成 ${completed_count}/${assignment_count}`,
        `验收 ${accepted_count}/${assignment_count}`,
      ];
      if (changes_requested_count > 0) {
        parts.push(`待调整 ${changes_requested_count}`);
      }
      if (overdue_count > 0) {
        parts.push(`逾期 ${overdue_count}`);
      }
      return parts.join(' · ');
    },
    [summaries]
  );

  return {
    list: tasks,
    loading,
    error,
    refresh,
    assignmentSummary,
  };
}
