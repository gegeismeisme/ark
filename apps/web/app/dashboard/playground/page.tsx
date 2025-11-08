"use client";

import { useMemo } from "react";

import { useTranslations } from "@/lib/i18n/client";

import {
  GroupOverviewList,
  SummaryCards,
  TaskExecutionTable,
  type GroupOverviewRow,
  type TaskExecutionRow,
} from "../analytics/components";

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

const taskTemplates: Array<
  Omit<TaskExecutionRow, "title" | "groupName"> & { titleKey: string; groupKey: string }
> = [
  {
    taskId: "demo-1",
    titleKey: "dashboard.playground.tasks.task1",
    groupId: "group-1",
    groupKey: "dashboard.playground.groups.alpha",
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
    completionRate: "80%",
    acceptanceRate: "75%",
  },
  {
    taskId: "demo-2",
    titleKey: "dashboard.playground.tasks.task2",
    groupId: "group-2",
    groupKey: "dashboard.playground.groups.beta",
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
    completionRate: "71%",
    acceptanceRate: "80%",
  },
];

const groupTemplates: Array<Omit<GroupOverviewRow, "groupName"> & { groupKey: string }> = [
  {
    groupId: "group-1",
    groupKey: "dashboard.playground.groups.alpha",
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
    groupId: "group-2",
    groupKey: "dashboard.playground.groups.beta",
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
  const t = useTranslations();

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
    [],
  );

  const taskRows = useMemo<TaskExecutionRow[]>(
    () =>
      taskTemplates.map(({ titleKey, groupKey, ...rest }) => ({
        ...rest,
        title: t(titleKey),
        groupName: t(groupKey),
      })),
    [t],
  );

  const groupRows = useMemo<GroupOverviewRow[]>(
    () =>
      groupTemplates.map(({ groupKey, ...rest }) => ({
        ...rest,
        groupName: t(groupKey),
      })),
    [t],
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t("dashboard.playground.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t("dashboard.playground.subtitle")}
        </p>
      </div>

      <SummaryCards totals={sampleTotals} metrics={summaryMetrics} />

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t("dashboard.playground.taskSection.title")}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("dashboard.playground.taskSection.description")}
          </p>
        </header>
        <TaskExecutionTable rows={taskRows} loading={false} error={null} />
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t("dashboard.playground.groupSection.title")}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("dashboard.playground.groupSection.description")}
          </p>
        </header>
        <GroupOverviewList rows={groupRows} />
      </section>
    </div>
  );
}
