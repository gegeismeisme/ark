'use client';

export type GroupRole = 'member' | 'publisher' | 'admin';
export type OrgRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export type AdminGroup = {
  id: string;
  name: string;
};

export type AdminGroupRow = {
  group_id: string;
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
};

export type GroupMember = {
  id: string;
  userId: string;
  role: GroupRole;
  status: MemberStatus;
  fullName: string | null;
  orgRole?: OrgRole | null;
  addedAt?: string | null;
};

export type GroupMemberDetailRow = {
  id: string;
  group_id: string;
  organization_id: string;
  user_id: string;
  role: GroupRole;
  status: MemberStatus;
  added_at: string | null;
  full_name: string | null;
  organization_role: OrgRole | null;
};

export type TaskAssignment = {
  assignee_id: string;
  status: string;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  created_at: string;
  task_assignments: TaskAssignment[] | null;
};

export type TaskSummaryRow = {
  task_id: string;
  assignment_count: number;
  completed_count: number;
  accepted_count: number;
  changes_requested_count: number;
  overdue_count: number;
};

export type TaskAssignmentDetail = {
  id: string;
  assigneeId: string;
  assigneeName: string | null;
  status: string;
  completionNote: string | null;
  reviewStatus: 'pending' | 'accepted' | 'changes_requested';
  reviewNote: string | null;
  reviewedAt: string | null;
};

export type TaskAssignmentDetailRow = {
  id: string;
  assignee_id: string;
  status: string;
  completion_note: string | null;
  review_status: 'pending' | 'accepted' | 'changes_requested';
  review_note: string | null;
  reviewed_at: string | null;
  assignee_name: string | null;
};

export type TagSelectionType = 'single' | 'multiple';

export const tagSelectionLabels: Record<TagSelectionType, string> = {
  single: '单选',
  multiple: '多选',
};

export type TaskTagCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  selectionType: TagSelectionType;
  groupId: string | null;
  groupName: string | null;
  tags: Array<{ id: string; name: string; isActive: boolean }>;
};

export type MemberTagIndex = Map<string, Set<string>>;

export type AttachmentPreview = {
  path: string;
  uploadedAt: string;
  downloadUrl: string | null;
};

export const formInputClass =
  'h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
