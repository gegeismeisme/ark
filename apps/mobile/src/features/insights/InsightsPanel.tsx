'use client';

import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { t } from '../../i18n';
import type { Assignment } from '../../types';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { styles } from '../../styles/appStyles';

type InsightsPanelProps = {
  assignments: Assignment[];
  organization: ActiveOrganization | null;
  lastSyncedAt: string | null;
  formatDateTime: (value: string | null) => string;
};

export function InsightsPanel({
  assignments,
  organization,
  lastSyncedAt,
  formatDateTime,
}: InsightsPanelProps) {
  const metrics = useMemo(() => deriveMetrics(assignments), [assignments]);
  const overdueList = useMemo(() => deriveOverdue(assignments), [assignments]);
  const statusBreakdown = useMemo(() => deriveStatusBreakdown(assignments), [assignments]);
  const templateLeaderboard = useMemo(
    () => deriveTemplateLeaderboard(assignments),
    [assignments],
  );

  return (
    <View style={styles.panel}>
      <View>
        <Text style={styles.sectionTitle}>{t('insights.metrics.title')}</Text>
        <Text style={styles.sectionHint}>
          {organization
            ? t('insights.metrics.subtitle', { name: organization.name })
            : t('insights.metrics.subtitleFallback')}
        </Text>
        {lastSyncedAt ? (
          <Text style={styles.syncHint}>
            {t('insights.metrics.lastSynced', {
              time: formatDateTime(lastSyncedAt) ?? '--',
            })}
          </Text>
        ) : null}
      </View>

      {metrics.total === 0 ? (
        <Text style={styles.emptyText}>{t('insights.metrics.empty')}</Text>
      ) : (
        <>
          <View style={styles.insightRow}>
            <InsightCard
              label={t('insights.metrics.total')}
              value={metrics.total.toString()}
              icon="✅"
            />
            <InsightCard
              label={t('insights.metrics.completed')}
              value={`${metrics.completed}/${metrics.total}`}
              icon="🏁"
            />
          </View>
          <View style={styles.insightRow}>
            <InsightCard
              label={t('insights.metrics.completionRate')}
              value={`${Math.round(metrics.completionRate * 100)}%`}
              icon="📈"
            />
            <InsightCard
              label={t('insights.metrics.overdue')}
              value={metrics.overdue.toString()}
              icon="⏰"
            />
          </View>
        </>
      )}

      <View style={styles.insightList}>
        <Text style={styles.sectionTitle}>{t('insights.metrics.overdueListTitle')}</Text>
        {overdueList.length === 0 ? (
          <Text style={styles.emptyText}>{t('insights.metrics.overdueEmpty')}</Text>
        ) : (
          overdueList.map((assignment) => (
            <View key={assignment.id} style={styles.insightListItem}>
              <Text style={styles.insightListTitle}>
                {assignment.task?.title ?? t('task.list.placeholderTitle')}
              </Text>
              <Text style={styles.insightListMeta}>
                {assignment.task?.dueAt
                  ? formatDateTime(assignment.task.dueAt)
                  : t('task.attachments.optionalEmpty')}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.insightList}>
        <Text style={styles.sectionTitle}>{t('insights.metrics.statusBreakdown.title')}</Text>
        <Text style={styles.sectionHint}>{t('insights.metrics.statusBreakdown.body')}</Text>
        {statusBreakdown.map((item) => (
          <View key={item.key} style={styles.insightListItem}>
            <Text style={styles.insightListTitle}>
              {item.icon} {t(item.label)}
            </Text>
            <Text style={styles.insightListMeta}>
              {t('insights.metrics.statusBreakdown.count', { count: item.count })} ·{' '}
              {t('insights.metrics.statusBreakdown.percent', {
                value: Math.round(item.percentage * 100),
              })}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.insightList}>
        <Text style={styles.sectionTitle}>{t('insights.metrics.leaderboard.title')}</Text>
        <Text style={styles.sectionHint}>{t('insights.metrics.leaderboard.body')}</Text>
        {templateLeaderboard.length === 0 ? (
          <Text style={styles.emptyText}>{t('insights.metrics.leaderboard.empty')}</Text>
        ) : (
          templateLeaderboard.map((item) => (
            <View key={item.id} style={styles.insightListItem}>
              <Text style={styles.insightListTitle}>{item.title}</Text>
              <Text style={styles.insightListMeta}>
                {t('insights.metrics.leaderboard.stats', {
                  completion: `${item.completed}/${item.total}`,
                  percent: Math.round(item.completionRate * 100),
                })}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function InsightCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightLabel}>
        {icon} {label}
      </Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

const deriveMetrics = (assignments: Assignment[]) => {
  const total = assignments.length;
  const completed = assignments.filter((item) => item.status === 'completed').length;
  const overdue = assignments.filter((item) => {
    const due = item.task?.dueAt;
    if (!due) return false;
    const dueTime = new Date(due).getTime();
    if (Number.isNaN(dueTime)) return false;
    return dueTime < Date.now() && item.status !== 'completed' && item.status !== 'archived';
  }).length;

  return {
    total,
    completed,
    completionRate: total ? completed / total : 0,
    overdue,
  };
};

const deriveOverdue = (assignments: Assignment[]) =>
  assignments
    .filter((item) => {
      const due = item.task?.dueAt;
      if (!due) return false;
      const dueTime = new Date(due).getTime();
      if (Number.isNaN(dueTime)) return false;
      return dueTime < Date.now() && item.status !== 'completed' && item.status !== 'archived';
    })
    .sort((a, b) => {
      const dueA = a.task?.dueAt ? new Date(a.task.dueAt).getTime() : 0;
      const dueB = b.task?.dueAt ? new Date(b.task.dueAt).getTime() : 0;
      return dueA - dueB;
    })
    .slice(0, 3);

const STATUS_ICON_MAP: Record<Assignment['status'], string> = {
  sent: '📤',
  received: '🛠️',
  completed: '🏁',
  archived: '🗂️',
};

const deriveStatusBreakdown = (assignments: Assignment[]) => {
  const total = assignments.length || 1;
  const counts: Record<Assignment['status'], number> = {
    sent: 0,
    received: 0,
    completed: 0,
    archived: 0,
  };
  assignments.forEach((assignment) => {
    counts[assignment.status] += 1;
  });
  return Object.entries(counts).map(([status, count]) => ({
    key: status,
    icon: STATUS_ICON_MAP[status as Assignment['status']] ?? '📌',
    label: `status.${status}`,
    count,
    percentage: count / total,
  }));
};

const deriveTemplateLeaderboard = (assignments: Assignment[]) => {
  const map = new Map<
    string,
    { id: string; title: string; completed: number; total: number }
  >();
  assignments.forEach((assignment) => {
    if (!assignment.task?.id) return;
    const record =
      map.get(assignment.task.id) ??
      {
        id: assignment.task.id,
        title: assignment.task.title ?? t('task.list.placeholderTitle'),
        completed: 0,
        total: 0,
      };
    record.total += 1;
    if (assignment.status === 'completed') {
      record.completed += 1;
    }
    map.set(assignment.task.id, record);
  });
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      completionRate: item.total ? item.completed / item.total : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 3);
};
