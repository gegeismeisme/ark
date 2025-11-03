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

type Metrics = {
  completionRate: number;
  acceptanceRate: number;
  overdueRate: number;
  reminderCoverage: number;
  pendingReminders: number;
};

type SummaryCardsProps = {
  totals: Totals;
  metrics: Metrics;
};

const cardClass =
  'flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900';

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export function SummaryCards({ totals, metrics }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">任务派发</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totals.assignments.toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          完成率 {formatPercent(metrics.completionRate)} · 验收率{' '}
          {formatPercent(metrics.acceptanceRate)}
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">调整反馈</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totals.changes.toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          其中逾期 {totals.overdue.toLocaleString('zh-CN')} 项（占比{' '}
          {formatPercent(metrics.overdueRate)}）
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">提醒触达</span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {(totals.dueReminders + totals.overdueReminders).toLocaleString('zh-CN')}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          覆盖率 {formatPercent(metrics.reminderCoverage)} · 待处理{' '}
          {metrics.pendingReminders.toLocaleString('zh-CN')} 条
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">执行亮点</span>
        <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            完成 {totals.completed.toLocaleString('zh-CN')} 项 · 验收{' '}
            {totals.accepted.toLocaleString('zh-CN')} 项
          </div>
          <div>逾期 {totals.overdue.toLocaleString('zh-CN')} 项 · 调整 {totals.changes.toLocaleString('zh-CN')} 次</div>
        </div>
      </div>
    </div>
  );
}
