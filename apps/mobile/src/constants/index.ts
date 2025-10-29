import type { AssignmentStatus, JoinRequestStatus, ReviewStatus } from '../types';

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  sent: '待开始',
  received: '进行中',
  completed: '已完成',
  archived: '已归档',
};

export const STATUS_OPTIONS: Array<{ value: 'all' | AssignmentStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'received', label: STATUS_LABELS.received },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'archived', label: STATUS_LABELS.archived },
];

export const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: '等待审核',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待验收',
  accepted: '已验收',
  changes_requested: '需调整',
};
