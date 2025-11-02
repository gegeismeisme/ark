'use client';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';
import type {
  Group,
  GroupMember,
  GroupRole,
  OrgMember,
} from '../hooks/use-groups-dashboard';

type MemberFormState = {
  userId: string;
  setUserId: (value: string) => void;
  role: GroupRole;
  setRole: (value: GroupRole) => void;
  saving: boolean;
  error: string | null;
  add: () => void;
};

type GroupMembersPanelProps = {
  selectedGroup: Group | null;
  availableOrgMembers: OrgMember[];
  orgMembersLoading: boolean;
  orgMembersError: string | null;
  groupMembers: GroupMember[];
  groupMembersLoading: boolean;
  groupMembersError: string | null;
  memberForm: MemberFormState;
  onUpdateMemberRole: (memberId: string, role: GroupRole) => void;
  onRemoveMember: (memberId: string) => void;
};

export function GroupMembersPanel({
  selectedGroup,
  availableOrgMembers,
  orgMembersLoading,
  orgMembersError,
  groupMembers,
  groupMembersLoading,
  groupMembersError,
  memberForm,
  onUpdateMemberRole,
  onRemoveMember,
}: GroupMembersPanelProps) {
  const pagination = usePagination(groupMembers, { pageSize: 10 });

  if (!selectedGroup) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        请选择一个小组以查看成员详情。
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {selectedGroup.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              管理该小组的成员与角色，确保任务和通知仅面向合适的成员。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="h-10 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              value={memberForm.userId}
              onChange={(event) => memberForm.setUserId(event.target.value)}
              disabled={memberForm.saving || orgMembersLoading || availableOrgMembers.length === 0}
            >
              <option value="">选择成员</option>
              {availableOrgMembers.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.fullName ?? member.userId.slice(0, 8)}
                  {member.role ? ` · ${member.role}` : ''}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              value={memberForm.role}
              onChange={(event) => memberForm.setRole(event.target.value as GroupRole)}
              disabled={memberForm.saving}
            >
              <option value="member">成员</option>
              <option value="publisher">发布人</option>
              <option value="admin">管理员</option>
            </select>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
              onClick={memberForm.add}
              disabled={
                memberForm.saving ||
                !memberForm.userId ||
                availableOrgMembers.length === 0 ||
                orgMembersLoading
              }
            >
              {memberForm.saving ? '添加中...' : '添加成员'}
            </button>
          </div>
        </div>
        {orgMembersError ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            组织成员加载失败：{orgMembersError}
          </div>
        ) : null}
        {memberForm.error ? (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {memberForm.error}
          </div>
        ) : null}
        {availableOrgMembers.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            所有组织成员均已加入该小组，或暂无可用成员。
          </div>
        ) : null}
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
                  正在加载小组成员...
                </td>
              </tr>
            ) : groupMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  暂无成员，请先从上方添加成员。
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map((member) => (
                <tr key={member.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {member.fullName ?? member.userId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{member.userId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-zinc-600 dark:text-zinc-300">
                    {member.orgRole ?? '未知'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                      value={member.role}
                      onChange={(event) =>
                        onUpdateMemberRole(member.id, event.target.value as GroupRole)
                      }
                    >
                      <option value="member">成员</option>
                      <option value="publisher">发布人</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {member.addedAt
                      ? new Date(member.addedAt).toLocaleDateString('zh-CN')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-md px-3 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      onClick={() => onRemoveMember(member.id)}
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {groupMembersError ? (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            加载成员失败：{groupMembersError}
          </div>
        ) : null}
      </div>

      {groupMembers.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <PaginationControls
            page={pagination.page}
            pageCount={pagination.pageCount}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={pagination.setPage}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.setPageSize}
            label="位成员"
          />
        </div>
      ) : null}
    </section>
  );
}
