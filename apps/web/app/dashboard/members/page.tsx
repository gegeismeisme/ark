'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { supabase } from '../../../lib/supabaseClient';
import { useOrgContext } from '../org-provider';

type OrgRole = 'owner' | 'admin' | 'member';
type MemberStatus = 'active' | 'invited' | 'suspended';
type OrgVisibility = 'public' | 'private';
type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type MemberRow = {
  id: string;
  userId: string;
  role: OrgRole;
  status: MemberStatus;
  joinedAt: string | null;
  invitedAt: string | null;
  fullName: string | null;
};

type InviteRow = {
  id: string;
  code: string;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
};

type JoinRequestRow = {
  id: string;
  userId: string;
  fullName: string | null;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  responseNote: string | null;
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: '活跃',
  invited: '待接受',
  suspended: '已停用',
};

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: '拥有者',
  admin: '管理员',
  member: '成员',
};

const VISIBILITY_LABELS: Record<OrgVisibility, string> = {
  public: '公开',
  private: '私密',
};

const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: '等待审核',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
};

const INVITE_EXPIRES_OPTIONS: Array<{ value: '7' | '30' | '0'; label: string }> = [
  { value: '7', label: '7 天后过期' },
  { value: '30', label: '30 天后过期' },
  { value: '0', label: '永久有效' },
];

const INVITE_QUOTA_OPTIONS: Array<{ value: '1' | '5' | '20' | '0'; label: string }> = [
  { value: '1', label: '允许 1 次使用' },
  { value: '5', label: '允许 5 次使用' },
  { value: '20', label: '允许 20 次使用' },
  { value: '0', label: '不限次数' },
];

function generateInviteCode(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type MembersTableProps = {
  members: MemberRow[];
  membersLoading: boolean;
  membersError: string | null;
  actionError: string | null;
  updatingId: string | null;
  isAdmin: boolean;
  disableRoleChange: (member: MemberRow) => boolean;
  disableStatusChange: (member: MemberRow) => boolean;
  onRoleChange: (member: MemberRow, nextRole: OrgRole) => void;
  onStatusChange: (member: MemberRow, nextStatus: MemberStatus) => void;
  onRemoveMember: (member: MemberRow) => void;
};

function MembersTable({
  members,
  membersLoading,
  membersError,
  actionError,
  updatingId,
  isAdmin,
  disableRoleChange,
  disableStatusChange,
  onRoleChange,
  onStatusChange,
  onRemoveMember,
}: MembersTableProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">组织成员</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          查看组织成员的角色与状态。管理员可以直接在此调整权限或停用成员。
        </p>
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
              {isAdmin ? <th className="px-4 py-2 text-right">操作</th> : null}
            </tr>
          </thead>
          <tbody>
            {membersLoading ? (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  正在加载成员...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  暂无成员记录。
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const pending = updatingId === member.id;
                return (
                  <tr
                    key={member.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {member.fullName ?? member.userId.slice(0, 8)}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {member.userId}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isAdmin ? (
                        <select
                          className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          value={member.role}
                          disabled={disableRoleChange(member) || pending}
                          onChange={(event) =>
                            onRoleChange(member, event.target.value as OrgRole)
                          }
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isAdmin ? (
                        <select
                          className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          value={member.status}
                          disabled={disableStatusChange(member) || pending}
                          onChange={(event) =>
                            onStatusChange(member, event.target.value as MemberStatus)
                          }
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {STATUS_LABELS[member.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(member.joinedAt ?? member.invitedAt)}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          type="button"
                          className="rounded-md px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                          disabled={disableStatusChange(member) || pending}
                          onClick={() => onRemoveMember(member)}
                        >
                          移除
                        </button>
                      </td>
                    ) : null}
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

type VisibilityCardProps = {
  visibility: OrgVisibility;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onChange: (next: OrgVisibility) => void;
};

function VisibilityCard({
  visibility,
  loading,
  saving,
  error,
  onChange,
}: VisibilityCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">组织可见性</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            公开组织会出现在组织目录中，便于成员通过搜索加入；私密组织仅支持邀请加入。
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(Object.keys(VISIBILITY_LABELS) as OrgVisibility[]).map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
              visibility === value
                ? 'border-zinc-900 bg-zinc-900/5 text-zinc-900 dark:border-zinc-200 dark:bg-zinc-100/10 dark:text-zinc-100'
                : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
            }`}
          >
            <input
              type="radio"
              name="org-visibility"
              value={value}
              className="mt-0.5"
              checked={visibility === value}
              onChange={() => onChange(value)}
              disabled={loading || saving}
            />
            <div>
              <div className="font-medium">{VISIBILITY_LABELS[value]}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {value === 'public'
                  ? '成员可以在组织目录中搜索并提交加入申请。'
                  : '组织不会在目录中展示，只能通过邀请链接加入。'}
              </div>
            </div>
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        保存状态：{loading ? '读取中…' : saving ? '保存中…' : '已同步'}
      </p>
      {error ? (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}

type InviteManagerProps = {
  invites: InviteRow[];
  loading: boolean;
  error: string | null;
  message: string | null;
  note: string;
  expires: '7' | '30' | '0';
  quota: '1' | '5' | '20' | '0';
  creating: boolean;
  onNoteChange: (value: string) => void;
  onExpiresChange: (value: '7' | '30' | '0') => void;
  onQuotaChange: (value: '1' | '5' | '20' | '0') => void;
  onCreateInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onCopyLink: (code: string) => void;
};

function InviteManager({
  invites,
  loading,
  error,
  message,
  note,
  expires,
  quota,
  creating,
  onNoteChange,
  onExpiresChange,
  onQuotaChange,
  onCreateInvite,
  onRevokeInvite,
  onCopyLink,
}: InviteManagerProps) {
  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">邀请链接</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          生成可分享的链接，让成员一键加入。链接可设置有效期与使用次数，随时撤销。
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            邀请说明（可选）
          </label>
          <input
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="给受邀成员的提示信息"
            disabled={creating}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col text-sm text-zinc-600 dark:text-zinc-400">
            有效期
            <select
              className="mt-1 h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={expires}
              onChange={(event) => onExpiresChange(event.target.value as '7' | '30' | '0')}
              disabled={creating}
            >
              {INVITE_EXPIRES_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col text-sm text-zinc-600 dark:text-zinc-400">
            使用次数
            <select
              className="mt-1 h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={quota}
              onChange={(event) => onQuotaChange(event.target.value as '1' | '5' | '20' | '0')}
              disabled={creating}
            >
              {INVITE_QUOTA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={onCreateInvite}
            disabled={creating}
          >
            {creating ? '生成中…' : '生成邀请链接'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          当前邀请
        </div>
        {loading ? (
          <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            正在获取邀请列表...
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            尚未生成邀请链接。
          </div>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => {
              const isRevoked = Boolean(invite.revokedAt);
              const isExpired = invite.expiresAt ? new Date(invite.expiresAt) < new Date() : false;
              const isExhausted =
                invite.maxUses !== null && invite.useCount >= invite.maxUses;
              const status = isRevoked
                ? '已撤销'
                : isExpired
                  ? '已过期'
                  : isExhausted
                    ? '已用尽'
                    : '可用';
              return (
                <li
                  key={invite.id}
                  className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {invite.note ?? '未添加说明'}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        代码：{invite.code} · 创建于 {formatDateTime(invite.createdAt)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {invite.expiresAt ? `有效期至 ${formatDateTime(invite.expiresAt)}` : '永久有效'}
                        {' · '}
                        使用：{invite.useCount}
                        {invite.maxUses ? `/${invite.maxUses}` : ' 次'}
                        {' · '}
                        状态：{status}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                        onClick={() => onCopyLink(invite.code)}
                      >
                        复制链接
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                        onClick={() => onRevokeInvite(invite.id)}
                        disabled={isRevoked}
                      >
                        撤销
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

type JoinRequestsPanelProps = {
  requests: JoinRequestRow[];
  loading: boolean;
  error: string | null;
  processingIds: Set<string>;
  onReview: (request: JoinRequestRow, nextStatus: 'approved' | 'rejected', note?: string | null) => void;
};

function JoinRequestsPanel({
  requests,
  loading,
  error,
  processingIds,
  onReview,
}: JoinRequestsPanelProps) {
  const pending = requests.filter((request) => request.status === 'pending');
  const processed = requests.filter((request) => request.status !== 'pending');

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">加入申请</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          审核用户提交的加入请求。通过后成员将自动加入组织，拒绝可附带说明以便通知申请者。
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载申请...
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300">
              待处理申请
              <span className="rounded-full bg-zinc-900/5 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-100/10 dark:text-zinc-300">
                {pending.length}
              </span>
            </div>
            {pending.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                当前没有新的申请。
              </div>
            ) : (
              <ul className="space-y-2">
                {pending.map((request) => {
                  const busy = processingIds.has(request.id);
                  return (
                    <li
                      key={request.id}
                      className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                    >
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {request.fullName ?? request.userId.slice(0, 8)}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            提交于 {formatDateTime(request.createdAt)}
                          </div>
                        </div>
                        {request.message ? (
                          <div className="rounded-md bg-zinc-900/5 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                            {request.message}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            className="rounded-md border border-emerald-400 px-3 py-1 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
                            disabled={busy}
                            onClick={() => onReview(request, 'approved')}
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                            disabled={busy}
                            onClick={() => {
                              const note = typeof window !== 'undefined'
                                ? window.prompt('请填写拒绝原因（可留空）：') ?? ''
                                : '';
                              onReview(request, 'rejected', note.trim() || null);
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              历史记录
            </div>
            {processed.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                暂无历史记录。
              </div>
            ) : (
              <ul className="space-y-2">
                {processed.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {request.fullName ?? request.userId.slice(0, 8)}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {REQUEST_STATUS_LABELS[request.status]} · 提交于 {formatDateTime(request.createdAt)}
                        {request.reviewedAt ? ` · 处理于 ${formatDateTime(request.reviewedAt)}` : ''}
                      </div>
                      {request.responseNote ? (
                        <div className="rounded-md bg-zinc-900/5 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                          备注：{request.responseNote}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MembersPage() {
  const { activeOrg, user, organizationsLoading, refreshOrganizations } = useOrgContext();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [orgVisibility, setOrgVisibility] = useState<OrgVisibility>('public');
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState('');
  const [inviteExpires, setInviteExpires] = useState<'7' | '30' | '0'>('7');
  const [inviteQuota, setInviteQuota] = useState<'1' | '5' | '20' | '0'>('1');
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [joinRequests, setJoinRequests] = useState<JoinRequestRow[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestError, setJoinRequestError] = useState<string | null>(null);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());

  const orgId = activeOrg?.id ?? null;
  const isAdmin = useMemo(
    () => activeOrg?.role === 'owner' || activeOrg?.role === 'admin',
    [activeOrg?.role]
  );

  const refreshMembers = useCallback(async () => {
    if (!orgId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);

    const { data, error } = await supabase
      .from('organization_member_details')
      .select('id, user_id, role, status, joined_at, invited_at, full_name, created_at')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setMembers([]);
      setMembersError(error.message);
      setMembersLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.id as string,
      userId: (row as { user_id: string }).user_id,
      role: (row as { role: OrgRole }).role,
      status: (row as { status: MemberStatus }).status,
      joinedAt: (row as { joined_at: string | null }).joined_at,
      invitedAt: (row as { invited_at: string | null }).invited_at,
      fullName: (row as { full_name: string | null }).full_name ?? null,
    }));

    setMembers(mapped);
    setMembersLoading(false);
  }, [orgId]);

  const refreshVisibility = useCallback(async () => {
    if (!orgId) {
      setOrgVisibility('public');
      return;
    }

    setVisibilityLoading(true);
    setVisibilityError(null);

    const { data, error } = await supabase
      .from('organizations')
      .select('visibility')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      setVisibilityError(error.message);
    } else if (data?.visibility) {
      setOrgVisibility(data.visibility as OrgVisibility);
    }

    setVisibilityLoading(false);
  }, [orgId]);

  const refreshInvites = useCallback(async () => {
    if (!orgId || !isAdmin) {
      setInvites([]);
      return;
    }

    setInvitesLoading(true);
    setInviteError(null);

    const { data, error } = await supabase
      .from('organization_invites')
      .select('id, code, note, created_at, expires_at, max_uses, use_count, revoked_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      setInvites([]);
      setInviteError(error.message);
      setInvitesLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.id as string,
      code: row.code as string,
      note: (row as { note: string | null }).note,
      createdAt: (row as { created_at: string }).created_at,
      expiresAt: (row as { expires_at: string | null }).expires_at,
      maxUses: (row as { max_uses: number | null }).max_uses,
      useCount: (row as { use_count: number }).use_count,
      revokedAt: (row as { revoked_at: string | null }).revoked_at,
    }));

    setInvites(mapped);
    setInvitesLoading(false);
  }, [isAdmin, orgId]);

  const refreshJoinRequests = useCallback(async () => {
    if (!orgId || !isAdmin) {
      setJoinRequests([]);
      return;
    }

    setJoinRequestsLoading(true);
    setJoinRequestError(null);

    const { data, error } = await supabase
      .from('organization_join_requests')
      .select('id, user_id, message, status, created_at, reviewed_at, response_note')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      setJoinRequests([]);
      setJoinRequestError(error.message);
      setJoinRequestsLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.id as string,
      userId: (row as { user_id: string }).user_id,
      fullName: null,
      message: (row as { message: string | null }).message,
      status: (row as { status: JoinRequestStatus }).status,
      createdAt: (row as { created_at: string }).created_at,
      reviewedAt: (row as { reviewed_at: string | null }).reviewed_at,
      responseNote: (row as { response_note: string | null }).response_note,
    }));

    setJoinRequests(mapped);
    setJoinRequestsLoading(false);
  }, [isAdmin, orgId]);

  useEffect(() => {
    void refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    void refreshVisibility();
    void refreshInvites();
    void refreshJoinRequests();
  }, [refreshInvites, refreshJoinRequests, refreshVisibility]);

  const disableRoleChange = useCallback(
    (member: MemberRow) => member.role === 'owner' || member.userId === user?.id,
    [user?.id]
  );

  const disableStatusChange = useCallback(
    (member: MemberRow) => member.role === 'owner' || member.userId === user?.id,
    [user?.id]
  );

  const handleRoleChange = useCallback(
    async (member: MemberRow, nextRole: OrgRole) => {
      if (!orgId) return;
      if (member.role === nextRole || disableRoleChange(member)) return;

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
        prev.map((row) => (row.id === member.id ? { ...row, role: nextRole } : row))
      );
      setUpdatingId(null);
    },
    [disableRoleChange, orgId]
  );

  const handleStatusChange = useCallback(
    async (member: MemberRow, nextStatus: MemberStatus) => {
      if (!orgId) return;
      if (member.status === nextStatus || disableStatusChange(member)) return;

      setUpdatingId(member.id);
      setActionError(null);

      const updates: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === 'active') {
        updates.removed_at = null;
        updates.joined_at = member.joinedAt ?? new Date().toISOString();
      } else if (nextStatus === 'suspended') {
        updates.removed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('organization_members')
        .update(updates)
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id
            ? {
                ...row,
                status: nextStatus,
                joinedAt:
                  nextStatus === 'active'
                    ? member.joinedAt ?? new Date().toISOString()
                    : row.joinedAt,
              }
            : row
        )
      );
      setUpdatingId(null);
    },
    [disableStatusChange, orgId]
  );

  const handleRemoveMember = useCallback(
    async (member: MemberRow) => {
      if (!orgId || disableStatusChange(member)) return;

      setUpdatingId(member.id);
      setActionError(null);

      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('organization_members')
        .update({
          status: 'suspended',
          removed_at: timestamp,
          updated_at: timestamp,
        })
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      setUpdatingId(null);
    },
    [disableStatusChange, orgId]
  );

  const handleUpdateVisibility = useCallback(
    async (next: OrgVisibility) => {
      if (!orgId || next === orgVisibility) return;

      setSavingVisibility(true);
      setVisibilityError(null);

      const { error } = await supabase
        .from('organizations')
        .update({ visibility: next })
        .eq('id', orgId);

      if (error) {
        setVisibilityError(error.message);
        setSavingVisibility(false);
        return;
      }

      setOrgVisibility(next);
      setSavingVisibility(false);
      void refreshOrganizations();
    },
    [orgId, orgVisibility, refreshOrganizations]
  );

  const handleCreateInvite = useCallback(async () => {
    if (!orgId || !isAdmin) return;

    setCreatingInvite(true);
    setInviteError(null);
    setInviteMessage(null);

    const code = generateInviteCode();
    const note = inviteNote.trim() || null;
    const expiresAt =
      inviteExpires === '0'
        ? null
        : new Date(
            Date.now() + (inviteExpires === '7' ? 7 : 30) * 24 * 60 * 60 * 1000
          ).toISOString();
    const maxUses = inviteQuota === '0' ? null : Number(inviteQuota);

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        code,
        note,
        created_by: user?.id ?? null,
        expires_at: expiresAt,
        max_uses: maxUses,
      })
      .select('id, code, note, created_at, expires_at, max_uses, use_count, revoked_at')
      .single();

    if (error) {
      setInviteError(error.message);
      setCreatingInvite(false);
      return;
    }

    setInvites((prev) => [
      {
        id: data.id as string,
        code: data.code as string,
        note: (data as { note: string | null }).note,
        createdAt: (data as { created_at: string }).created_at,
        expiresAt: (data as { expires_at: string | null }).expires_at,
        maxUses: (data as { max_uses: number | null }).max_uses,
        useCount: (data as { use_count: number }).use_count,
        revokedAt: (data as { revoked_at: string | null }).revoked_at,
      },
      ...prev,
    ]);
    setInviteNote('');
    setInviteMessage('邀请链接已生成，可复制后发送给成员。');
    setCreatingInvite(false);
  }, [inviteExpires, inviteNote, inviteQuota, isAdmin, orgId, user?.id]);

  const handleRevokeInvite = useCallback(
    async (inviteId: string) => {
      if (!orgId || !isAdmin) return;

      const { error } = await supabase
        .from('organization_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', inviteId);

      if (error) {
        setInviteError(error.message);
        return;
      }

      setInvites((prev) =>
        prev.map((invite) =>
          invite.id === inviteId ? { ...invite, revokedAt: new Date().toISOString() } : invite
        )
      );
    },
    [isAdmin, orgId]
  );

  const handleCopyInviteLink = useCallback((code: string) => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const url = `${origin}/invite/${code}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => setInviteMessage('邀请链接已复制到剪贴板。'))
        .catch(() => setInviteError('复制失败，请手动复制链接。'));
    } else if (typeof window !== 'undefined') {
      window.prompt('请复制邀请链接', url);
    }
  }, []);

  const handleReviewJoinRequest = useCallback(
    async (request: JoinRequestRow, nextStatus: 'approved' | 'rejected', note?: string | null) => {
      if (!isAdmin) return;

      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.add(request.id);
        return next;
      });

      const { error } = await supabase.rpc('review_org_join_request', {
        p_request_id: request.id,
        p_next_status: nextStatus,
        p_response_note: note ?? null,
      });

      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });

      if (error) {
        setJoinRequestError(error.message);
        return;
      }

      setJoinRequests((prev) =>
        prev.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: nextStatus,
                reviewedAt: new Date().toISOString(),
                responseNote: note ?? null,
              }
            : item
        )
      );

      if (nextStatus === 'approved') {
        void refreshMembers();
      }
    },
    [isAdmin, refreshMembers]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">组织成员</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">组织成员</h1>
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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">组织成员</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            管理组织可见性、邀请链接与加入申请，确保成员入组顺畅。
            {isAdmin ? (
              <>
                {' '}
                想让成员主动申请？去
                <Link className="mx-1 text-zinc-900 underline dark:text-zinc-100" href="/organizations">
                  组织目录
                </Link>
                查看公开展示效果。
              </>
            ) : null}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <VisibilityCard
              visibility={orgVisibility}
              loading={visibilityLoading}
              saving={savingVisibility}
              error={visibilityError}
              onChange={handleUpdateVisibility}
            />
            <InviteManager
              invites={invites}
              loading={invitesLoading}
              error={inviteError}
              message={inviteMessage}
              note={inviteNote}
              expires={inviteExpires}
              quota={inviteQuota}
              creating={creatingInvite}
              onNoteChange={setInviteNote}
              onExpiresChange={setInviteExpires}
              onQuotaChange={setInviteQuota}
              onCreateInvite={handleCreateInvite}
              onRevokeInvite={handleRevokeInvite}
              onCopyLink={handleCopyInviteLink}
            />
            <JoinRequestsPanel
              requests={joinRequests}
              loading={joinRequestsLoading}
              error={joinRequestError}
              processingIds={processingRequestIds}
              onReview={handleReviewJoinRequest}
            />
          </div>
          <MembersTable
            members={members}
            membersLoading={membersLoading}
            membersError={membersError}
            actionError={actionError}
            updatingId={updatingId}
            isAdmin
            disableRoleChange={disableRoleChange}
            disableStatusChange={disableStatusChange}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      ) : (
        <MembersTable
          members={members}
          membersLoading={membersLoading}
          membersError={membersError}
          actionError={null}
          updatingId={null}
          isAdmin={false}
          disableRoleChange={() => true}
          disableStatusChange={() => true}
          onRoleChange={() => undefined}
          onStatusChange={() => undefined}
          onRemoveMember={() => undefined}
        />
      )}
    </div>
  );
}
