import {
  INVITE_EXPIRES_OPTIONS,
  INVITE_QUOTA_OPTIONS,
} from '../constants';
import type { InviteRow } from '../types';

type InviteManagerProps = {
  invites: InviteRow[];
  loading: boolean;
  error: string | null;
  message: string | null;
  note: string;
  expires: '7' | '30' | '0';
  quota: '1' | '5' | '20' | '0';
  creating: boolean;
  formatDateTime: (value: string | null) => string;
  onNoteChange: (value: string) => void;
  onExpiresChange: (value: '7' | '30' | '0') => void;
  onQuotaChange: (value: '1' | '5' | '20' | '0') => void;
  onCreateInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onCopyLink: (code: string) => void;
};

export function InviteManager({
  invites,
  loading,
  error,
  message,
  note,
  expires,
  quota,
  creating,
  formatDateTime,
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
          生成可分享的加入链接，支持设置有效期和使用次数。也可以随时撤销失效的链接。
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
            placeholder="提供给被邀请人的简短说明"
            disabled={creating}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col text-sm text-zinc-600 dark:text-zinc-400">
            有效期
            <select
              className="mt-1 h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={expires}
              disabled={creating}
              onChange={(event) => onExpiresChange(event.target.value as '7' | '30' | '0')}
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
              disabled={creating}
              onChange={(event) => onQuotaChange(event.target.value as '1' | '5' | '20' | '0')}
            >
              {INVITE_QUOTA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={creating}
          onClick={onCreateInvite}
        >
          {creating ? '生成中...' : '生成邀请链接'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">已创建的链接</div>
        {loading ? (
          <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            正在加载邀请链接...
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            暂无邀请链接，创建后会在此列出。
          </div>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => {
              const expired = invite.expiresAt ? new Date(invite.expiresAt) <= new Date() : false;
              const revoked = Boolean(invite.revokedAt);
              return (
                <li
                  key={invite.id}
                  className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        邀请码：{invite.code}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        创建于 {formatDateTime(invite.createdAt)}
                      </div>
                    </div>

                    {invite.note ? (
                      <div className="rounded-md bg-zinc-900/5 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                        {invite.note}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>已使用 {invite.useCount} 次</span>
                      {invite.maxUses ? <span>限制 {invite.maxUses} 次</span> : <span>次数不限</span>}
                      <span>
                        {invite.expiresAt
                          ? `有效期至 ${formatDateTime(invite.expiresAt)}`
                          : '永久有效'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => onCopyLink(invite.code)}
                      >
                        复制链接
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                        disabled={revoked}
                        onClick={() => onRevokeInvite(invite.id)}
                      >
                        {revoked ? '已撤销' : '撤销链接'}
                      </button>
                      {expired && !revoked ? (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-200">
                          已过期
                        </span>
                      ) : null}
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
