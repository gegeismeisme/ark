import type { AssignmentStatus, JoinRequestStatus, ReviewStatus } from '../types';

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  sent: 'Not started',
  received: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const STATUS_OPTIONS: Array<{ value: 'all' | AssignmentStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'received', label: STATUS_LABELS.received },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'archived', label: STATUS_LABELS.archived },
];

export const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Awaiting review',
  accepted: 'Accepted',
  changes_requested: 'Changes requested',
};
