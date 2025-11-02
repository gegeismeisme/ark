'use client';

type Totals = {
  assignments: number;
  completed: number;
  accepted: number;
  changes: number;
  overdue: number;
  dueReminders: number;
  overdueReminders: number;
  pendingDue: number;
  pendingOverdue: number;
};

type SummaryCardsProps = {
  totals: Totals;
};

const cardClass =
  'flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900';

export function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">任务派发</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totals.assignments.toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          完成 {totals.completed.toLocaleString('zh-CN')} · 验收{' '}
          {totals.accepted.toLocaleString('zh-CN')}
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">调整反馈</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totals.changes.toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          其中逾期 {totals.overdue.toLocaleString('zh-CN')} 项
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">到期提醒</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totals.dueReminders.toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          待处理 {totals.pendingDue.toLocaleString('zh-CN')} 条
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">逾期提醒</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totals.overdueReminders.toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          待处理 {totals.pendingOverdue.toLocaleString('zh-CN')} 条
        </div>
      </div>
    </div>
  );
}
