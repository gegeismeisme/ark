'use client';

import type { TaskItem } from '../types';

type TaskListProps = {
  tasks: TaskItem[];
  loading: boolean;
  onViewAssignments: (taskId: string) => void;
  assignmentSummary: (taskId: string) => string;
};

export function TaskList({ tasks, loading, onViewAssignments, assignmentSummary }: TaskListProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
        已发布的任务
      </div>
      {loading ? (
        <div className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">正在加载任务…</div>
      ) : tasks.length === 0 ? (
        <div className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">暂时还没有任务记录。</div>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {tasks.map((task) => (
            <li key={task.id} className="px-4 py-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    创建于 {new Date(task.created_at).toLocaleString()}
                    {task.due_at ? ` · 截止 ${new Date(task.due_at).toLocaleString()}` : ''}
                  </div>
                  {task.require_attachment ? (
                    <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-200">
                      需附件
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{assignmentSummary(task.id)}</span>
                  <button
                    type="button"
                    className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onClick={() => void onViewAssignments(task.id)}
                  >
                    查看执行明细
                  </button>
                </div>
              </div>
              {task.description ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{task.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
