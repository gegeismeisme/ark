'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';
import type { TaskItem } from '../types';

type TaskListProps = {
  tasks: TaskItem[];
  loading: boolean;
  onViewAssignments: (taskId: string) => void;
  assignmentSummary: (taskId: string) => string;
  onEditTask: (task: TaskItem) => void;
  onDeleteTasks: (taskIds: string[]) => Promise<void>;
};

export function TaskList({
  tasks,
  loading,
  onViewAssignments,
  assignmentSummary,
  onEditTask,
  onDeleteTasks,
}: TaskListProps) {
  const pagination = usePagination(tasks, { pageSize: 10 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => tasks.some((task) => task.id === id)));
  }, [tasks]);

  const currentPageIds = useMemo(
    () => pagination.paginatedItems.map((task) => task.id),
    [pagination.paginatedItems],
  );

  const selectedCount = selectedIds.length;
  const allSelectedOnPage =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedCount > 0 && !allSelectedOnPage && currentPageIds.length > 0;
    }
  }, [selectedCount, allSelectedOnPage, currentPageIds.length]);

  const toggleRow = (taskId: string) => {
    setSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const toggleAllOnPage = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => {
      const merged = new Set(prev);
      currentPageIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const confirmDelete = (count: number) => {
    if (typeof window === 'undefined') return true;
    return window.confirm(`确认删除选中的 ${count} 个任务吗？此操作无法撤销。`);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || deleting) return;
    if (!confirmDelete(selectedIds.length)) return;
    setDeleting(true);
    try {
      await onDeleteTasks(selectedIds);
      setSelectedIds([]);
    } finally {
      setDeleting(false);
    }
  };

  const handleRowDelete = async (taskId: string) => {
    if (deleting) return;
    if (!confirmDelete(1)) return;
    setDeleting(true);
    try {
      await onDeleteTasks([taskId]);
      setSelectedIds((prev) => prev.filter((id) => id !== taskId));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)] shadow-[0_26px_80px_-50px_rgba(8,13,20,0.85)]">
      <div className="flex flex-col gap-3 border-b border-[var(--ark-border-subtle)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ark-text-primary)]">任务列表</h3>
          <p className="text-xs text-[var(--ark-text-tertiary)]">
            支持筛选执行对象、批量删除与查看执行明细。
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--ark-text-tertiary)]">
          <span>当前共 {tasks.length} 条任务</span>
          {selectedCount > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] px-3 py-1 text-xs font-semibold text-[var(--ark-text-primary)] transition hover:translate-y-[-1px]"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              删除选中 ({selectedCount})
            </button>
          ) : null}
        </div>
      </div>
      {loading ? (
        <div className="px-6 py-6 text-sm text-[var(--ark-text-tertiary)]">正在加载任务...</div>
      ) : tasks.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[var(--ark-text-tertiary)]">
          暂无任务记录。创建新任务后可在此查看执行概况。
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm text-[var(--ark-text-secondary)]">
              <thead>
                <tr className="border-b border-[var(--ark-border-subtle)] text-xs uppercase tracking-wide text-[var(--ark-text-tertiary)]">
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--ark-border-subtle)] text-[var(--ark-accent)] focus:ring-[var(--ark-accent)]"
                      onChange={toggleAllOnPage}
                      checked={currentPageIds.length > 0 && allSelectedOnPage}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">任务信息</th>
                  <th className="px-4 py-3 text-left">执行进度</th>
                  <th className="w-56 px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((task) => {
                  const isSelected = selectedIds.includes(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-[var(--ark-border-subtle)] transition ${
                        isSelected
                          ? "bg-[var(--ark-panel-surface)]/70"
                          : "hover:bg-[var(--ark-panel-surface)]/50"
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--ark-border-subtle)] text-[var(--ark-accent)] focus:ring-[var(--ark-accent)]"
                          checked={isSelected}
                          onChange={() => toggleRow(task.id)}
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="text-sm font-semibold text-[var(--ark-text-primary)]">
                          {task.title}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-[var(--ark-text-tertiary)]">
                          <span>创建：{new Date(task.created_at).toLocaleString('zh-CN')}</span>
                          {task.due_at ? (
                            <span>截止：{new Date(task.due_at).toLocaleString('zh-CN')}</span>
                          ) : null}
                          {task.require_attachment ? (
                            <span className="inline-flex items-center rounded-full bg-[rgba(62,207,142,0.14)] px-2 py-0.5 text-[var(--ark-accent)] shadow-[0_0_0_1px_rgba(62,207,142,0.25)]">
                              需附件
                            </span>
                          ) : null}
                        </div>
                        {task.description ? (
                          <p className="mt-3 line-clamp-2 text-sm text-[var(--ark-text-secondary)]">
                            {task.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-[var(--ark-text-tertiary)]">
                        {assignmentSummary(task.id)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-full border border-[var(--ark-border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)]"
                            onClick={() => onEditTask(task)}
                            disabled={deleting}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-full border border-[rgba(248,113,113,0.45)] px-3 py-1 text-xs font-semibold text-[rgba(248,113,113,0.9)] transition hover:bg-[rgba(248,113,113,0.12)] disabled:opacity-60"
                            onClick={() => void handleRowDelete(task.id)}
                            disabled={deleting}
                          >
                            删除
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-full border border-[var(--ark-border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)]"
                            onClick={() => void onViewAssignments(task.id)}
                          >
                            查看明细
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--ark-border-subtle)] px-6 py-4">
            <PaginationControls
              page={pagination.page}
              pageCount={pagination.pageCount}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setPage}
              pageSize={pagination.pageSize}
              onPageSizeChange={pagination.setPageSize}
              label="任务"
            />
          </div>
        </>
      )}
    </div>
  );
}
