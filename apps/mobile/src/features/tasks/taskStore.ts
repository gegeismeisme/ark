import { create } from 'zustand';

import type { Assignment } from '../../types';

type TaskStoreState = {
  assignments: Assignment[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
};

type TaskStoreActions = {
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
  setAssignments: (assignments: Assignment[], options?: { syncedAt?: string }) => void;
  updateAssignment: (
    assignmentId: string,
    updater: (previous: Assignment) => Assignment
  ) => void;
  reset: () => void;
};

type TaskStore = TaskStoreState & TaskStoreActions;

export const useTaskStore = create<TaskStore>((set) => ({
  assignments: [],
  loading: false,
  refreshing: false,
  error: null,
  lastSyncedAt: null,
  setLoading: (loading) => set({ loading }),
  setRefreshing: (refreshing) => set({ refreshing }),
  setError: (error) => set({ error }),
  setAssignments: (assignments, options) =>
    set({
      assignments,
      loading: false,
      refreshing: false,
      error: null,
      lastSyncedAt: options?.syncedAt ?? new Date().toISOString(),
    }),
  updateAssignment: (assignmentId, updater) =>
    set((state) => ({
      assignments: state.assignments.map((assignment) =>
        assignment.id === assignmentId ? updater(assignment) : assignment
      ),
    })),
  reset: () =>
    set({
      assignments: [],
      loading: false,
      refreshing: false,
      error: null,
      lastSyncedAt: null,
    }),
}));
