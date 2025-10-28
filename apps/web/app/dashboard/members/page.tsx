'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../../../lib/supabaseClient';

import { useOrgContext } from '../org-provider';

type MemberRow = {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string | null;
  invitedAt: string | null;
  fullName: string | null;
};

type MemberRowData = {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'suspended';
  joined_at: string | null;
  invited_at: string | null;
  profiles: { full_name: string | null } | null;
};

export default function MembersPage() {
  const { activeOrg, user, organizationsLoading } = useOrgContext();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const orgId = activeOrg?.id ?? null;

  const refreshMembers = useCallback(async () => {
    if (!orgId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);

    const { data, error } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, joined_at, invited_at, profiles(full_name)')
      .eq('organization_id', orgId)
      .is('removed_at', null)
      .order('joined_at', { ascending: false });

    if (error) {
      setMembers([]);
      setMembersError(error.message);
      setMembersLoading(false);
      return;
    }

    const rows =
      (data ?? []) as Array<
        MemberRowData & {
          profiles: MemberRowData['profiles'] | MemberRowData['profiles'][];
        }
      >;
    const mapped = rows.map(
      ({ id, user_id, role, status, joined_at, invited_at, profiles }) => {
        const profile = Array.isArray(profiles)
          ? profiles[0] ?? null
          : profiles;
        return {
          id,
          userId: user_id,
          role,
          status,
          joinedAt: joined_at,
          invitedAt: invited_at,
          fullName: profile?.full_name ?? null,
        };
      }
    );

    setMembers(mapped);
    setMembersLoading(false);
  }, [orgId]);

  useEffect(() => {
    void refreshMembers();
  }, [refreshMembers]);

  const disableRoleChange = useCallback(
    (member: MemberRow) =>
      member.role === 'owner' || member.userId === user?.id,
    [user?.id]
  );

  const handleRoleChange = useCallback(
    async (member: MemberRow, nextRole: MemberRow['role']) => {
      if (member.role === nextRole || disableRoleChange(member)) return;
      if (!orgId) return;

      setUpdatingId(member.id);
      setActionError(null);

      const { error } = await supabase
        .from('organization_members')
        .update({ role: nextRole })
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, role: nextRole } : row
        )
      );
      setUpdatingId(null);
    },
    [disableRoleChange, orgId]
  );

  const handleStatusChange = useCallback(
    async (member: MemberRow, nextStatus: MemberRow['status']) => {
      if (member.status === nextStatus) return;
      if (!orgId) return;
      if (member.role === 'owner') {
        setActionError('不能停用组织拥有者');
        return;
      }

      setUpdatingId(member.id);
      setActionError(null);

      const { error } = await supabase
        .from('organization_members')
        .update({ status: nextStatus })
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, status: nextStatus } : row
        )
      );
      setUpdatingId(null);
    },
    [orgId]
  );

  const handleRemove = useCallback(
    async (member: MemberRow) => {
      if (!orgId) return;
      if (member.role === 'owner') {
        setActionError('无法移除组织拥有者');
        return;
      }
      if (member.userId === user?.id) {
        setActionError('请联系其他管理员将你移除组织');
        return;
      }

      setUpdatingId(member.id);
      setActionError(null);

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      setUpdatingId(null);
    },
    [orgId, user?.id]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">成员管理</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息…
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">成员管理</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          尚未选择组织，请先返回首页创建或加入组织。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">成员管理</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            查看组织成员，调整角色或停用访问权限。邀请流程将在后续迭代中完善。
          </p>
        </div>
      </div>

      {membersError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {membersError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-2">成员</th>
              <th className="px-4 py-2">角色</th>
              <th className="px-4 py-2">状态</th>
              <th className="px-4 py-2">加入时间</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {membersLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  正在加载成员…
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  当前组织还没有成员。
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {member.fullName ?? member.userId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {member.userId}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      value={member.role}
                      onChange={(event) =>
                        handleRoleChange(
                          member,
                          event.target.value as MemberRow['role']
                        )
                      }
                      disabled={updatingId === member.id || disableRoleChange(member)}
                    >
                      <option value="owner">拥有者</option>
                      <option value="admin">管理员</option>
                      <option value="member">成员</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      value={member.status}
                      onChange={(event) =>
                        handleStatusChange(
                          member,
                          event.target.value as MemberRow['status']
                        )
                      }
                      disabled={
                        updatingId === member.id || member.role === 'owner'
                      }
                    >
                      <option value="active">活跃</option>
                      <option value="suspended">已停用</option>
                      <option value="invited">待接受</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString()
                      : member.invitedAt
                        ? `已邀请 · ${new Date(member.invitedAt).toLocaleDateString()}`
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => handleRemove(member)}
                      disabled={
                        updatingId === member.id ||
                        member.role === 'owner' ||
                        member.userId === user?.id
                      }
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          邀请与标签规划
        </h2>
        <p className="mt-2">
          即将支持通过邮箱邀请成员，并为成员打标签以便在派发任务时按“班主任”等角色快速筛选。
          本迭代先专注于角色和状态管理，标签系统将在后续版本按组织、组和个人维度分别设计。
        </p>
        <p className="mt-2">
          当前如需添加成员，请与管理员协作手动插入 Supabase 记录，或等待邀请功能上线。
        </p>
      </div>
    </div>
  );
}
