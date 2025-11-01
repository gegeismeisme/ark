import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import type { Assignment, AssignmentRow, AssignmentStatus } from '../../types';
import { useTaskStore } from './taskStore';

type UseAssignmentsResult = {
  assignments: Assignment[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  loadAssignments: (options?: { silent?: boolean }) => Promise<void>;
  refreshAssignments: () => Promise<void>;
  updateAssignmentStatus: (
    assignmentId: string,
    nextStatus: AssignmentStatus,
    options?: { completionNote?: string | null }
  ) => Promise<boolean>;
};

export function useAssignments(session: Session | null): UseAssignmentsResult {
  const assignments = useTaskStore((state) => state.assignments);
  const loading = useTaskStore((state) => state.loading);
  const refreshing = useTaskStore((state) => state.refreshing);
  const error = useTaskStore((state) => state.error);
  const lastSyncedAt = useTaskStore((state) => state.lastSyncedAt);
  const setLoading = useTaskStore((state) => state.setLoading);
  const setRefreshing = useTaskStore((state) => state.setRefreshing);
  const setStoreError = useTaskStore((state) => state.setError);
  const setAssignments = useTaskStore((state) => state.setAssignments);
  const updateAssignmentInStore = useTaskStore((state) => state.updateAssignment);
  const resetStore = useTaskStore((state) => state.reset);

  const loadAssignments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.user) {
        resetStore();
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }
      setStoreError(null);

      try {
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
          setStoreError(queryError.message);
          return;
        }

        const rows = (data ?? []) as AssignmentRow[];

        const mapped = rows.map((row) => {
          const taskRaw = row.tasks;
          const task = Array.isArray(taskRaw) ? taskRaw[0] ?? null : taskRaw ?? null;
          const groupRaw = task?.groups;
          const organizationRaw = task?.organizations;

          const group = Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;
          const organization = Array.isArray(organizationRaw)
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
        });

        setAssignments(mapped, { syncedAt: new Date().toISOString() });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resetStore, session?.user, setAssignments, setLoading, setRefreshing, setStoreError]
  );

  const refreshAssignments = useCallback(async () => {
    setRefreshing(true);
    await loadAssignments({ silent: true });
  }, [loadAssignments, setRefreshing]);

  const updateAssignmentStatus = useCallback(
    async (
      assignmentId: string,
      nextStatus: AssignmentStatus,
      options?: { completionNote?: string | null }
    ) => {
      const target = assignments.find((assignment) => assignment.id === assignmentId);
      if (!target) return false;

      const hasCompletionNote = Object.prototype.hasOwnProperty.call(
        options ?? {},
        'completionNote'
      );
      const nextNote = hasCompletionNote ? options?.completionNote ?? null : target.completionNote ?? null;

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

      updateAssignmentInStore(assignmentId, (assignment) => {
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
      });

      return true;
    },
    [assignments, updateAssignmentInStore]
  );

  return {
    assignments,
    loading,
    refreshing,
    error,
    lastSyncedAt,
    loadAssignments,
    refreshAssignments,
    updateAssignmentStatus,
  };
}
