export type AuthMode = 'signIn' | 'signUp';

export type TabKey = 'tasks' | 'invites';

export type AssignmentStatus = 'sent' | 'received' | 'completed' | 'archived';

export type ReviewStatus = 'pending' | 'accepted' | 'changes_requested';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type Assignment = {
  id: string;
  taskId: string;
  status: AssignmentStatus;
  createdAt: string;
  receivedAt: string | null;
  completedAt: string | null;
  completionNote: string | null;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    groupId: string | null;
    groupName: string | null;
    organizationId: string | null;
    organizationName: string | null;
  } | null;
};

type AssignmentTaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  group_id: string | null;
  organization_id: string | null;
  groups:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
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

export type AssignmentRow = {
  id: string;
  task_id: string;
  status: AssignmentStatus;
  created_at: string;
  received_at: string | null;
  completed_at: string | null;
  completion_note: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  tasks: AssignmentTaskRow | AssignmentTaskRow[] | null;
};

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
