'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../../../lib/supabaseClient';
import { useOrgContext } from '../../org-provider';
import {
  AdminGroup,
  AdminGroupRow,
  AttachmentPreview,
  GroupMember,
  GroupMemberDetailRow,
  MemberTagIndex,
  TaskAssignmentDetail,
  TaskAssignmentDetailRow,
  TaskItem,
  TaskSummaryRow,
  TaskTagCategory,
  TagSelectionType,
  tagSelectionLabels,
} from '../types';

type UseTaskDashboardResult = {
  organizationsLoading: boolean;
  orgId: string | null;
  userId: string | null;
  groups: {
    list: AdminGroup[];
    loading: boolean;
    error: string | null;
    selectedId: string | null;
    select: (id: string) => void;
  };
  selectedGroup: AdminGroup | null;
  groupMembers: {
    list: GroupMember[];
    filtered: GroupMember[];
    loading: boolean;
    error: string | null;
  };
  tagCategories: {
    list: TaskTagCategory[];
    loading: boolean;
    error: string | null;
    filterable: TaskTagCategory[];
    tagFilters: Record<string, string[]>;
    selectionLabels: Record<TagSelectionType, string>;
    hasActiveFilters: boolean;
    activeFilterCount: number;
    resetFilters: () => void;
    handleSingleChange: (categoryId: string, value: string) => void;
    handleToggle: (categoryId: string, tagId: string, checked: boolean) => void;
  };
  assignees: {
    selected: string[];
    toggle: (userId: string) => void;
    selectAll: () => void;
    clear: () => void;
  };
  composer: {
    title: string;
    setTitle: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    dueAt: string;
    setDueAt: (value: string) => void;
    creating: boolean;
    error: string | null;
    createTask: () => Promise<void>;
  };
  tasks: {
    list: TaskItem[];
    loading: boolean;
    error: string | null;
    summary: (taskId: string) => string;
    viewAssignments: (taskId: string) => Promise<void>;
  };
  detail: {
    taskId: string | null;
    records: TaskAssignmentDetail[];
    loading: boolean;
    error: string | null;
    close: () => void;
    review: (assignmentId: string, reviewStatus: 'accepted' | 'changes_requested') => Promise<void>;
  };
  attachments: {
    items: AttachmentPreview[];
    uploading: boolean;
    error: string | null;
    upload: (file: File) => Promise<void>;
  };
};

export function useTaskDashboard(): UseTaskDashboardResult {
  const { activeOrg, user, organizationsLoading } = useOrgContext();

  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskSummaries, setTaskSummaries] = useState<Record<string, TaskSummaryRow>>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<TaskAssignmentDetail[]>([]);
  const [assignmentDetailsLoading, setAssignmentDetailsLoading] = useState(false);
  const [assignmentDetailsError, setAssignmentDetailsError] = useState<string | null>(null);

  const [tagCategories, setTagCategories] = useState<TaskTagCategory[]>([]);
  const [tagCategoriesLoading, setTagCategoriesLoading] = useState(false);
  const [tagCategoriesError, setTagCategoriesError] = useState<string | null>(null);
  const [memberTagIndex, setMemberTagIndex] = useState<MemberTagIndex>(new Map());
  const [tagFilters, setTagFilters] = useState<Record<string, string[]>>({});

  const [uploadedAttachments, setUploadedAttachments] = useState<AttachmentPreview[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const orgId = activeOrg?.id ?? null;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!orgId || !userId) {
      setGroups([]);
      setSelectedGroupId(null);
      return;
    }

    let cancelled = false;
    setGroupsLoading(true);
    setGroupsError(null);

    (async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setGroups([]);
        setGroupsError(error.message);
        setGroupsLoading(false);
        return;
      }

      const rows = (data ?? []) as AdminGroupRow[];
      const mapped: AdminGroup[] =
        rows
          .map((row) => {
            const group = Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups ?? null;
            if (!group) return null;
            return { id: group.id, name: group.name } satisfies AdminGroup;
          })
          .filter((item): item is AdminGroup => Boolean(item)) ?? [];

      setGroups(mapped);
      setSelectedGroupId((current) => current ?? mapped[0]?.id ?? null);
      setGroupsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, userId]);

  useEffect(() => {
    if (!orgId) {
      setTagCategories([]);
      setTagCategoriesError(null);
      setTagFilters({});
      return;
    }

    let cancelled = false;
    setTagCategoriesLoading(true);
    setTagCategoriesError(null);

    (async () => {
      const { data, error } = await supabase
        .from('organization_tag_categories')
        .select(
          'id, name, is_required, selection_type, group_id, groups(id, name), organization_tags(id, name, is_active, category_id)'
        )
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        setTagCategories([]);
        setTagCategoriesError(error.message);
        setTagCategoriesLoading(false);
        return;
      }

      const mapped =
        (data ?? []).map((row) => {
          const group = Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups ?? null;
          return {
            id: row.id as string,
            name: row.name as string,
            isRequired: row.is_required as boolean,
            selectionType: row.selection_type as TagSelectionType,
            groupId: (row.group_id as string | null) ?? null,
            groupName: group?.name ?? null,
            tags:
              row.organization_tags?.map((tag: { id: string; name: string; is_active: boolean }) => ({
                id: tag.id,
                name: tag.name,
                isActive: tag.is_active,
              })) ?? [],
          };
        }) ?? [];

      setTagCategories(mapped);
      setTagCategoriesLoading(false);
      setTagFilters((prev) => {
        const next: Record<string, string[]> = {};
        mapped.forEach((category) => {
          next[category.id] = prev[category.id] ?? [];
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const refreshGroupMembers = useCallback(
    async (groupId: string | null) => {
      if (!groupId) {
        setGroupMembers([]);
        setMemberTagIndex(new Map());
        return;
      }

      setGroupMembersLoading(true);
      setGroupMembersError(null);

      const { data, error } = await supabase
        .from('group_member_details')
        .select('id, group_id, organization_id, user_id, role, status, added_at, full_name, organization_role')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('removed_at', null)
        .order('role', { ascending: false });

      if (error) {
        setGroupMembers([]);
        setGroupMembersError(error.message);
        setGroupMembersLoading(false);
        return;
      }

      const rows = (data ?? []) as GroupMemberDetailRow[];
      const mapped: GroupMember[] = rows.map(
        ({ id, user_id, role, status, full_name, organization_role, added_at }) => ({
          id,
          userId: user_id,
          role,
          status,
          fullName: full_name ?? null,
          orgRole: organization_role,
          addedAt: added_at,
        })
      );

      setGroupMembers(mapped);
      setGroupMembersLoading(false);

      if (!orgId || mapped.length === 0) {
        setMemberTagIndex(new Map());
        return;
      }

      const userIds = mapped.map((member) => member.userId);
      const { data: membershipRows, error: membershipError } = await supabase
        .from('organization_member_details')
        .select('id, user_id')
        .eq('organization_id', orgId)
        .in('user_id', userIds);

      if (membershipError) {
        console.error('[tasks] fetch membership ids error:', membershipError);
        setMemberTagIndex(new Map());
        return;
      }

      const membershipMap = new Map<string, string>();
      const membershipReverse = new Map<string, string>();
      (membershipRows ?? []).forEach((row) => {
        membershipMap.set(row.user_id as string, row.id as string);
        membershipReverse.set(row.id as string, row.user_id as string);
      });

      const membershipIds = Array.from(membershipReverse.keys());
      if (!membershipIds.length) {
        setMemberTagIndex(new Map());
        return;
      }

      const { data: memberTagsRows, error: memberTagsError } = await supabase
        .from('member_tags')
        .select('member_id, tag_id')
        .in('member_id', membershipIds)
        .eq('organization_id', orgId);

      if (memberTagsError) {
        console.error('[tasks] fetch member tags error:', memberTagsError);
        setMemberTagIndex(new Map());
        return;
      }

      const index: MemberTagIndex = new Map();
      (memberTagsRows ?? []).forEach((row) => {
        const userIdForMember = membershipReverse.get(row.member_id as string);
        if (!userIdForMember) return;
        if (!index.has(userIdForMember)) {
          index.set(userIdForMember, new Set());
        }
        index.get(userIdForMember)!.add(row.tag_id as string);
      });

      setMemberTagIndex(index);
    },
    [orgId]
  );

  const refreshTasks = useCallback(
    async (groupId: string | null) => {
      if (!groupId || !orgId) {
        setTasks([]);
        setTaskSummaries({});
        return;
      }

      setTasksLoading(true);
      setTasksError(null);

      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, title, description, due_at, created_at, task_assignments(assignee_id, status)'
        )
        .eq('group_id', groupId)
        .eq('organization_id', orgId)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        setTasks([]);
        setTaskSummaries({});
        setTasksError(error.message);
        setTasksLoading(false);
        return;
      }

      setTasks((data ?? []) as TaskItem[]);
      setTasksLoading(false);

      const { data: summaryRows, error: summaryError } = await supabase
        .from('task_assignment_summary')
        .select('*')
        .eq('group_id', groupId);

      if (summaryError) {
        console.error('[tasks] summary fetch error:', summaryError);
        setTaskSummaries({});
        return;
      }

      const summaryMap: Record<string, TaskSummaryRow> = {};
      (summaryRows ?? []).forEach((row) => {
        const cast = row as TaskSummaryRow;
        summaryMap[cast.task_id] = cast;
      });
      setTaskSummaries(summaryMap);
    },
    [orgId]
  );

  useEffect(() => {
    void refreshGroupMembers(selectedGroupId);
    void refreshTasks(selectedGroupId);
    setSelectedAssignees([]);
  }, [refreshGroupMembers, refreshTasks, selectedGroupId]);

  const filterableCategories = useMemo(() => {
    if (!selectedGroupId) {
      return tagCategories.filter((category) => category.groupId === null && category.tags.length > 0);
    }
    return tagCategories.filter(
      (category) =>
        (category.groupId === null || category.groupId === selectedGroupId) && category.tags.length > 0
    );
  }, [selectedGroupId, tagCategories]);

  const relevantCategoryIds = useMemo(
    () => new Set(filterableCategories.map((category) => category.id)),
    [filterableCategories]
  );

  useEffect(() => {
    setTagFilters((prev) => {
      const next: Record<string, string[]> = {};
      let changed = false;

      filterableCategories.forEach((category) => {
        const existing = prev[category.id] ?? [];
        next[category.id] = existing;
        if (existing.length > 0) {
          changed = true;
        }
      });

      if (changed || Object.keys(prev).length !== Object.keys(next).length) {
        return next;
      }

      return prev;
    });
  }, [filterableCategories, relevantCategoryIds]);

  const matchesTagFilters = useCallback(
    (userId: string) => {
      const activeFilters = Object.entries(tagFilters)
        .map(([categoryId, tagIds]) => ({
          categoryId,
          tagIds,
        }))
        .filter(({ categoryId, tagIds }) => relevantCategoryIds.has(categoryId) && tagIds.length > 0);

      if (activeFilters.length === 0) return true;

      const userTags = memberTagIndex.get(userId) ?? new Set<string>();

      return activeFilters.every(({ categoryId, tagIds }) => {
        const category = filterableCategories.find((item) => item.id === categoryId);
        if (!category) return true;
        if (category.selectionType === 'single') {
          return tagIds.some((tagId) => userTags.has(tagId));
        }
        return tagIds.every((tagId) => userTags.has(tagId));
      });
    },
    [filterableCategories, memberTagIndex, relevantCategoryIds, tagFilters]
  );

  const filteredGroupMembers = useMemo(
    () => groupMembers.filter((member) => matchesTagFilters(member.userId)),
    [groupMembers, matchesTagFilters]
  );

  const handleToggleAssignee = useCallback((userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedAssignees(filteredGroupMembers.map((member) => member.userId));
  }, [filteredGroupMembers]);

  const handleClearAssignees = useCallback(() => {
    setSelectedAssignees([]);
  }, []);

  const activeFilterCount = useMemo(() => {
    let total = 0;
    relevantCategoryIds.forEach((categoryId) => {
      total += tagFilters[categoryId]?.length ?? 0;
    });
    return total;
  }, [relevantCategoryIds, tagFilters]);

  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    setSelectedAssignees((previous) => previous.filter((userId) => matchesTagFilters(userId)));
  }, [matchesTagFilters]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const assignmentSummary = useCallback(
    (taskId: string) => {
      const summary = taskSummaries[taskId];
      if (!summary || summary.assignment_count === 0) return '未指派成员';
      const { assignment_count, completed_count, accepted_count, changes_requested_count, overdue_count } = summary;
      return `完成 ${completed_count}/${assignment_count} · 验收 ${accepted_count}/${assignment_count}${
        changes_requested_count > 0 ? ` · 待修改 ${changes_requested_count}` : ''
      }${overdue_count > 0 ? ` · 逾期 ${overdue_count}` : ''}`;
    },
    [taskSummaries]
  );

  const fetchAssignmentDetails = useCallback(
    async (taskId: string) => {
      setAssignmentDetailsLoading(true);
      setAssignmentDetailsError(null);

      const { data, error } = await supabase
        .from('task_assignments')
        .select('id, assignee_id, status, completion_note, review_status, review_note, reviewed_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        setAssignmentDetails([]);
        setAssignmentDetailsError(error.message);
        setAssignmentDetailsLoading(false);
        return;
      }

      const memberNameMap = new Map<string, string | null>();
      groupMembers.forEach((member) => {
        memberNameMap.set(member.userId, member.fullName ?? null);
      });

      const mapped =
        (data ?? []).map((row: TaskAssignmentDetailRow) => ({
          id: row.id,
          assigneeId: row.assignee_id,
          assigneeName: memberNameMap.get(row.assignee_id) ?? null,
          status: row.status,
          completionNote: row.completion_note,
          reviewStatus: row.review_status,
          reviewNote: row.review_note,
          reviewedAt: row.reviewed_at,
        })) ?? [];

      setAssignmentDetails(mapped);
      setAssignmentDetailsLoading(false);
    },
    [groupMembers]
  );

  const handleViewAssignments = useCallback(
    async (taskId: string) => {
      setDetailTaskId(taskId);
      setAssignmentDetails([]);
      await fetchAssignmentDetails(taskId);
    },
    [fetchAssignmentDetails]
  );

  const handleReviewUpdate = useCallback(
    async (assignmentId: string, reviewStatus: 'accepted' | 'changes_requested') => {
      const note = window.prompt(
        reviewStatus === 'accepted' ? '可选：填写验收备注' : '请输入需调整的说明',
        ''
      );

      const { error } = await supabase
        .from('task_assignments')
        .update({
          review_status: reviewStatus,
          review_note: note && note.trim().length > 0 ? note.trim() : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', assignmentId);

      if (error) {
        setAssignmentDetailsError(error.message);
        return;
      }

      if (detailTaskId) {
        await fetchAssignmentDetails(detailTaskId);
        await refreshTasks(selectedGroupId);
      }
    },
    [detailTaskId, fetchAssignmentDetails, refreshTasks, selectedGroupId, userId]
  );

  const handleCreateTask = useCallback(async () => {
    if (!selectedGroupId || !orgId || !userId) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateError('请输入任务标题');
      return;
    }

    setCreatingTask(true);
    setCreateError(null);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        organization_id: orgId,
        group_id: selectedGroupId,
        created_by: userId,
        title: trimmedTitle,
        description: description.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      setCreateError(error.message);
      setCreatingTask(false);
      return;
    }

    const taskId = (data as { id: string }).id;

    if (selectedAssignees.length > 0) {
      const assignments = selectedAssignees.map((assigneeId) => ({
        task_id: taskId,
        assignee_id: assigneeId,
        status: 'sent',
      }));
      const { error: assignmentError } = await supabase.from('task_assignments').insert(assignments);
      if (assignmentError) {
        setCreateError(assignmentError.message);
        setCreatingTask(false);
        return;
      }
    }

    setTitle('');
    setDescription('');
    setDueAt('');
    setSelectedAssignees([]);
    await refreshTasks(selectedGroupId);
    setCreatingTask(false);
  }, [
    description,
    dueAt,
    orgId,
    refreshTasks,
    selectedAssignees,
    selectedGroupId,
    title,
    userId,
  ]);

  const handleResetTagFilters = useCallback(() => {
    setTagFilters(() => {
      const next: Record<string, string[]> = {};
      relevantCategoryIds.forEach((categoryId) => {
        next[categoryId] = [];
      });
      return next;
    });
  }, [relevantCategoryIds]);

  const handleTagFilterSingleChange = useCallback((categoryId: string, value: string) => {
    setTagFilters((prev) => ({
      ...prev,
      [categoryId]: value ? [value] : [],
    }));
  }, []);

  const handleTagFilterToggle = useCallback((categoryId: string, tagId: string, checked: boolean) => {
    setTagFilters((prev) => {
      const next = { ...prev };
      const current = new Set(next[categoryId] ?? []);
      if (checked) {
        current.add(tagId);
      } else {
        current.delete(tagId);
      }
      next[categoryId] = Array.from(current);
      return next;
    });
  }, []);

  useEffect(() => {
    setUploadedAttachments([]);
    setAttachmentError(null);
    setUploadingAttachment(false);
  }, [detailTaskId]);

  const handleAttachmentUpload = useCallback(
    async (file: File) => {
      if (!detailTaskId) return;
      setAttachmentError(null);
      setUploadingAttachment(true);

      try {
        const signResponse = await fetch('/api/storage/sign-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: detailTaskId,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });

        if (!signResponse.ok) {
          const body = await signResponse.json().catch(() => ({}));
          throw new Error(body.error ?? '签名生成失败，请稍后再试。');
        }

        const { url, path } = (await signResponse.json()) as { url: string; path: string };

        const uploadResponse = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error('上传到存储失败，请稍后再试。');
        }

        let signedUrl: string | null = null;
        try {
          const downloadRes = await fetch('/api/storage/sign-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
          });
          if (downloadRes.ok) {
            const data = (await downloadRes.json()) as { url?: string };
            signedUrl = data.url ?? null;
          }
        } catch {
          signedUrl = null;
        }

        setUploadedAttachments((prev) => [
          {
            path,
            uploadedAt: new Date().toLocaleString(),
            downloadUrl: signedUrl,
          },
          ...prev,
        ]);
      } catch (error) {
        setAttachmentError(error instanceof Error ? error.message : '上传失败，请稍后再试。');
      } finally {
        setUploadingAttachment(false);
      }
    },
    [detailTaskId]
  );

  const handleCloseDetail = useCallback(() => {
    setDetailTaskId(null);
    setAssignmentDetails([]);
    setUploadedAttachments([]);
    setAttachmentError(null);
  }, []);

  return {
    organizationsLoading,
    orgId,
    userId,
    groups: {
      list: groups,
      loading: groupsLoading,
      error: groupsError,
      selectedId: selectedGroupId,
      select: setSelectedGroupId,
    },
    selectedGroup,
    groupMembers: {
      list: groupMembers,
      filtered: filteredGroupMembers,
      loading: groupMembersLoading,
      error: groupMembersError,
    },
    tagCategories: {
      list: tagCategories,
      loading: tagCategoriesLoading,
      error: tagCategoriesError,
      filterable: filterableCategories,
      tagFilters,
      selectionLabels: tagSelectionLabels,
      hasActiveFilters,
      activeFilterCount,
      resetFilters: handleResetTagFilters,
      handleSingleChange: handleTagFilterSingleChange,
      handleToggle: handleTagFilterToggle,
    },
    assignees: {
      selected: selectedAssignees,
      toggle: handleToggleAssignee,
      selectAll: handleSelectAll,
      clear: handleClearAssignees,
    },
    composer: {
      title,
      setTitle,
      description,
      setDescription,
      dueAt,
      setDueAt,
      creating: creatingTask,
      error: createError,
      createTask: handleCreateTask,
    },
    tasks: {
      list: tasks,
      loading: tasksLoading,
      error: tasksError,
      summary: assignmentSummary,
      viewAssignments: handleViewAssignments,
    },
    detail: {
      taskId: detailTaskId,
      records: assignmentDetails,
      loading: assignmentDetailsLoading,
      error: assignmentDetailsError,
      close: handleCloseDetail,
      review: handleReviewUpdate,
    },
    attachments: {
      items: uploadedAttachments,
      uploading: uploadingAttachment,
      error: attachmentError,
      upload: handleAttachmentUpload,
    },
  };
}
