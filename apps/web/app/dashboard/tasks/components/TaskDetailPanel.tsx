'use client';

import { useRef, useState } from 'react';

import type { TaskAttachment, TaskAssignmentDetail } from '../types';

type TaskDetailPanelProps = {
  taskId: string | null;
  requireAttachment: boolean;
  records: TaskAssignmentDetail[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onReview: (assignmentId: string, reviewStatus: 'accepted' | 'changes_requested') => Promise<void>;
  attachments: {
    list: TaskAttachment[];
    loading: boolean;
    uploading: boolean;
    error: string | null;
    upload: (file: File) => Promise<void>;
    requestDownloadUrl: (path: string) => Promise<string>;
  };
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

function renderStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return '已提交';
    case 'in_progress':
      return '进行中';
    case 'sent':
      return '待开始';
    default:
      return status;
  }
}

function renderReviewStatusLabel(status: TaskAssignmentDetail['reviewStatus']) {
  if (status === 'pending') return '待验收';
  if (status === 'accepted') return '已通过';
  return '需调整';
}

export function TaskDetailPanel({
  taskId,
  requireAttachment,
  records,
  loading,
  error,
  onClose,
  onReview,
  attachments,
}: TaskDetailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!taskId) return null;

  const handleFileChange = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    fileInputRef.current.value = '';
    await attachments.upload(file);
  };

  const handleDownload = async (path: string) => {
    setDownloadError(null);
    try {
      const url = await attachments.requestDownloadUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : '下载失败，请稍后再试。');
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">执行明细</h2>
        <button
          type="button"
          className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={onClose}
        >
          收起
        </button>
      </div>

      <div className="mt-4 space-y-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100">任务附件</h3>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              文件托管在 Supabase Storage，下载时会即时生成临时链接。
              {requireAttachment ? ' 本任务要求成员提交附件，验收前请确认资料是否齐全。' : ''}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={attachments.uploading}
            />
            {attachments.uploading ? '上传中…' : '追加附件'}
          </label>
        </div>

        {(attachments.loading || attachments.uploading) && (
          <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            正在同步附件，请稍候。
          </div>
        )}

        {attachments.error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {attachments.error}
          </div>
        ) : null}

        {downloadError ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-600 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            {downloadError}
          </div>
        ) : null}

        {attachments.list.length ? (
          <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="font-medium text-zinc-600 dark:text-zinc-200">附件列表</div>
            {attachments.list.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div>
                  <div className="font-medium text-zinc-700 dark:text-zinc-200">{item.fileName}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(item.sizeBytes)} · {new Date(item.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
                  onClick={() => void handleDownload(item.filePath)}
                >
                  下载
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">暂无附件。</p>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">正在加载执行情况…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      ) : records.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">暂无执行记录。</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-300">
              <tr>
                <th className="px-3 py-2">成员</th>
                <th className="px-3 py-2">进度</th>
                <th className="px-3 py-2">验收</th>
                <th className="px-3 py-2">说明</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((detail) => (
                <tr key={detail.id} className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {detail.assigneeName ?? detail.assigneeId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{detail.assigneeId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {renderStatusLabel(detail.status)}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {renderReviewStatusLabel(detail.reviewStatus)}
                    {detail.reviewedAt ? (
                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                        {new Date(detail.reviewedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {detail.completionNote ? (
                      <div>
                        <div>执行人：{detail.completionNote}</div>
                        {detail.reviewNote ? <div>验收备注：{detail.reviewNote}</div> : null}
                      </div>
                    ) : detail.reviewNote ? (
                      <div>验收备注：{detail.reviewNote}</div>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">暂无说明</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <div className="flex justify-end gap-2">
                      {detail.status === 'completed' && detail.reviewStatus === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="rounded-md border border-emerald-300 px-3 py-1 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
                            onClick={() => void onReview(detail.id, 'accepted')}
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-amber-300 px-3 py-1 text-amber-600 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                            onClick={() => void onReview(detail.id, 'changes_requested')}
                          >
                            调整
                          </button>
                        </>
                      ) : detail.status !== 'completed' ? (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          待成员提交后再验收
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">验收已完成</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
