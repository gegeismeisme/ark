import { t } from '../i18n';
import type { AssignmentStatus, JoinRequestStatus, ReviewStatus } from '../types';

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  sent: t('status.sent'),
  received: t('status.received'),
  completed: t('status.completed'),
  archived: t('status.archived'),
};

export const STATUS_OPTIONS: Array<{ value: 'all' | AssignmentStatus; label: string }> = [
  { value: 'all', label: t('status.all') },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'received', label: STATUS_LABELS.received },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'archived', label: STATUS_LABELS.archived },
];

export const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: t('requestStatus.pending'),
  approved: t('requestStatus.approved'),
  rejected: t('requestStatus.rejected'),
  cancelled: t('requestStatus.cancelled'),
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: t('review.pending'),
  accepted: t('review.accepted'),
  changes_requested: t('review.changes'),
};
