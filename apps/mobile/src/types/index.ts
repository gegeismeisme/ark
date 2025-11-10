import type {
  Assignment,
  AssignmentRow,
  AssignmentStatus,
  ReviewStatus,
  TaskAttachment,
  TaskChecklistItem,
  TaskCore,
} from '@project-ark/shared';

export type AuthMode = 'signIn' | 'signUp';

export type TabKey = 'tasks' | 'publish' | 'insights' | 'account';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type JoinRequest = {
  id: string;
  organizationId: string;
  organizationName: string | null;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  responseNote: string | null;
};

export type JoinRequestRow = {
  id: string;
  organization_id: string;
  status: JoinRequestStatus;
  message: string | null;
  created_at: string;
  reviewed_at: string | null;
  response_note: string | null;
  organizations:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
  }[]
    | null;
};

export type {
  Assignment,
  AssignmentRow,
  AssignmentStatus,
  ReviewStatus,
  TaskAttachment,
  TaskChecklistItem,
  TaskCore,
};
