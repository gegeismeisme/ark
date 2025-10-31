import type {
  JoinRequestStatus,
  MemberStatus,
  OrgRole,
  OrgVisibility,
} from './types';

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: '在职',
  invited: '已邀请',
  suspended: '已停用',
};

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
};

export const VISIBILITY_LABELS: Record<OrgVisibility, string> = {
  public: '公开',
  private: '私密',
};

export const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已撤回',
};

export const INVITE_EXPIRES_OPTIONS: Array<{ value: '7' | '30' | '0'; label: string }> = [
  { value: '7', label: '7 天后过期' },
  { value: '30', label: '30 天后过期' },
  { value: '0', label: '永久有效' },
];

export const INVITE_QUOTA_OPTIONS: Array<{ value: '1' | '5' | '20' | '0'; label: string }> = [
  { value: '1', label: '仅限 1 次' },
  { value: '5', label: '最多 5 次' },
  { value: '20', label: '最多 20 次' },
  { value: '0', label: '次数不限' },
];
