import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import type { Assignment, AssignmentRow, AssignmentStatus } from '../../types';

type UseAssignmentsResult = {
  assignments: Assignment[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loadAssignments: (options?: { silent?: boolean }) => Promise<void>;
  refreshAssignments: () => Promise<void>;
  updateAssignmentStatus: (
    assignmentId: string,
    nextStatus: AssignmentStatus,
    options?: { completionNote?: string | null }
  ) => Promise<boolean>;
};

export function useAssignments(session: Session | null): UseAssignmentsResult {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.user) {
        setAssignments([]);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      const { data, error: queryError } = await supabase
        .from('task_assignments')
        .select(
          `
            id,
            task_id,
            status,
            created_at,
            received_at,
            completed_at,
            completion_note,
            review_status,
            review_note,
            reviewed_at,
            reviewed_by,
            tasks (
              id,
              title,
              description,
              due_at,
              group_id,
              organization_id,
              groups ( id, name ),
              organizations ( id, name )
            )
          `
        )
        .eq('assignee_id', session.user.id)
        .order('created_at', { ascending: false });

      if (queryError) {
        setAssignments([]);
        setError(queryError.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const mapped =
        (data ?? []).map((row: AssignmentRow) => {
          const task = row.tasks;
          const groupRaw = task?.groups;
          const organizationRaw = task?.organizations;

          const group =
            Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;
          const organization =
            Array.isArray(organizationRaw)
              ? organizationRaw[0] ?? null
              : organizationRaw ?? null;

          return {
            id: row.id,
            taskId: row.task_id,
            status: row.status,
            createdAt: row.created_at,
            receivedAt: row.received_at,
            completedAt: row.completed_at,
            completionNote: row.completion_note,
            reviewStatus: row.review_status,
            reviewNote: row.review_note,
            reviewedAt: row.reviewed_at,
            reviewedBy: row.reviewed_by,
            task: task
              ? {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  dueAt: task.due_at,
                  groupId: task.group_id,
                  groupName: group?.name ?? null,
                  organizationId: task.organization_id,
                  organizationName: organization?.name ?? null,
                }
              : null,
          } satisfies Assignment;
        }) ?? [];

      setAssignments(mapped);
      setLoading(false);
      setRefreshing(false);
    },
    [session?.user]
  );

  const refreshAssignments = useCallback(async () => {
    setRefreshing(true);
    await loadAssignments({ silent: true });
  }, [loadAssignments]);

  const updateAssignmentStatus = useCallback(
    async (
      assignmentId: string,
      nextStatus: AssignmentStatus,
      options?: { completionNote?: string | null }
    ) => {
      const target = assignments.find((assignment) => assignment.id === assignmentId);
      if (!target) return false;

      const hasCompletionNote = Object.prototype.hasOwnProperty.call(options ?? {}, 'completionNote');
      const nextNote = hasCompletionNote
        ? options?.completionNote ?? null
        : target.completionNote ?? null;

      const statusChanged = target.status !== nextStatus;
      const noteChanged = nextNote !== (target.completionNote ?? null);

      if (!statusChanged && !noteChanged) {
        return true;
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (statusChanged) {
        updates.status = nextStatus;

        if (nextStatus === 'received') {
          updates.received_at = new Date().toISOString();
          updates.completed_at = null;
        } else if (nextStatus === 'completed') {
          updates.completed_at = new Date().toISOString();
        } else if (nextStatus === 'sent') {
          updates.received_at = null;
          updates.completed_at = null;
        }
      }

      if (noteChanged) {
        updates.completion_note = nextNote;
      }

      const { error: updateError } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (updateError) {
        Alert.alert('更新失败', updateError.message);
        return false;
      }

      setAssignments((prev) =>
        prev.map((assignment) => {
          if (assignment.id !== assignmentId) return assignment;

          const updated = { ...assignment };

          if (statusChanged) {
            updated.status = nextStatus;

            if (nextStatus === 'received') {
              updated.receivedAt = updates.received_at as string;
              updated.completedAt = null;
            } else if (nextStatus === 'completed') {
              updated.completedAt = updates.completed_at as string;
            } else if (nextStatus === 'sent') {
              updated.receivedAt = null;
              updated.completedAt = null;
            }
          }

          if (noteChanged) {
            updated.completionNote = nextNote;
          }

          return updated;
        })
      );

      return true;
    },
    [assignments]
  );

  return {
    assignments,
    loading,
    refreshing,
    error,
    loadAssignments,
    refreshAssignments,
    updateAssignmentStatus,
  };
}
