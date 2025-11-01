'use client';

import { useRef } from 'react';

import type { AttachmentPreview, TaskAssignmentDetail } from '../types';

type TaskDetailPanelProps = {
  taskId: string | null;
  records: TaskAssignmentDetail[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onReview: (assignmentId: string, reviewStatus: 'accepted' | 'changes_requested') => Promise<void>;
  attachments: {
    items: AttachmentPreview[];
    uploading: boolean;
    error: string | null;
    upload: (file: File) => Promise<void>;
  };
};

export function TaskDetailPanel({
  taskId,
  records,
  loading,
  error,
  onClose,
  onReview,
  attachments,
}: TaskDetailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!taskId) return null;

  const handleFileChange = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    await attachments.upload(file);
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
            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100">附件上传（实验版）</h3>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              附件会上传至 Supabase Storage 并返回临时下载链接，目前不会自动写入任务附件表，请记录路径以便后续归档。
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
            {attachments.uploading ? '上传中...' : '选择文件'}
          </label>
        </div>
        {attachments.error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {attachments.error}
          </div>
        ) : null}
        {attachments.items.length ? (
          <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="font-medium text-zinc-600 dark:text-zinc-200">最近上传</div>
            {attachments.items.map((item) => (
              <div key={`${item.path}-${item.uploadedAt}`} className="flex flex-wrap items-center gap-2">
                <span className="truncate">{item.path}</span>
                {item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 underline hover:text-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    下载链接
                  </a>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">（未生成临时链接）</span>
                )}
                <span className="text-zinc-400 dark:text-zinc-500">{item.uploadedAt}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">正在加载执行情况…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      ) : records.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">暂无指派记录。</p>
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
              {records.map((detail) => (
                <tr key={detail.id} className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {detail.assigneeName ?? detail.assigneeId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{detail.assigneeId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">{detail.status}</td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {detail.reviewStatus === 'pending'
                      ? '待验收'
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
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">待成员提交后再验收</span>
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
