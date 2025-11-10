'use client';

import type { FC } from 'react';
import { Text, View } from 'react-native';

import { t } from '../../../i18n';
import type { Assignment, TaskAttachment } from '../../../types';
import { styles } from '../../../styles/appStyles';

type TaskTimelineProps = {
  assignment: Assignment | null;
  attachments?: TaskAttachment[];
  formatDateTime: (value: string | null) => string;
};

export const TaskTimeline: FC<TaskTimelineProps> = ({
  assignment,
  attachments,
  formatDateTime,
}) => {
  const events = buildTimeline(assignment, attachments);
  if (!events.length) return null;
  return (
    <View style={styles.timeline}>
      <Text style={styles.sectionTitle}>{t('task.timeline.title')}</Text>
      <View style={styles.timelineList}>
        {events.map((event, index) => (
          <View key={event.key} style={styles.timelineItem}>
            <View style={styles.timelineIconWrapper}>
              <Text style={styles.timelineIcon}>{event.icon}</Text>
              {index !== events.length - 1 ? <View style={styles.timelineConnector} /> : null}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>{event.label}</Text>
              <Text style={styles.timelineMeta}>
                {event.timestamp
                  ? formatDateTime(event.timestamp)
                  : t('task.timeline.pending')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

type TimelineEvent = {
  key: string;
  label: string;
  icon: string;
  timestamp: string | null;
};

const buildTimeline = (
  assignment: Assignment | null,
  attachments?: TaskAttachment[],
): TimelineEvent[] => {
  if (!assignment) return [];
  const events: TimelineEvent[] = [
    {
      key: 'created',
      label: t('task.timeline.created'),
      icon: '📝',
      timestamp: assignment.createdAt,
    },
    {
      key: 'received',
      label: t('task.timeline.received'),
      icon: '📥',
      timestamp: assignment.receivedAt,
    },
    {
      key: 'completed',
      label: t('task.timeline.completed'),
      icon: '✅',
      timestamp: assignment.completedAt,
    },
  ];

  if (assignment.reviewStatus === 'changes_requested') {
    events.push({
      key: 'changes',
      label: t('task.timeline.changesRequested'),
      icon: '✏️',
      timestamp: assignment.reviewedAt,
    });
  } else if (assignment.reviewStatus === 'accepted') {
    events.push({
      key: 'reviewed',
      label: t('task.timeline.accepted'),
      icon: '🏁',
      timestamp: assignment.reviewedAt,
    });
  } else if (assignment.reviewStatus === 'pending' && assignment.status === 'completed') {
    events.push({
      key: 'reviewPending',
      label: t('task.timeline.reviewPending'),
      icon: '⏳',
      timestamp: null,
    });
  }

  if (attachments?.length) {
    const sorted = [...attachments].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    sorted.slice(0, 4).forEach((attachment) => {
      events.push({
        key: `attachment-${attachment.id}`,
        label: t('task.timeline.attachment', { name: attachment.fileName }),
        icon: '📎',
        timestamp: attachment.uploadedAt,
      });
    });
  }

  return events;
};
