'use client';

import type { SVGProps } from 'react';
import { useRef, useState } from 'react';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';
import type { TaskAttachment, TaskAssignmentDetail } from '../types';
import { useLocale, useTranslations } from '@/lib/i18n/client';

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
    removingIds: string[];
    upload: (file: File) => Promise<void>;
    remove: (attachmentId: string) => Promise<void>;
    requestDownloadUrl: (path: string) => Promise<string>;
    pending: Array<{
      id: string;
      fileName: string;
      size: number;
      createdAt: string;
      error: string | null;
    }>;
    retryPending: (pendingId: string) => Promise<void>;
    discardPending: (pendingId: string) => void;
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

type IconProps = SVGProps<SVGSVGElement>;

function DownloadIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5" />
      <path d="M7.5 7.5L12 12m0 0l4.5-4.5M12 12V3" />
    </svg>
  );
}

function TrashIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M9 4.5V3.75A2.25 2.25 0 0111.25 1.5h1.5A2.25 2.25 0 0115 3.75V4.5" />
      <path d="M4.5 6.75h15" />
      <path d="M6.375 6.75L7.5 19.125A2.25 2.25 0 009.738 21h4.524A2.25 2.25 0 0016.5 19.125L17.625 6.75" />
      <path d="M10 10.5l-.375 7.5m4.125 0L13.375 10.5" />
    </svg>
  );
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
  const t = useTranslations();
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const attachmentRemovingIds = new Set(attachments.removingIds ?? []);
  const pagination = usePagination(records, { pageSize: 10 });

  if (!taskId) return null;

  const formatTimestamp = (value: string) => new Date(value).toLocaleString(locale);

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
      setDownloadError(
        err instanceof Error
          ? err.message
          : t('dashboard.tasks.detail.errors.downloadFallback')
      );
    }
  };

  const getStatusLabel = (status: TaskAssignmentDetail['status']) => {
    switch (status) {
      case 'completed':
        return t('dashboard.tasks.detail.status.completed');
      case 'in_progress':
        return t('dashboard.tasks.detail.status.inProgress');
      case 'sent':
      default:
        return t('dashboard.tasks.detail.status.pending');
    }
  };

  const getReviewStatusLabel = (status: TaskAssignmentDetail['reviewStatus']) => {
    if (status === 'accepted') {
      return t('dashboard.tasks.detail.review.accepted');
    }
    if (status === 'changes_requested') {
      return t('dashboard.tasks.detail.review.changesRequested');
    }
    return t('dashboard.tasks.detail.review.pending');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="relative flex w-full max-w-5xl flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {t('dashboard.tasks.detail.title')}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.detail.subtitle')}
              {requireAttachment
                ? ` ${t('dashboard.tasks.detail.subtitleAttachment')}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100">
                {t('dashboard.tasks.detail.attachments.title')}
              </h3>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {t('dashboard.tasks.detail.attachments.description')}
                {requireAttachment
                  ? ` ${t('dashboard.tasks.detail.attachments.requirementNote')}`
                  : ''}
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
              {attachments.uploading
                ? t('dashboard.tasks.detail.attachments.uploading')
                : t('dashboard.tasks.detail.attachments.add')}
            </label>
          </div>
          {attachments.error ? (
            <p className="text-xs text-red-500">{attachments.error}</p>
          ) : null}
          {downloadError ? <p className="text-xs text-red-500">{downloadError}</p> : null}
          {attachments.pending.length ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm dark:border-amber-400/30 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-200">
                {t('dashboard.tasks.detail.pending.title')}
              </p>
              <div className="space-y-3">
                {attachments.pending.map((pending) => (
                  <div
                    key={pending.id}
                    className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-white p-3 text-sm dark:border-amber-400/20 dark:bg-transparent sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{pending.fileName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatFileSize(pending.size)} · {new Date(pending.createdAt).toLocaleString(locale)}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {pending.error
                          ? t('dashboard.tasks.detail.pending.error', { error: pending.error })
                          : t('dashboard.tasks.detail.pending.stored')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        onClick={() => void attachments.retryPending(pending.id)}
                        disabled={attachments.uploading}
                      >
                        {attachments.uploading
                          ? t('common.processing')
                          : t('dashboard.tasks.detail.pending.retry')}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-400/30 dark:text-amber-200 dark:hover:bg-amber-400/10"
                        onClick={() => attachments.discardPending(pending.id)}
                      >
                        {t('dashboard.tasks.detail.pending.remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {attachments.loading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.detail.attachments.loading')}
            </p>
          ) : attachments.list.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.detail.attachments.empty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {attachments.list.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-200">
                      {item.fileName}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(item.sizeBytes)} · {item.contentType}
                      {item.uploadedAt
                        ? ` · ${t('dashboard.tasks.detail.attachments.uploadedAt', {
                            date: formatTimestamp(item.uploadedAt),
                          })}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={t('dashboard.tasks.detail.attachments.actions.download')}
                      title={t('dashboard.tasks.detail.attachments.actions.download')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                      onClick={() => void handleDownload(item.filePath)}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('dashboard.tasks.detail.attachments.actions.delete')}
                      title={t('dashboard.tasks.detail.attachments.actions.delete')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-500 transition hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:border-red-700 dark:hover:text-red-200"
                      disabled={attachmentRemovingIds.has(item.id)}
                      onClick={() => void attachments.remove(item.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100">
              {t('dashboard.tasks.detail.records.title')}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.detail.records.count', { count: records.length })}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.detail.records.loading')}
            </p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.detail.records.empty')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-300">
                  <tr>
                    <th className="px-3 py-2">{t('dashboard.tasks.detail.records.columns.member')}</th>
                    <th className="px-3 py-2">{t('dashboard.tasks.detail.records.columns.progress')}</th>
                    <th className="px-3 py-2">{t('dashboard.tasks.detail.records.columns.review')}</th>
                    <th className="px-3 py-2">{t('dashboard.tasks.detail.records.columns.notes')}</th>
                    <th className="px-3 py-2 text-right">
                      {t('dashboard.tasks.detail.records.columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((detail) => (
                    <tr key={detail.id} className="border-b border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {detail.assigneeName ?? detail.assigneeId.slice(0, 8)}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{detail.assigneeId}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {getStatusLabel(detail.status)}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {getReviewStatusLabel(detail.reviewStatus)}
                        {detail.reviewedAt ? (
                          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                            {formatTimestamp(detail.reviewedAt)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {detail.completionNote ? (
                          <div className="space-y-1">
                            <div>
                              {t('dashboard.tasks.detail.notes.execution', {
                                note: detail.completionNote,
                              })}
                            </div>
                            {detail.reviewNote ? (
                              <div>
                                {t('dashboard.tasks.detail.notes.review', { note: detail.reviewNote })}
                              </div>
                            ) : null}
                          </div>
                        ) : detail.reviewNote ? (
                          <div>
                            {t('dashboard.tasks.detail.notes.review', { note: detail.reviewNote })}
                          </div>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {t('dashboard.tasks.detail.notes.empty')}
                          </span>
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
                                {t('dashboard.tasks.detail.actions.accept')}
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-amber-300 px-3 py-1 text-amber-600 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                                onClick={() => void onReview(detail.id, 'changes_requested')}
                              >
                                {t('dashboard.tasks.detail.actions.requestChanges')}
                              </button>
                            </>
                          ) : detail.status !== 'completed' ? (
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {t('dashboard.tasks.detail.actions.waitingSubmission')}
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {t('dashboard.tasks.detail.actions.reviewFinished')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <PaginationControls
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  totalItems={pagination.totalItems}
                  startIndex={pagination.startIndex}
                  endIndex={pagination.endIndex}
                  onPageChange={pagination.setPage}
                  pageSize={pagination.pageSize}
                  onPageSizeChange={pagination.setPageSize}
                  label={t('dashboard.tasks.detail.paginationLabel')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
