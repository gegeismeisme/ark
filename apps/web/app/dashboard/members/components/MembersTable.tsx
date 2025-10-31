import { ROLE_LABELS, STATUS_LABELS } from '../constants';
import type { MemberRow, MemberStatus, OrgRole } from '../types';

type MembersTableProps = {
  members: MemberRow[];
  membersLoading: boolean;
  membersError: string | null;
  actionError: string | null;
  updatingId: string | null;
  isAdmin: boolean;
  formatDateTime: (value: string | null) => string;
  disableRoleChange: (member: MemberRow) => boolean;
  disableStatusChange: (member: MemberRow) => boolean;
  onRoleChange: (member: MemberRow, nextRole: OrgRole) => void;
  onStatusChange: (member: MemberRow, nextStatus: MemberStatus) => void;
  onRemoveMember: (member: MemberRow) => void;
};

export function MembersTable({
  members,
  membersLoading,
  membersError,
  actionError,
  updatingId,
  isAdmin,
  formatDateTime,
  disableRoleChange,
  disableStatusChange,
  onRoleChange,
  onStatusChange,
  onRemoveMember,
}: MembersTableProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">成员列表</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          查看成员角色与状态，必要时可以调整权限或停用帐号。
        </p>
      </div>

      {membersError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {membersError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/40">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3">成员</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">加入时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {membersLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
                  正在加载成员...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
                  当前没有成员。
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const busy = updatingId === member.id;
                return (
                  <tr key={member.id} className="text-sm">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {member.fullName ?? member.userId.slice(0, 8)}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        用户 ID：{member.userId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
                        value={member.role}
                        disabled={!isAdmin || disableRoleChange(member) || busy}
                        onChange={(event) => onRoleChange(member, event.target.value as OrgRole)}
                      >
                        {(Object.keys(ROLE_LABELS) as OrgRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
                        value={member.status}
                        disabled={!isAdmin || disableStatusChange(member) || busy}
                        onChange={(event) => onStatusChange(member, event.target.value as MemberStatus)}
                      >
                        {(Object.keys(STATUS_LABELS) as MemberStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(member.joinedAt ?? member.invitedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin ? (
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                          disabled={disableStatusChange(member) || busy}
                          onClick={() => onRemoveMember(member)}
                        >
                          移出组织
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">无权限</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
