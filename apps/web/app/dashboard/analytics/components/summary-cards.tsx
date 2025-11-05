'use client';

import { useMemo } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';

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
  const t = useTranslations();
  const locale = useLocale();

  const strings = useMemo(
    () => ({
      assignments: totals.assignments.toLocaleString(locale),
      completion: totals.completed.toLocaleString(locale),
      acceptance: totals.accepted.toLocaleString(locale),
      changes: totals.changes.toLocaleString(locale),
      overdue: totals.overdue.toLocaleString(locale),
      dueReminders: totals.dueReminders.toLocaleString(locale),
      overdueReminders: totals.overdueReminders.toLocaleString(locale),
      pendingDue: totals.pendingDue.toLocaleString(locale),
      pendingOverdue: totals.pendingOverdue.toLocaleString(locale),
      pendingReminders: metrics.pendingReminders.toLocaleString(locale),
    }),
    [locale, metrics.pendingReminders, totals]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.assignments.title')}
        </span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {strings.assignments}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.assignments.body', {
            completion: formatPercent(metrics.completionRate),
            acceptance: formatPercent(metrics.acceptanceRate),
          })}
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.changes.title')}
        </span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {strings.changes}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.changes.body', {
            overdue: strings.overdue,
            overdueRate: formatPercent(metrics.overdueRate),
          })}
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.reminders.title')}
        </span>
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {(totals.dueReminders + totals.overdueReminders).toLocaleString(locale)}
        </span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.reminders.body', {
            coverage: formatPercent(metrics.reminderCoverage),
            pending: strings.pendingReminders,
          })}
        </div>
      </div>

      <div className={cardClass}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t('dashboard.analytics.summary.highlights.title')}
        </span>
        <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            {t('dashboard.analytics.summary.highlights.line1', {
              completed: strings.completion,
              accepted: strings.acceptance,
            })}
          </div>
          <div>
            {t('dashboard.analytics.summary.highlights.line2', {
              overdue: strings.overdue,
              changes: strings.changes,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
