import type { SupabaseClient } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AdminGroupRow,
  GroupMemberDetailRow,
  TaskAssignmentDetailRow,
  TaskAttachmentRow,
  TaskItem,
  TaskSummaryRow,
} from '../types';
import { useTaskDashboard } from './use-task-dashboard';

vi.mock('../../org-provider', () => ({
  useOrgContext: vi.fn(),
}));

import { useOrgContext } from '../../org-provider';

const useOrgContextMock = vi.mocked(useOrgContext);

type TagCategoryRow = {
  id: string;
  name: string;
  is_required: boolean;
  selection_type: string;
  group_id: string | null;
  groups: { id: string; name: string } | null;
  organization_tags: Array<{ id: string; name: string; is_active: boolean; category_id: string }>;
};

type AssignmentDetailRowWithTask = TaskAssignmentDetailRow & { task_id: string };

type InsertedTaskPayload = {
  organization_id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  due_at: string | null;
};

type AssignmentInsertPayload = {
  task_id: string;
  assignee_id: string;
  status: string;
};

type ReviewUpdatePayload = {
  review_status: 'accepted' | 'changes_requested';
  review_note: string | null;
  reviewed_at: string;
  reviewed_by: string | null;
};

class SupabaseStub {
  groupRows: AdminGroupRow[] = [
    {
      group_id: 'group-1',
      groups: { id: 'group-1', name: '示例小组' },
    },
  ];

  tagCategories: TagCategoryRow[] = [
    {
      id: 'cat-1',
      name: '角色',
      is_required: false,
      selection_type: 'single',
      group_id: null,
      groups: null,
      organization_tags: [
        { id: 'tag-1', name: '老师', is_active: true, category_id: 'cat-1' },
        { id: 'tag-2', name: '班主任', is_active: true, category_id: 'cat-1' },
      ],
    },
  ];

  groupMemberDetails: GroupMemberDetailRow[] = [
    {
      id: 'gm-1',
      group_id: 'group-1',
      organization_id: 'org-1',
      user_id: 'user-1',
      role: 'admin',
      status: 'active',
      added_at: '2024-01-01T00:00:00.000Z',
      full_name: '张老师',
      organization_role: 'owner',
    },
    {
      id: 'gm-2',
      group_id: 'group-1',
      organization_id: 'org-1',
      user_id: 'user-2',
      role: 'member',
      status: 'active',
      added_at: '2024-01-02T00:00:00.000Z',
      full_name: '李班主任',
      organization_role: 'member',
    },
  ];

  orgMembershipRows: Array<{ id: string; user_id: string }> = [
    { id: 'om-1', user_id: 'user-1' },
    { id: 'om-2', user_id: 'user-2' },
  ];

  memberTagRows: Array<{ member_id: string; tag_id: string }> = [
    { member_id: 'om-1', tag_id: 'tag-1' },
    { member_id: 'om-2', tag_id: 'tag-2' },
  ];

  tasksRows: TaskItem[] = [
    {
      id: 'task-1',
      title: '现有任务',
      description: '已有说明',
      due_at: '2024-02-01T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
      task_assignments: null,
      require_attachment: true,
    },
  ];

  taskAttachments: TaskAttachmentRow[] = [
    {
      id: 'att-1',
      task_id: 'task-1',
      organization_id: 'org-1',
      uploaded_by: 'user-1',
      file_name: '计划.pdf',
      file_path: 'org/org-1/task/task-1/计划.pdf',
      content_type: 'application/pdf',
      size_bytes: 2048,
      uploaded_at: '2024-01-03T00:00:00.000Z',
    },
  ];

  taskSummaryRows: TaskSummaryRow[] = [
    {
      task_id: 'task-1',
      assignment_count: 2,
      completed_count: 1,
      accepted_count: 0,
      changes_requested_count: 1,
      overdue_count: 0,
    },
  ];

  assignmentDetailRows: AssignmentDetailRowWithTask[] = [
    {
      id: 'assignment-1',
      task_id: 'task-1',
      assignee_id: 'user-2',
      status: 'completed',
      completion_note: '已提交材料',
      review_status: 'pending',
      review_note: null,
      reviewed_at: null,
    },
  ];

  insertedTasks: InsertedTaskPayload[] = [];
  insertedAssignments: AssignmentInsertPayload[][] = [];
  updatedAssignments: Array<{ payload: ReviewUpdatePayload; value: string }> = [];

  storage = {
    from: vi.fn(() => ({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/upload', path: 'path', token: 'token' },
        error: null,
      }),
    })),
  };

  from(table: string) {
    switch (table) {
      case 'group_members':
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () =>
                    Promise.resolve({
                      data: this.groupRows,
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      case 'organization_tag_categories':
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: this.tagCategories,
                  error: null,
                }),
            }),
          }),
        };
      case 'group_member_details':
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  order: () =>
                    Promise.resolve({
                      data: this.groupMemberDetails,
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      case 'organization_member_details':
        return {
          select: () => ({
            eq: () => ({
              in: () =>
                Promise.resolve({
                  data: this.orgMembershipRows,
                  error: null,
                }),
            }),
          }),
        };
      case 'member_tags':
        return {
          select: () => ({
            in: () => ({
              eq: () =>
                Promise.resolve({
                  data: this.memberTagRows,
                  error: null,
                }),
            }),
          }),
        };
      case 'tasks':
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  order: () =>
                    Promise.resolve({
                      data: this.tasksRows,
                      error: null,
                    }),
                }),
              }),
            }),
          }),
          insert: (payload: InsertedTaskPayload) => {
            const newTaskId = `task-${this.insertedTasks.length + 2}`;
            this.insertedTasks.push({ ...payload });

            this.tasksRows = [
              {
                id: newTaskId,
                title: payload.title,
                description: payload.description,
                due_at: payload.due_at,
                created_at: new Date().toISOString(),
                task_assignments: null,
              },
              ...this.tasksRows,
            ];

            this.taskSummaryRows = [
              {
                task_id: newTaskId,
                assignment_count: 0,
                completed_count: 0,
                accepted_count: 0,
                changes_requested_count: 0,
                overdue_count: 0,
              },
              ...this.taskSummaryRows,
            ];

            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: newTaskId },
                    error: null,
                  }),
              }),
            };
          },
        };
      case 'task_assignment_summary':
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: this.taskSummaryRows,
                error: null,
              }),
          }),
        };
      case 'task_assignments':
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              order: () =>
                Promise.resolve({
                  data: this.assignmentDetailRows.filter((row) => row.task_id === value),
                  error: null,
                }),
            }),
          }),
          insert: (rows: AssignmentInsertPayload[]) => {
            this.insertedAssignments.push(rows.map((row) => ({ ...row })));
            return Promise.resolve({ data: rows, error: null });
          },
          update: (payload: ReviewUpdatePayload) => ({
            eq: (_column: string, value: string) => {
              this.updatedAssignments.push({ payload: { ...payload }, value });
              return Promise.resolve({ data: null, error: null });
            },
          }),
        };
      default:
        throw new Error(`Unhandled table ${table}`);
    }
  }
}

describe('useTaskDashboard', () => {
  let supabase: SupabaseStub;
  const fetchStub = vi.fn();
  const promptStub = vi.fn();

  beforeEach(() => {
    supabase = new SupabaseStub();
    fetchStub.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    promptStub.mockReturnValue('');
    useOrgContextMock.mockReturnValue({
      activeOrg: { id: 'org-1' },
      user: { id: 'user-1' },
      organizationsLoading: false,
    });
  });

  it('loads groups, members, and task summary data', async () => {
    const { result } = renderHook(() =>
      useTaskDashboard({
        client: supabase as unknown as SupabaseClient,
        fetchImpl: fetchStub,
        prompt: promptStub,
      })
    );

    await waitFor(() => {
      expect(result.current.groups.list).toHaveLength(1);
    });

    expect(result.current.groupMembers.list).toHaveLength(2);
    expect(result.current.tasks.list).toHaveLength(1);
    expect(result.current.tasks.summary('task-1')).toContain('完成 1/2');
    expect(result.current.tasks.summary('task-1')).toContain('待修改 1');

    act(() => {
      result.current.tagCategories.handleSingleChange('cat-1', 'tag-2');
    });

    await waitFor(() => {
      expect(result.current.groupMembers.filtered).toHaveLength(1);
    });
    expect(result.current.groupMembers.filtered[0].userId).toBe('user-2');
  });

  it('creates a new task and assigns members', async () => {
    const { result } = renderHook(() =>
      useTaskDashboard({
        client: supabase as unknown as SupabaseClient,
        fetchImpl: fetchStub,
        prompt: promptStub,
      })
    );

    await waitFor(() => {
      expect(result.current.groupMembers.filtered).toHaveLength(2);
    });

    act(() => {
      result.current.tagCategories.resetFilters();
      result.current.assignees.selectAll();
      result.current.composer.setTitle('新任务');
      result.current.composer.setDescription('任务说明');
      result.current.composer.setDueAt('2025-01-01T00:00');
    });

    await act(async () => {
      await result.current.composer.createTask();
    });

    expect(supabase.insertedTasks).toHaveLength(1);
    expect(supabase.insertedTasks[0].title).toBe('新任务');
    expect(supabase.insertedAssignments[0]).toHaveLength(2);
    expect(result.current.composer.title).toBe('');
    expect(result.current.assignees.selected).toHaveLength(0);
  });

  it('validates review note and updates assignment when valid', async () => {
    const { result } = renderHook(() =>
      useTaskDashboard({
        client: supabase as unknown as SupabaseClient,
        fetchImpl: fetchStub,
        prompt: promptStub,
      })
    );

    await waitFor(() => {
      expect(result.current.tasks.list).toHaveLength(1);
    });

    await act(async () => {
      await result.current.tasks.viewAssignments('task-1');
    });

    await waitFor(() => {
      expect(result.current.detail.records).toHaveLength(1);
    });

    promptStub.mockReturnValue('');
    await act(async () => {
      await result.current.detail.review('assignment-1', 'changes_requested');
    });

    expect(supabase.updatedAssignments).toHaveLength(0);
    expect(result.current.detail.error).toBe('请输入需调整的说明后再提交。');

    promptStub.mockReturnValue('请补充材料');
    await act(async () => {
      await result.current.detail.review('assignment-1', 'changes_requested');
    });

    expect(supabase.updatedAssignments).toHaveLength(1);
    expect(supabase.updatedAssignments[0]).toMatchObject({
      payload: expect.objectContaining({
        review_status: 'changes_requested',
        review_note: '请补充材料',
      }),
      value: 'assignment-1',
    });
  });
});







