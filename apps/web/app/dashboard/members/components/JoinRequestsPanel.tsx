import { REQUEST_STATUS_LABELS } from '../constants';
import type { JoinRequestRow } from '../types';

type JoinRequestsPanelProps = {
  requests: JoinRequestRow[];
  loading: boolean;
  error: string | null;
  processingIds: Set<string>;
  formatDateTime: (value: string | null) => string;
  onReview: (request: JoinRequestRow, nextStatus: 'approved' | 'rejected', note?: string | null) => void;
  onRefresh: () => void;
};

export function JoinRequestsPanel({
  requests,
  loading,
  error,
  processingIds,
  formatDateTime,
  onReview,
  onRefresh,
}: JoinRequestsPanelProps) {
  const pending = requests.filter((request) => request.status === 'pending');
  const processed = requests.filter((request) => request.status !== 'pending');

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">加入申请</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            审核组织目录中的成员申请，通过后会自动加入；驳回时可附上说明，系统会通知申请人。
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={onRefresh}
        >
          刷新
        </button>
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
                暂无新的加入申请。
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
                            {request.fullName ?? request.email ?? request.userId.slice(0, 8)}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {request.email ?? '未填写邮箱'} · 提交于 {formatDateTime(request.createdAt)}
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
                            className="rounded-md border border-emerald-400 px-3 py-1 text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
                            disabled={busy}
                            onClick={() => onReview(request, 'approved')}
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                            disabled={busy}
                            onClick={() => {
                              const note =
                                typeof window !== 'undefined'
                                  ? window.prompt('请输入驳回原因（可留空）') ?? ''
                                  : '';
                              onReview(request, 'rejected', note.trim() || null);
                            }}
                          >
                            驳回
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
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">历史记录</div>
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
                        {request.fullName ?? request.email ?? request.userId.slice(0, 8)}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {REQUEST_STATUS_LABELS[request.status]} · 提交于 {formatDateTime(request.createdAt)}
                        {request.reviewedAt ? ` · 处理于 ${formatDateTime(request.reviewedAt)}` : ''}
                      </div>
                      {request.responseNote ? (
                        <div className="rounded-md bg-zinc-900/5 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                          说明：{request.responseNote}
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
