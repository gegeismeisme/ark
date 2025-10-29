'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../../lib/supabaseClient';
import { useOrgContext } from '../org-provider';

type GroupRole = 'member' | 'publisher' | 'admin';
type MemberStatus = 'active' | 'invited' | 'suspended';

type AdminGroup = {
  id: string;
  name: string;
};

type AdminGroupRow = {
  group_id: string;
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
};

type GroupMember = {
  userId: string;
  fullName: string | null;
  role: GroupRole;
};

type GroupMemberDetailRow = {
  user_id: string;
  role: GroupRole;
  status: MemberStatus;
  full_name: string | null;
};

type TaskAssignment = {
  assignee_id: string;
  status: string;
};

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  created_at: string;
  task_assignments: TaskAssignment[] | null;
};

type TaskSummaryRow = {
  task_id: string;
  assignment_count: number;
  completed_count: number;
  accepted_count: number;
  changes_requested_count: number;
  overdue_count: number;
};

type TaskAssignmentDetail = {
  id: string;
  assigneeId: string;
  assigneeName: string | null;
  status: string;
  completionNote: string | null;
  reviewStatus: 'pending' | 'accepted' | 'changes_requested';
  reviewNote: string | null;
  reviewedAt: string | null;
};

type TaskAssignmentDetailRow = {
  id: string;
  assignee_id: string;
  status: string;
  completion_note: string | null;
  review_status: 'pending' | 'accepted' | 'changes_requested';
  review_note: string | null;
  reviewed_at: string | null;
};

const formInputClass =
  'h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function TasksPage() {
  const { activeOrg, user, organizationsLoading } = useOrgContext();

  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskSummaries, setTaskSummaries] = useState<Record<string, TaskSummaryRow>>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<TaskAssignmentDetail[]>([]);
  const [assignmentDetailsLoading, setAssignmentDetailsLoading] = useState(false);
  const [assignmentDetailsError, setAssignmentDetailsError] = useState<string | null>(null);

  const orgId = activeOrg?.id ?? null;

  useEffect(() => {
    if (!orgId || !user) {
      setGroups([]);
      setSelectedGroupId(null);
      return;
    }

    let cancelled = false;
    setGroupsLoading(true);
    setGroupsError(null);

    (async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setGroups([]);
        setGroupsError(error.message);
        setGroupsLoading(false);
        return;
      }

      const rows = (data ?? []) as AdminGroupRow[];
      const mapped: AdminGroup[] =
        rows
          .map((row) => {
            const group =
              Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups ?? null;
            if (!group) return null;
            return { id: group.id, name: group.name } satisfies AdminGroup;
          })
          .filter((item): item is AdminGroup => Boolean(item)) ?? [];

      setGroups(mapped);
      setSelectedGroupId((current) => current ?? mapped[0]?.id ?? null);
      setGroupsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, user]);

  const refreshGroupMembers = useCallback(
    async (groupId: string | null) => {
      if (!groupId) {
        setGroupMembers([]);
        return;
      }

      setGroupMembersLoading(true);
      setGroupMembersError(null);

      const { data, error } = await supabase
        .from('group_member_details')
        .select('user_id, role, status, full_name')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('removed_at', null)
        .order('role', { ascending: false });

      if (error) {
        setGroupMembers([]);
        setGroupMembersError(error.message);
        setGroupMembersLoading(false);
        return;
      }

      const rows = (data ?? []) as GroupMemberDetailRow[];
      const mapped = rows.map(({ user_id, role, full_name }) => ({
        userId: user_id,
        role,
        fullName: full_name ?? null,
      }));

      setGroupMembers(mapped);
      setGroupMembersLoading(false);
    },
    []
  );

  const refreshTasks = useCallback(
    async (groupId: string | null) => {
      if (!groupId || !orgId) {
        setTasks([]);
        return;
      }

      setTasksLoading(true);
      setTasksError(null);

      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, title, description, due_at, created_at, task_assignments(assignee_id, status)'
        )
        .eq('group_id', groupId)
        .eq('organization_id', orgId)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        setTasks([]);
        setTasksError(error.message);
        setTasksLoading(false);
        return;
      }

      const rows = (data ?? []) as TaskItem[];
      setTasks(rows);
      setTasksLoading(false);

      const taskIds = rows.map((task) => task.id);
      if (taskIds.length === 0) {
        setTaskSummaries({});
        return;
      }

      const { data: summaryData, error: summaryError } = await supabase
        .from('task_assignment_summary')
        .select(
          'task_id, assignment_count, completed_count, accepted_count, changes_requested_count, overdue_count'
        )
        .in('task_id', taskIds);

      if (summaryError) {
        return;
      }

      const summaryMap = Object.fromEntries(
        (summaryData ?? []).map((row: TaskSummaryRow) => [row.task_id, row])
      );
      setTaskSummaries(summaryMap);
    },
    [orgId]
  );

  useEffect(() => {
    void refreshGroupMembers(selectedGroupId);
    void refreshTasks(selectedGroupId);
    setSelectedAssignees([]);
  }, [refreshGroupMembers, refreshTasks, selectedGroupId]);

  const handleToggleAssignee = useCallback((userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedAssignees(groupMembers.map((member) => member.userId));
  }, [groupMembers]);

  const handleClearAssignees = useCallback(() => {
    setSelectedAssignees([]);
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const assignmentSummary = useCallback(
    (taskId: string) => {
      const summary = taskSummaries[taskId];
      if (!summary || summary.assignment_count === 0) return '未指派成员';
      const { assignment_count, completed_count, accepted_count, changes_requested_count, overdue_count } = summary;
      return `完成 ${completed_count}/${assignment_count} · 验收 ${accepted_count}/${assignment_count}${
        changes_requested_count > 0 ? ` · 待修改 ${changes_requested_count}` : ''
      }${overdue_count > 0 ? ` · 逾期 ${overdue_count}` : ''}`;
    },
    [taskSummaries]
  );

  const fetchAssignmentDetails = useCallback(
    async (taskId: string) => {
      setAssignmentDetailsLoading(true);
      setAssignmentDetailsError(null);

      const { data, error } = await supabase
        .from('task_assignments')
        .select('id, assignee_id, status, completion_note, review_status, review_note, reviewed_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        setAssignmentDetails([]);
        setAssignmentDetailsError(error.message);
        setAssignmentDetailsLoading(false);
        return;
      }

      const memberNameMap = new Map<string, string | null>();
      groupMembers.forEach((member) => {
        memberNameMap.set(member.userId, member.fullName ?? null);
      });

      const mapped =
        (data ?? []).map((row: TaskAssignmentDetailRow) => ({
          id: row.id,
          assigneeId: row.assignee_id,
          assigneeName: memberNameMap.get(row.assignee_id) ?? null,
          status: row.status,
          completionNote: row.completion_note,
          reviewStatus: row.review_status,
          reviewNote: row.review_note,
          reviewedAt: row.reviewed_at,
        })) ?? [];

      setAssignmentDetails(mapped);
      setAssignmentDetailsLoading(false);
    },
    [groupMembers]
  );

  const handleViewAssignments = useCallback(
    async (taskId: string) => {
      setDetailTaskId(taskId);
      await fetchAssignmentDetails(taskId);
    },
    [fetchAssignmentDetails]
  );

  const handleReviewUpdate = useCallback(
    async (assignmentId: string, reviewStatus: 'accepted' | 'changes_requested') => {
      const note = window.prompt(
        reviewStatus === 'accepted' ? '可选：填写验收备注' : '请输入需调整的说明',
        ''
      );

      const { error } = await supabase
        .from('task_assignments')
        .update({
          review_status: reviewStatus,
          review_note: note && note.trim().length > 0 ? note.trim() : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq('id', assignmentId);

      if (error) {
        setAssignmentDetailsError(error.message);
        return;
      }

      if (detailTaskId) {
        await fetchAssignmentDetails(detailTaskId);
        await refreshTasks(selectedGroupId);
      }
    },
    [detailTaskId, fetchAssignmentDetails, refreshTasks, selectedGroupId, user?.id]
  );

  const handleCreateTask = useCallback(async () => {
    if (!selectedGroupId || !orgId || !user) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateError('请输入任务标题');
      return;
    }

    setCreatingTask(true);
    setCreateError(null);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        organization_id: orgId,
        group_id: selectedGroupId,
        created_by: user.id,
        title: trimmedTitle,
        description: description.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      setCreateError(error.message);
      setCreatingTask(false);
      return;
    }

    const taskId = (data as { id: string }).id;

    if (selectedAssignees.length > 0) {
      const assignments = selectedAssignees.map((assigneeId) => ({
        task_id: taskId,
        assignee_id: assigneeId,
        status: 'sent',
      }));
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .insert(assignments);
      if (assignmentError) {
        setCreateError(assignmentError.message);
        setCreatingTask(false);
        return;
      }
    }

    setTitle('');
    setDescription('');
    setDueAt('');
    setSelectedAssignees([]);
    await refreshTasks(selectedGroupId);
    setCreatingTask(false);
  }, [
    description,
    dueAt,
    orgId,
    refreshTasks,
    selectedAssignees,
    selectedGroupId,
    title,
    user,
  ]);

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">任务管理</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">任务管理</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未选择组织，请先在导航栏中创建或选择一个组织。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">任务管理</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            小组管理员可以在这里创建任务并指派成员，后续迭代将补充移动端同步与通知。
          </p>
        </div>
      </div>

      {groupsError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {groupsError}
        </div>
      ) : null}
      {groupMembersError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {groupMembersError}
        </div>
      ) : null}
      {tasksError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {tasksError}
        </div>
      ) : null}
      {createError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {createError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            我管理的小组
          </h2>
          <div className="space-y-2">
            {groupsLoading ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                正在加载小组...
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                当前账号尚未成为任何小组的管理员，请联系组织管理员授权。
              </div>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                    group.id === selectedGroupId
                      ? 'border-zinc-900 bg-zinc-900/5 text-zinc-900 dark:border-zinc-200 dark:bg-zinc-100/10 dark:text-zinc-100'
                      : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <div className="font-medium">{group.name}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          {selectedGroup ? (
            <>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  向「{selectedGroup.name}」发布任务
                </h2>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      标题
                    </label>
                    <input
                      className={formInputClass}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="输入任务标题"
                      disabled={creatingTask}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      说明（可选）
                    </label>
                    <textarea
                      className="min-h-[96px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="补充任务细节、提交要求等"
                      disabled={creatingTask}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      截止时间（可选）
                    </label>
                    <input
                      type="datetime-local"
                      className={formInputClass}
                      value={dueAt}
                      onChange={(event) => setDueAt(event.target.value)}
                      disabled={creatingTask}
                    />
                  </div>

                  <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/80">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        指派成员
                      </span>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                          onClick={handleSelectAll}
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                          onClick={handleClearAssignees}
                        >
                          清空
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {groupMembersLoading ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          正在加载小组成员...
                        </p>
                      ) : groupMembers.length === 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          小组暂无成员，请先在“小组管理”中添加成员。
                        </p>
                      ) : (
                        groupMembers.map((member) => (
                          <label
                            key={member.userId}
                            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                              checked={selectedAssignees.includes(member.userId)}
                              onChange={() => handleToggleAssignee(member.userId)}
                              disabled={creatingTask}
                            />
                            <span>
                              {member.fullName ?? member.userId.slice(0, 8)}
                              {member.role === 'admin'
                                ? ' · 管理员'
                                : member.role === 'publisher'
                                  ? ' · 发布者'
                                  : ''}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      onClick={handleCreateTask}
                      disabled={creatingTask || !title.trim()}
                    >
                      {creatingTask ? '创建中...' : '创建任务'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              请选择一个小组以创建任务。
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
              已创建任务
            </div>
            {tasksLoading ? (
              <div className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                正在加载任务...
              </div>
            ) : tasks.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                暂无任务记录。
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {tasks.map((task) => (
                  <li key={task.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {task.title}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          创建于 {new Date(task.created_at).toLocaleString()}
                          {task.due_at
                            ? ` · 截止 ${new Date(task.due_at).toLocaleString()}`
                            : ''}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{assignmentSummary(task.id)}</span>
                        <button
                          type="button"
                          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          onClick={() => void handleViewAssignments(task.id)}
                        >
                          查看执行明细
                        </button>
                      </div>
                    </div>
                    {task.description ? (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {task.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {detailTaskId ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  执行明细
                </h2>
                <button
                  type="button"
                  className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onClick={() => {
                    setDetailTaskId(null);
                    setAssignmentDetails([]);
                  }}
                >
                  收起
                </button>
              </div>
              {assignmentDetailsLoading ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">正在加载执行情况…</p>
              ) : assignmentDetailsError ? (
                <p className="mt-3 text-sm text-red-500">{assignmentDetailsError}</p>
              ) : assignmentDetails.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  暂无指派记录。
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-300">
                      <tr>
                        <th className="px-3 py-2">成员</th>
                        <th className="px-3 py-2">状态</th>
                        <th className="px-3 py-2">验收</th>
                        <th className="px-3 py-2">说明</th>
                        <th className="px-3 py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentDetails.map((detail) => (
                        <tr key={detail.id} className="border-b border-zinc-200 dark:border-zinc-800">
                          <td className="px-3 py-2">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {detail.assigneeName ?? detail.assigneeId.slice(0, 8)}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {detail.assigneeId}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                            {detail.status}
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                            {detail.reviewStatus === 'pending'
                              ? '待验证'
                              : detail.reviewStatus === 'accepted'
                                ? '已验收'
                                : '需调整'}
                            {detail.reviewedAt ? (
                              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                                {new Date(detail.reviewedAt).toLocaleString()}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                            {detail.completionNote ? (
                              <div>
                                <div>成员：{detail.completionNote}</div>
                                {detail.reviewNote ? <div>审核：{detail.reviewNote}</div> : null}
                              </div>
                            ) : detail.reviewNote ? (
                              <div>审核：{detail.reviewNote}</div>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">暂无说明</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-emerald-300 px-3 py-1 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
                                onClick={() => void handleReviewUpdate(detail.id, 'accepted')}
                              >
                                通过
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-amber-300 px-3 py-1 text-amber-600 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                                onClick={() => void handleReviewUpdate(detail.id, 'changes_requested')}
                              >
                                调整
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
