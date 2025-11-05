import type {
  JoinRequestStatus,
  MemberStatus,
  OrgRole,
  OrgVisibility,
} from './types';

export const STATUS_LABEL_KEYS: Record<MemberStatus, string> = {
  active: 'dashboard.members.status.active',
  invited: 'dashboard.members.status.invited',
  suspended: 'dashboard.members.status.suspended',
};

export const ROLE_LABEL_KEYS: Record<OrgRole, string> = {
  owner: 'dashboard.members.roles.owner',
  admin: 'dashboard.members.roles.admin',
  member: 'dashboard.members.roles.member',
};

export const VISIBILITY_LABEL_KEYS: Record<OrgVisibility, string> = {
  public: 'dashboard.members.visibility.public',
  private: 'dashboard.members.visibility.private',
};

export const REQUEST_STATUS_LABEL_KEYS: Record<JoinRequestStatus, string> = {
  pending: 'dashboard.members.joinRequests.status.pending',
  approved: 'dashboard.members.joinRequests.status.approved',
  rejected: 'dashboard.members.joinRequests.status.rejected',
  cancelled: 'dashboard.members.joinRequests.status.cancelled',
};

export const INVITE_EXPIRES_OPTIONS: Array<{ value: '7' | '30' | '0'; labelKey: string }> = [
  { value: '7', labelKey: 'dashboard.members.invite.expires.7' },
  { value: '30', labelKey: 'dashboard.members.invite.expires.30' },
  { value: '0', labelKey: 'dashboard.members.invite.expires.forever' },
];

export const INVITE_QUOTA_OPTIONS: Array<{ value: '1' | '5' | '20' | '0'; labelKey: string }> = [
  { value: '1', labelKey: 'dashboard.members.invite.quota.once' },
  { value: '5', labelKey: 'dashboard.members.invite.quota.five' },
  { value: '20', labelKey: 'dashboard.members.invite.quota.twenty' },
  { value: '0', labelKey: 'dashboard.members.invite.quota.unlimited' },
];
