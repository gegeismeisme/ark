import { beforeEach, describe, expect, it } from 'vitest';

import type { Assignment } from '../../types';
import { useTaskStore } from './taskStore';

const buildAssignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: 'assignment-1',
  taskId: 'task-1',
  status: 'sent',
  createdAt: '2024-01-01T00:00:00.000Z',
  receivedAt: null,
  completedAt: null,
  completionNote: null,
  reviewStatus: 'pending',
  reviewNote: null,
  reviewedAt: null,
  reviewedBy: null,
  task: {
    id: 'task-1',
    title: '示例任务',
    description: null,
    dueAt: null,
    groupId: null,
    groupName: null,
    organizationId: null,
    organizationName: null,
  },
  ...overrides,
});

describe('taskStore', () => {
  beforeEach(() => {
    useTaskStore.getState().reset();
  });

  it('initialises with empty state', () => {
    const state = useTaskStore.getState();
    expect(state.assignments).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.refreshing).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastSyncedAt).toBeNull();
  });

  it('sets assignments with synced timestamp', () => {
    const assignment = buildAssignment();
    const timestamp = '2024-02-01T00:00:00.000Z';

    useTaskStore.getState().setAssignments([assignment], { syncedAt: timestamp });

    const state = useTaskStore.getState();
    expect(state.assignments).toEqual([assignment]);
    expect(state.loading).toBe(false);
    expect(state.refreshing).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastSyncedAt).toBe(timestamp);
  });

  it('updates a single assignment immutably', () => {
    const assignment = buildAssignment();
    useTaskStore.getState().setAssignments([assignment]);

    useTaskStore.getState().updateAssignment('assignment-1', (current) => ({
      ...current,
      status: 'completed',
      completedAt: '2024-03-01T12:00:00.000Z',
    }));

    const state = useTaskStore.getState();
    expect(state.assignments).toHaveLength(1);
    expect(state.assignments[0]).toEqual({
      ...assignment,
      status: 'completed',
      completedAt: '2024-03-01T12:00:00.000Z',
    });
  });

  it('ignores updates when assignment id does not exist', () => {
    const assignment = buildAssignment();
    useTaskStore.getState().setAssignments([assignment]);

    useTaskStore.getState().updateAssignment('unknown', (current) => ({
      ...current,
      status: 'completed',
    }));

    const state = useTaskStore.getState();
    expect(state.assignments[0]).toEqual(assignment);
  });

  it('resets state to defaults', () => {
    const assignment = buildAssignment();
    useTaskStore.getState().setAssignments([assignment], { syncedAt: '2024-02-01T00:00:00.000Z' });
    useTaskStore.getState().setLoading(true);
    useTaskStore.getState().setError('出错了');

    useTaskStore.getState().reset();

    const state = useTaskStore.getState();
    expect(state.assignments).toEqual([]);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
