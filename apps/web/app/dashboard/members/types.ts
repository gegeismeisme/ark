export type OrgRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type OrgVisibility = 'public' | 'private';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type MemberRow = {
  id: string;
  userId: string;
  role: OrgRole;
  status: MemberStatus;
  joinedAt: string | null;
  invitedAt: string | null;
  fullName: string | null;
};

export type InviteRow = {
  id: string;
  code: string;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
};

export type JoinRequestRow = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  responseNote: string | null;
};
