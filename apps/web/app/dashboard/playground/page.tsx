'use client';

import { useMemo } from 'react';

import {
  GroupOverviewList,
  SummaryCards,
  TaskExecutionTable,
  type GroupOverviewRow,
  type TaskExecutionRow,
} from '../analytics/components';

const sampleTotals = {
  assignments: 24,
  completed: 18,
  accepted: 14,
  changes: 4,
  overdue: 3,
  dueReminders: 12,
  overdueReminders: 6,
  pendingDue: 2,
  pendingOverdue: 1,
};

const sampleTasks: TaskExecutionRow[] = [
  {
    taskId: 'demo-1',
    title: '班会资料收集',
    groupId: 'group-1',
    groupName: 'A 班',
    dueAt: new Date().toISOString(),
    assignments: 10,
    completed: 8,
    accepted: 6,
    changes: 2,
    overdue: 1,
    dueReminders: 6,
    overdueReminders: 3,
    pendingDue: 1,
    pendingOverdue: 0,
    completionRate: '80%',
    acceptanceRate: '75%',
  },
  {
    taskId: 'demo-2',
    title: '课程反馈整理',
    groupId: 'group-2',
    groupName: 'B 班',
    dueAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
    assignments: 14,
    completed: 10,
    accepted: 8,
    changes: 2,
    overdue: 2,
    dueReminders: 6,
    overdueReminders: 3,
    pendingDue: 1,
    pendingOverdue: 1,
    completionRate: '71%',
    acceptanceRate: '80%',
  },
];

const sampleGroups: GroupOverviewRow[] = [
  {
    groupId: 'group-1',
    groupName: 'A 班',
    assignments: 12,
    completed: 9,
    accepted: 7,
    changes: 2,
    overdue: 1,
    dueReminders: 6,
    overdueReminders: 3,
    pendingDue: 1,
    pendingOverdue: 0,
  },
  {
    groupId: 'group-2',
    groupName: 'B 班',
    assignments: 12,
    completed: 9,
    accepted: 7,
    changes: 2,
    overdue: 2,
    dueReminders: 6,
    overdueReminders: 3,
    pendingDue: 1,
    pendingOverdue: 1,
  },
];

export default function PlaygroundPage() {
  const summaryMetrics = useMemo(
    () => ({
      completionRate:
        sampleTotals.assignments > 0
          ? sampleTotals.completed / sampleTotals.assignments
          : 0,
      acceptanceRate:
        sampleTotals.completed > 0
          ? sampleTotals.accepted / sampleTotals.completed
          : 0,
      overdueRate:
        sampleTotals.assignments > 0 ? sampleTotals.overdue / sampleTotals.assignments : 0,
      reminderCoverage:
        sampleTotals.assignments > 0
          ? (sampleTotals.dueReminders + sampleTotals.overdueReminders) /
            sampleTotals.assignments
          : 0,
      pendingReminders: sampleTotals.pendingDue + sampleTotals.pendingOverdue,
    }),
    []
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">组件 Playground</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          此页面用于快速浏览仪表板组件的示例数据，便于在无需真实数据的情况下校验视觉与交互。
        </p>
      </div>

      <SummaryCards totals={sampleTotals} metrics={summaryMetrics} />

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">任务执行一览</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            表格展示 summary 数据映射后的效果，表头排序、分页等交互与正式页面保持一致。
          </p>
        </header>
        <TaskExecutionTable rows={sampleTasks} loading={false} error={null} />
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">小组概览</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            通过样例数据校验分页、统计标签和颜色控制是否符合预期。
          </p>
        </header>
        <GroupOverviewList rows={sampleGroups} />
      </section>
    </div>
  );
}
