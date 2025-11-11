import type { Session } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Assignment, AssignmentRow } from '../../types';
import { loadAssignmentsImpl, updateAssignmentStatusImpl } from './useAssignments';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../../lib/storage/offlineQueue', () => ({
  enqueueAssignmentStatusJob: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from '../../lib/supabaseClient';
import { enqueueAssignmentStatusJob } from '../../lib/storage/offlineQueue';

const supabaseMock = vi.mocked(supabase);
const enqueueJobMock = vi.mocked(enqueueAssignmentStatusJob);

const buildAssignmentRow = (overrides: Partial<AssignmentRow> = {}): AssignmentRow => ({
  id: 'assignment-1',
  task_id: 'task-1',
  status: 'sent',
  created_at: '2024-01-01T00:00:00.000Z',
  received_at: null,
  completed_at: null,
  completion_note: null,
  review_status: 'pending',
  review_note: null,
  reviewed_at: null,
  reviewed_by: null,
  tasks: {
    id: 'task-1',
    title: 'Sample task',
    description: null,
    due_at: null,
    group_id: null,
    organization_id: null,
    require_attachment: false,
    groups: { id: 'group-1', name: 'Group' },
    organizations: { id: 'org-1', name: 'Org' },
  },
  ...overrides,
});

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
    title: 'Sample task',
    description: null,
    dueAt: null,
    groupId: null,
    groupName: null,
    organizationId: null,
    organizationName: null,
    requireAttachment: false,
    checklist: [],
  },
  ...overrides,
});

const createSelectBuilder = (response: { data: AssignmentRow[] | null; error: { message: string } | null }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue(response),
});

const createUpdateBuilder = (response: { error: { message: string } | null }) => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue(response),
});

const session = {
  user: { id: 'user-1' },
} as unknown as Session;

describe('useAssignments helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseDeps = () => ({
    session,
    supabaseClient: supabaseMock as unknown as typeof supabase,
    resetStore: vi.fn(),
    setLoading: vi.fn(),
    setRefreshing: vi.fn(),
    setStoreError: vi.fn(),
    setAssignments: vi.fn(),
  });

  it('loads assignments from Supabase', async () => {
    const builder = createSelectBuilder({ data: [buildAssignmentRow()], error: null });
    supabaseMock.from.mockReturnValue(builder as never);
    const deps = baseDeps();

    await loadAssignmentsImpl(deps);

    expect(deps.setAssignments).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'assignment-1' })]),
      expect.objectContaining({ syncedAt: expect.any(String) })
    );
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    expect(builder.eq).toHaveBeenCalledWith('assignee_id', 'user-1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('records errors when Supabase query fails', async () => {
    const builder = createSelectBuilder({ data: null, error: { message: 'boom' } });
    supabaseMock.from.mockReturnValue(builder as never);
    const deps = baseDeps();

    await loadAssignmentsImpl(deps);

    expect(deps.setStoreError).toHaveBeenCalledWith('boom');
    expect(deps.setAssignments).not.toHaveBeenCalled();
  });

  it('updates assignment status when Supabase succeeds', async () => {
    const updateBuilder = createUpdateBuilder({ error: null });
    supabaseMock.from.mockReturnValue(updateBuilder as never);

    const updateAssignmentInStore = vi.fn();
    await updateAssignmentStatusImpl(
      {
        assignments: [buildAssignment()],
        supabaseClient: supabaseMock as unknown as typeof supabase,
        updateAssignmentInStore,
        enqueueJob: enqueueJobMock,
      },
      'assignment-1',
      'completed',
      { completionNote: 'Done' }
    );

    expect(updateAssignmentInStore).toHaveBeenCalled();
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'assignment-1');
    expect(enqueueJobMock).not.toHaveBeenCalled();
  });

  it('enqueues offline job when Supabase update fails', async () => {
    const updateBuilder = createUpdateBuilder({ error: { message: 'network down' } });
    supabaseMock.from.mockReturnValue(updateBuilder as never);

    await updateAssignmentStatusImpl(
      {
        assignments: [buildAssignment()],
        supabaseClient: supabaseMock as unknown as typeof supabase,
        updateAssignmentInStore: vi.fn(),
        enqueueJob: enqueueJobMock,
      },
      'assignment-1',
      'completed'
    );

    expect(enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 'assignment-1',
        summary: expect.objectContaining({ nextStatus: 'completed' }),
      })
    );
  });
});
