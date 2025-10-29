'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSupabaseAuthState } from '@project-ark/shared';

import { supabase } from '../lib/supabaseClient';

type AssignmentStatus = 'sent' | 'received' | 'completed' | 'archived';

type Assignment = {
  id: string;
  taskId: string;
  status: AssignmentStatus;
  createdAt: string;
  receivedAt: string | null;
  completedAt: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    groupId: string | null;
    organizationId: string | null;
    groupName: string | null;
    organizationName: string | null;
  } | null;
};

type AssignmentRow = {
  id: string;
  task_id: string;
  status: AssignmentStatus;
  created_at: string;
  received_at: string | null;
  completed_at: string | null;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    due_at: string | null;
    group_id: string | null;
    organization_id: string | null;
    groups:
      | {
          id: string;
          name: string;
        }
      | {
          id: string;
          name: string;
        }[]
      | null;
    organizations:
      | {
          id: string;
          name: string;
        }
      | {
          id: string;
          name: string;
        }[]
      | null;
  } | null;
};

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  sent: '待查看',
  received: '进行中',
  completed: '已完成',
  archived: '已归档',
};

const STATUS_OPTIONS: Array<{ value: 'all' | AssignmentStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'received', label: STATUS_LABELS.received },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'archived', label: STATUS_LABELS.archived },
];

export default function MyTasksPage() {
  const { user, loading: authLoading } = useSupabaseAuthState({ client: supabase });

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [organizationFilter, setOrganizationFilter] = useState<'all' | string>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!user) {
      setAssignments([]);
      return;
    }

    setLoading(true);
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
          tasks (
            id,
            title,
            description,
            due_at,
            group_id,
            organization_id,
            groups (id, name),
            organizations (id, name)
          )
        `
      )
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false });

    if (queryError) {
      setAssignments([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map((row: AssignmentRow) => {
        const task = row.tasks;
        const groupRaw = task?.groups;
        const orgRaw = task?.organizations;

        const group =
          Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;
        const organization =
          Array.isArray(orgRaw) ? orgRaw[0] ?? null : orgRaw ?? null;

        return {
          id: row.id,
          taskId: row.task_id,
          status: row.status,
          createdAt: row.created_at,
          receivedAt: row.received_at,
          completedAt: row.completed_at,
          task: task
            ? {
                id: task.id,
                title: task.title,
                description: task.description,
                dueAt: task.due_at,
                groupId: task.group_id,
                organizationId: task.organization_id,
                groupName: group?.name ?? null,
                organizationName: organization?.name ?? null,
              }
            : null,
        } satisfies Assignment;
      }) ?? [];

    setAssignments(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const organizations = useMemo(
    () => {
      const map = new Map<string, string>();
      assignments.forEach((assignment) => {
        if (assignment.task?.organizationId && assignment.task.organizationName) {
          map.set(assignment.task.organizationId, assignment.task.organizationName);
        }
      });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    },
    [assignments]
  );

  const groups = useMemo(
    () => {
      const map = new Map<string, string>();
      assignments.forEach((assignment) => {
        if (assignment.task?.groupId && assignment.task.groupName) {
          map.set(assignment.task.groupId, assignment.task.groupName);
        }
      });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    },
    [assignments]
  );

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (statusFilter !== 'all' && assignment.status !== statusFilter) {
        return false;
      }
      if (
        organizationFilter !== 'all' &&
        assignment.task?.organizationId !== organizationFilter
      ) {
        return false;
      }
      if (groupFilter !== 'all' && assignment.task?.groupId !== groupFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const keyword = searchTerm.trim().toLowerCase();
        const text =
          `${assignment.task?.title ?? ''} ${assignment.task?.description ?? ''}`.toLowerCase();
        if (!text.includes(keyword)) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, groupFilter, organizationFilter, searchTerm, statusFilter]);

  const handleUpdateStatus = useCallback(
    async (assignmentId: string, nextStatus: AssignmentStatus) => {
      setUpdatingId(assignmentId);
      setActionError(null);

      const updates: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === 'received') {
        updates.received_at = new Date().toISOString();
        updates.completed_at = null;
      } else if (nextStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (nextStatus === 'sent') {
        updates.received_at = null;
        updates.completed_at = null;
      }

      const { error: updateError } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (updateError) {
        setActionError(updateError.message);
        setUpdatingId(null);
        return;
      }

      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                status: nextStatus,
                receivedAt:
                  nextStatus === 'received'
                    ? (updates.received_at as string)
                    : nextStatus === 'sent'
                      ? null
                      : assignment.receivedAt,
                completedAt:
                  nextStatus === 'completed'
                    ? (updates.completed_at as string)
                    : nextStatus === 'received' || nextStatus === 'sent'
                      ? null
                      : assignment.completedAt,
              }
            : assignment
        )
      );

      setUpdatingId(null);
    },
    []
  );

  if (authLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">我的任务</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在同步账号信息...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">我的任务</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          请先登录后查看来自各组织的小组任务。
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          href="/auth/login"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">我的任务</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            汇总来自不同组织与小组的任务，支持按状态、来源快速筛选与更新进度。
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
          href="/dashboard/tasks"
        >
          打开管理员任务面板
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          状态筛选
          <select
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | AssignmentStatus)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          组织
          <select
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={organizationFilter}
            onChange={(event) =>
              setOrganizationFilter(
                (event.target.value || 'all') as 'all' | string
              )
            }
          >
            <option value="all">全部组织</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          小组
          <select
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={groupFilter}
            onChange={(event) =>
              setGroupFilter((event.target.value || 'all') as 'all' | string)
            }
          >
            <option value="all">全部小组</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          关键词
          <input
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="按标题或描述搜索"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            正在加载任务...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            没有符合条件的任务。
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const task = assignment.task;
            const statusLabel = STATUS_LABELS[assignment.status];
            const dueText = task?.dueAt
              ? new Date(task.dueAt).toLocaleString()
              : '未设置截止时间';

            return (
              <div
                key={assignment.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-zinc-900/5 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                        {statusLabel}
                      </span>
                      {task?.organizationName ? (
                        <span className="inline-flex items-center rounded-full bg-zinc-900/5 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-100/10 dark:text-zinc-300">
                          {task.organizationName}
                        </span>
                      ) : null}
                      {task?.groupName ? (
                        <span className="inline-flex items-center rounded-full bg-zinc-900/5 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-100/10 dark:text-zinc-300">
                          {task.groupName}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {task?.title ?? '未命名任务'}
                    </h2>
                    {task?.description ? (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {task.description}
                      </p>
                    ) : null}
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      下发时间：{new Date(assignment.createdAt).toLocaleString()}
                      {' · '}
                      截止：{dueText}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    {assignment.status !== 'completed' ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                        onClick={() => void handleUpdateStatus(assignment.id, 'completed')}
                        disabled={updatingId === assignment.id}
                      >
                        {updatingId === assignment.id ? '更新中...' : '标记为已完成'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
                        onClick={() => void handleUpdateStatus(assignment.id, 'received')}
                        disabled={updatingId === assignment.id}
                      >
                        {updatingId === assignment.id ? '更新中...' : '重新打开任务'}
                      </button>
                    )}

                    {assignment.status === 'sent' ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
                        onClick={() => void handleUpdateStatus(assignment.id, 'received')}
                        disabled={updatingId === assignment.id}
                      >
                        {updatingId === assignment.id ? '更新中...' : '标记为进行中'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
