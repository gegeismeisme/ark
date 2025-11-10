import type { SupabaseClient } from '@supabase/supabase-js';

export type AssignmentStatus = 'sent' | 'received' | 'completed' | 'archived';
export type ReviewStatus = 'pending' | 'accepted' | 'changes_requested';

export type TaskChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  isCustom?: boolean;
  source?: 'markdown' | 'custom' | 'synced';
};

export type TaskAttachment = {
  id: string;
  taskId: string;
  fileName: string;
  filePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type AssignmentTaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  group_id: string | null;
  organization_id: string | null;
  require_attachment: boolean | null;
  groups?:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
  organizations?:
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

export type TaskCore = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  groupId: string | null;
  groupName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  requireAttachment: boolean;
  checklist: TaskChecklistItem[];
};

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
  task: TaskCore | null;
};

const CHECKLIST_PATTERN = /^\s*[-*]\s*\[(x|\s)\]\s*(.+)$/i;

const fallbackId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `chk-${Date.now().toString(36)}-${counter}`;
  };
})();

export const parseChecklist = (description?: string | null): TaskChecklistItem[] => {
  if (!description) return [];
  const lines = description.split(/\r?\n/);
  const result: TaskChecklistItem[] = [];
  lines.forEach((line, index) => {
    const match = line.match(CHECKLIST_PATTERN);
    if (!match) return;
    const [, flag, label] = match;
    result.push({
      id: `desc-${index}`,
      label: label.trim(),
      completed: flag.trim().toLowerCase() === 'x',
      source: 'markdown',
    });
  });
  return result;
};

export const mergeChecklistProgress = (
  baseItems: TaskChecklistItem[],
  storedItems: TaskChecklistItem[] | null | undefined,
): TaskChecklistItem[] => {
  if (!storedItems || storedItems.length === 0) {
    return baseItems;
  }

  const storedById = new Map(storedItems.map((item) => [item.id, item]));
  const storedByLabel = new Map(
    storedItems.map((item) => [item.label.trim().toLowerCase(), item]),
  );

  const merged = baseItems.map((item) => {
    const stored =
      storedById.get(item.id) ??
      storedByLabel.get(item.label.trim().toLowerCase()) ??
      null;
    if (!stored) return item;
    return {
      ...item,
      completed: stored.completed,
      completedAt: stored.completedAt,
      completedBy: stored.completedBy,
    };
  });

  storedItems.forEach((item) => {
    const exists = merged.some(
      (base) =>
        base.id === item.id ||
        base.label.trim().toLowerCase() === item.label.trim().toLowerCase(),
    );
    if (!exists) {
      merged.push(item);
    }
  });

  return merged;
};

export const createChecklistItem = (label: string): TaskChecklistItem => ({
  id: fallbackId(),
  label: label.trim(),
  completed: false,
  isCustom: true,
  source: 'custom',
});

export const extractTaskFromRow = (row: AssignmentRow): TaskCore | null => {
  const raw = row.tasks;
  const task = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  if (!task) return null;

  const groupRaw = task.groups;
  const group = Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;

  const orgRaw = task.organizations;
  const organization = Array.isArray(orgRaw) ? orgRaw[0] ?? null : orgRaw ?? null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.due_at,
    groupId: task.group_id,
    groupName: group?.name ?? null,
    organizationId: task.organization_id ?? null,
    organizationName: organization?.name ?? null,
    requireAttachment: Boolean(task.require_attachment),
    checklist: parseChecklist(task.description),
  };
};

export const mapAssignmentRow = (row: AssignmentRow): Assignment => ({
  id: row.id,
  taskId: row.task_id,
  status: row.status,
  createdAt: row.created_at,
  receivedAt: row.received_at,
  completedAt: row.completed_at,
  completionNote: row.completion_note,
  reviewStatus: row.review_status,
  reviewNote: row.review_note,
  reviewedAt: row.reviewed_at,
  reviewedBy: row.reviewed_by,
  task: extractTaskFromRow(row),
});

export const fetchAssignments = async ({
  client,
  userId,
  filters,
}: {
  client: SupabaseClient;
  userId: string;
  filters?: { organizationId?: string };
}): Promise<Assignment[]> => {
  const builder = client
    .from('task_assignments')
    .select(
      `
        id,
        task_id,
        status,
        created_at,
        received_at,
        completed_at,
        completion_note,
        review_status,
        review_note,
        reviewed_at,
        reviewed_by,
        tasks(
          id,
          title,
          description,
          due_at,
          group_id,
          organization_id,
          require_attachment,
          groups(id, name),
          organizations(id, name)
        )
      `,
    )
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.organizationId) {
    builder.eq('tasks.organization_id', filters.organizationId);
  }

  const { data, error } = await builder;
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as AssignmentRow[];
  return rows.map(mapAssignmentRow);
};
