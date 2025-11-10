import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { mapAssignmentRow } from '@project-ark/shared';

import { t } from '../../i18n';
import { supabase } from '../../lib/supabaseClient';
import {
  enqueueAssignmentStatusJob,
  type AssignmentStatusJobPayload,
} from '../../lib/storage/offlineQueue';
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
                require_attachment,
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
        const mapped = rows.map(mapAssignmentRow);

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

      const { error: updateError } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (updateError) {
        const payload: AssignmentStatusJobPayload = {
          assignmentId,
          updates,
          summary: {
            nextStatus: statusChanged ? nextStatus : undefined,
            completionNote: noteChanged ? nextNote : undefined,
          },
          localAppliedAt: new Date().toISOString(),
        };
        await enqueueAssignmentStatusJob(payload);
        Alert.alert(t('task.actions.errorTitle'), t('task.queue.enqueued'));
      }

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
