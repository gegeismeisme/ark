'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { useOrgContext } from '../../org-provider';
import type { Assignment, AssignmentRow, AssignmentStatus } from '../types';

export type UseMyAssignmentsResult = {
  assignments: Assignment[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  orgId: string | null;
  orgName: string | null;
  userId: string | null;
  refresh: () => Promise<void>;
  updateStatus: (
    assignmentId: string,
    nextStatus: AssignmentStatus,
    options?: { completionNote?: string | null }
  ) => Promise<boolean>;
  updatingIds: string[];
};

function extractTask(row: AssignmentRow): Assignment['task'] {
  const raw = row.tasks;
  const task = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  if (!task) return null;
  const groupRaw = task.groups;
  const group = Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.due_at,
    groupId: task.group_id,
    groupName: group?.name ?? null,
    requireAttachment: Boolean(task.require_attachment),
  };
}

export function useMyAssignments(): UseMyAssignmentsResult {
  const { activeOrg, user } = useOrgContext();
  const orgId = activeOrg?.id ?? null;
  const orgName = activeOrg?.name ?? null;
  const userId = user?.id ?? null;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const loadAssignments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orgId || !userId) {
        setAssignments([]);
        setError(null);
        setLastSyncedAt(null);
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
            tasks!inner(
              id,
              title,
              description,
              due_at,
              group_id,
              require_attachment,
              groups(id, name)
            )
          `
        )
        .eq('assignee_id', userId)
        .eq('tasks.organization_id', orgId)
        .is('tasks.archived_at', null)
        .order('tasks.due_at', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false });

      if (queryError) {
        setAssignments([]);
        setError(queryError.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const rows = (data ?? []) as AssignmentRow[];
      const mapped: Assignment[] = rows.map((row) => ({
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
        task: extractTask(row),
      }));

      setAssignments(mapped);
      setLastSyncedAt(new Date().toISOString());
      setLoading(false);
      setRefreshing(false);
    },
    [orgId, userId]
  );

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAssignments({ silent: true });
  }, [loadAssignments]);

  const updateStatus = useCallback(
    async (
      assignmentId: string,
      nextStatus: AssignmentStatus,
      options?: { completionNote?: string | null }
    ) => {
      const target = assignments.find((assignment) => assignment.id === assignmentId);
      if (!target) return false;

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (target.status !== nextStatus) {
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

      if (options && Object.prototype.hasOwnProperty.call(options, 'completionNote')) {
        updates.completion_note = options.completionNote ?? null;
      }

      if (Object.keys(updates).length === 1 && !updates.hasOwnProperty('completion_note')) {
        return true;
      }

      setUpdatingIds((prev) => new Set(prev).add(assignmentId));

      const { error: updateError } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', assignmentId);

      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });

      if (updateError) {
        return false;
      }

      setAssignments((prev) =>
        prev.map((assignment) => {
          if (assignment.id !== assignmentId) return assignment;
          return {
            ...assignment,
            status: (updates.status as AssignmentStatus) ?? assignment.status,
            receivedAt:
              updates.received_at !== undefined
                ? (updates.received_at as string | null)
                : assignment.receivedAt,
            completedAt:
              updates.completed_at !== undefined
                ? (updates.completed_at as string | null)
                : assignment.completedAt,
            completionNote:
              updates.hasOwnProperty('completion_note')
                ? ((updates.completion_note as string | null) ?? null)
                : assignment.completionNote,
          };
        })
      );

      return true;
    },
    [assignments]
  );

  const memoUpdatingIds = useMemo(() => Array.from(updatingIds), [updatingIds]);

  return {
    assignments,
    loading,
    refreshing,
    error,
    lastSyncedAt,
    orgId,
    orgName,
    userId,
    refresh,
    updateStatus,
    updatingIds: memoUpdatingIds,
  };
}
