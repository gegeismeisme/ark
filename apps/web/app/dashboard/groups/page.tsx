'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../../lib/supabaseClient';

import { useOrgContext } from '../org-provider';

type Group = {
  id: string;
  name: string;
  created_at: string;
};

type OrgMember = {
  id: string;
  userId: string;
  role: string;
  status: string;
  fullName: string | null;
};

type OrgMemberRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profiles: { full_name: string | null } | null;
};

type GroupMember = {
  id: string;
  userId: string;
  role: string;
  status: string;
  addedAt: string | null;
  fullName: string | null;
  orgRole: string | null;
};

type GroupMemberRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  added_at: string | null;
  profiles?: { full_name: string | null } | null;
};

const groupInputClass =
  'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600';

export default function GroupsPage() {
  const { activeOrg, user, organizationsLoading } = useOrgContext();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [orgMembersLoading, setOrgMembersLoading] = useState(false);
  const [orgMembersError, setOrgMembersError] = useState<string | null>(null);

  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState<string | null>(
    null
  );

  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [memberFormUserId, setMemberFormUserId] = useState('');
  const [memberFormRole, setMemberFormRole] =
    useState<'member' | 'publisher' | 'admin'>('member');
  const [savingMember, setSavingMember] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(
    null
  );

  const orgId = activeOrg?.id ?? null;

  const refreshGroups = useCallback(async () => {
    if (!orgId) {
      setGroups([]);
      setSelectedGroupId(null);
      return;
    }

    setGroupsLoading(true);
    setGroupsError(null);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, created_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      setGroups([]);
      setSelectedGroupId(null);
      setGroupsError(error.message);
      setGroupsLoading(false);
      return;
    }

    const mapped = (data ?? []) as Group[];

    setGroups(mapped);
    setSelectedGroupId((current) => current ?? mapped[0]?.id ?? null);
    setGroupsLoading(false);
  }, [orgId]);

  useEffect(() => {
    void refreshGroups();
  }, [refreshGroups]);

  useEffect(() => {
    if (!orgId) {
      setOrgMembers([]);
      return;
    }

    let cancelled = false;
    setOrgMembersLoading(true);
    setOrgMembersError(null);

    (async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status, profiles(full_name)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .is('removed_at', null)
        .order('joined_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        setOrgMembers([]);
        setOrgMembersError(error.message);
      } else {
        const rows =
          (data ?? []) as Array<
            OrgMemberRow & {
              profiles: OrgMemberRow['profiles'] | OrgMemberRow['profiles'][];
            }
          >;
        const mapped = rows.map(
          ({ id, user_id, role, status, profiles }) => {
            const profile = Array.isArray(profiles)
              ? profiles[0] ?? null
              : profiles;
            return {
              id,
              userId: user_id,
              role,
              status,
              fullName: profile?.full_name ?? null,
            };
          }
        );
        setOrgMembers(mapped);
      }

      setOrgMembersLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const orgMemberMap = useMemo(() => {
    const map = new Map<string, OrgMember>();
    orgMembers.forEach((member) => {
      map.set(member.userId, member);
    });
    return map;
  }, [orgMembers]);

  const refreshGroupMembers = useCallback(
    async (groupId: string | null) => {
      if (!groupId) {
        setGroupMembers([]);
        return;
      }

      setGroupMembersLoading(true);
      setGroupMembersError(null);

      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id, role, status, added_at, profiles(full_name)')
        .eq('group_id', groupId)
        .is('removed_at', null)
        .order('added_at', { ascending: true });

      if (error) {
        setGroupMembers([]);
        setGroupMembersError(error.message);
        setGroupMembersLoading(false);
        return;
      }

      const rows =
        (data ?? []) as Array<
          GroupMemberRow & {
            profiles: GroupMemberRow['profiles'] | GroupMemberRow['profiles'][];
          }
        >;
      const mapped = rows.map(({ id, user_id, role, status, added_at, profiles }) => {
        const orgInfo = orgMemberMap.get(user_id);
        const profile = Array.isArray(profiles)
          ? profiles[0] ?? null
          : profiles;
        return {
          id,
          userId: user_id,
          role,
          status,
          addedAt: added_at,
          fullName: profile?.full_name ?? orgInfo?.fullName ?? null,
          orgRole: orgInfo?.role ?? null,
        };
      });

      setGroupMembers(mapped);
      setGroupMembersLoading(false);
    },
    [orgMemberMap]
  );

  useEffect(() => {
    void refreshGroupMembers(selectedGroupId);
  }, [refreshGroupMembers, selectedGroupId]);

  useEffect(() => {
    if (!memberFormUserId) {
      const first = orgMembers.find(
        (member) =>
          member.status === 'active' &&
          !groupMembers.some((gm) => gm.userId === member.userId)
      );
      if (first) {
        setMemberFormUserId(first.userId);
      }
    }
  }, [groupMembers, memberFormUserId, orgMembers]);

  const availableOrgMembers = useMemo(
    () =>
      orgMembers.filter(
        (member) =>
          member.status === 'active' &&
          !groupMembers.some((gm) => gm.userId === member.userId)
      ),
    [groupMembers, orgMembers]
  );

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const adminCount = useMemo(
    () => groupMembers.filter((member) => member.role === 'admin').length,
    [groupMembers]
  );

  const handleCreateGroup = useCallback(async () => {
    if (!orgId || !user) return;
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    setCreatingGroup(true);
    setGroupsError(null);

    const { data, error } = await supabase
      .from('groups')
      .insert({
        organization_id: orgId,
        name: trimmed,
        created_by: user.id,
      })
      .select('id, name, created_at')
      .single();

    if (error) {
      setGroupsError(error.message);
      setCreatingGroup(false);
      return;
    }

    const created = data as Group;
    setGroups((prev) => [created, ...prev]);
    setSelectedGroupId(created.id);
    setNewGroupName('');
    setCreatingGroup(false);
    await refreshGroupMembers(created.id);
  }, [newGroupName, orgId, refreshGroupMembers, user]);

  const handleAddMember = useCallback(async () => {
    if (!selectedGroupId || !user || !memberFormUserId) return;

    setSavingMember(true);
    setMemberActionError(null);

    const timestamp = new Date().toISOString();

    const { error } = await supabase.from('group_members').insert({
      group_id: selectedGroupId,
      user_id: memberFormUserId,
      role: memberFormRole,
      status: 'active',
      added_by: user.id,
      added_at: timestamp,
    });

    if (error) {
      setMemberActionError(error.message);
      setSavingMember(false);
      return;
    }

    await refreshGroupMembers(selectedGroupId);
    setSavingMember(false);

    const next = availableOrgMembers.find(
      (member) => member.userId !== memberFormUserId
    );
    setMemberFormUserId(next?.userId ?? '');
    setMemberFormRole('member');
  }, [
    availableOrgMembers,
    memberFormRole,
    memberFormUserId,
    refreshGroupMembers,
    selectedGroupId,
    user,
  ]);

  const handleUpdateMemberRole = useCallback(
    async (memberId: string, nextRole: 'member' | 'publisher' | 'admin') => {
      const target = groupMembers.find((member) => member.id === memberId);
      if (!target) return;

      if (
        target.userId === user?.id &&
        target.role === 'admin' &&
        adminCount === 1 &&
        nextRole !== 'admin'
      ) {
        setMemberActionError('至少需要保留一位小组管理员');
        return;
      }

      setMemberActionError(null);

      const { error } = await supabase
        .from('group_members')
        .update({ role: nextRole })
        .eq('id', memberId);

      if (error) {
        setMemberActionError(error.message);
        return;
      }

      setGroupMembers((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, role: nextRole } : member
        )
      );
    },
    [adminCount, groupMembers, user?.id]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      const target = groupMembers.find((member) => member.id === memberId);
      if (!target || !selectedGroupId) return;

      if (
        target.role === 'admin' &&
        adminCount === 1 &&
        target.userId === user?.id
      ) {
        setMemberActionError('无法移除最后一位小组管理员');
        return;
      }

      setMemberActionError(null);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        setMemberActionError(error.message);
        return;
      }

      setGroupMembers((prev) =>
        prev.filter((member) => member.id !== memberId)
      );
    },
    [adminCount, groupMembers, selectedGroupId, user?.id]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">小组管理</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息…
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">小组管理</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          尚未选择组织，请先返回首页创建或加入组织。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">小组管理</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            将成员按职能划分到小组，例如班主任、年级组、行政管理等。
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className={groupInputClass}
            placeholder="新建小组名称"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            disabled={creatingGroup || groupsLoading}
          />
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={handleCreateGroup}
            disabled={creatingGroup || !newGroupName.trim()}
          >
            {creatingGroup ? '创建中…' : '创建小组'}
          </button>
        </div>
      </div>

      {groupsError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {groupsError}
        </div>
      ) : null}
      {orgMembersError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {orgMembersError}
        </div>
      ) : null}
      {groupMembersError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {groupMembersError}
        </div>
      ) : null}
      {memberActionError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {memberActionError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            小组列表
          </h2>
          <div className="space-y-2">
            {groupsLoading ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                正在加载小组…
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                还没有创建任何小组。
              </div>
            ) : (
              groups.map((group) => {
                const active = group.id === selectedGroupId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                      active
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-medium">{group.name}</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      创建于 {new Date(group.created_at).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          {activeGroup ? (
            <>
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeGroup.name}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    管理该小组的成员、角色和管理权限。
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      添加成员
                    </span>
                    {orgMembersLoading ? (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        正在加载组织成员…
                      </span>
                    ) : availableOrgMembers.length === 0 ? (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        所有活跃成员都已加入该小组。
                      </span>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          value={memberFormUserId}
                          onChange={(event) =>
                            setMemberFormUserId(event.target.value)
                          }
                        >
                          <option value="" disabled>
                            选择成员
                          </option>
                          {availableOrgMembers.map((member) => (
                            <option key={member.id} value={member.userId}>
                              {member.fullName ?? member.userId.slice(0, 8)}
                              {member.role ? ` · ${member.role}` : ''}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          value={memberFormRole}
                          onChange={(event) =>
                            setMemberFormRole(
                              event.target.value as 'member' | 'publisher' | 'admin'
                            )
                          }
                        >
                          <option value="member">成员</option>
                          <option value="publisher">发布者</option>
                          <option value="admin">管理员</option>
                        </select>
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          onClick={handleAddMember}
                          disabled={savingMember || !memberFormUserId}
                        >
                          {savingMember ? '添加中…' : '添加'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-2">成员</th>
                      <th className="px-4 py-2">组织角色</th>
                      <th className="px-4 py-2">小组角色</th>
                      <th className="px-4 py-2">加入时间</th>
                      <th className="px-4 py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupMembersLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          正在加载成员…
                        </td>
                      </tr>
                    ) : groupMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          该小组尚未添加成员。
                        </td>
                      </tr>
                    ) : (
                      groupMembers.map((member) => (
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
                          <td className="px-4 py-3 capitalize">
                            {member.orgRole ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              value={member.role}
                              onChange={(event) =>
                                handleUpdateMemberRole(
                                  member.id,
                                  event.target
                                    .value as 'member' | 'publisher' | 'admin'
                                )
                              }
                              disabled={savingMember}
                            >
                              <option value="member">成员</option>
                              <option value="publisher">发布者</option>
                              <option value="admin">管理员</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                            {member.addedAt
                              ? new Date(member.addedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => handleRemoveMember(member.id)}
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
            </>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              请选择左侧的小组查看成员。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
