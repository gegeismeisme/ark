'use client';

import { useCallback, useMemo } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase as defaultSupabase } from '../../../../../../lib/supabaseClient';
import { useOrgContext } from '../../org-provider';
import {
  AttachmentDraft,
  AdminGroup,
  GroupMember,
  TaskAttachment,
  TaskAssignmentDetail,
  TaskItem,
  TaskTagCategory,
  TagSelectionType,
  tagSelectionLabels,
} from '../../types';
import { useGroupsState } from './groups';
import { useTagFiltersState } from './tag-filters';
import { useGroupMembersState } from './group-members';
import { useAssigneesSelection } from './assignees';
import { useTasksState } from './tasks';
import { useTaskDetailState } from './detail';
import { useTaskComposerState } from './composer';

type UseTaskDashboardOptions = {
  client?: SupabaseClient;
  fetchImpl?: typeof fetch;
  prompt?: (message: string, defaultValue?: string) => string | null;
};

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
    requireAttachment: boolean;
    setRequireAttachment: (value: boolean) => void;
    attachments: {
      pending: AttachmentDraft[];
      addFiles: (files: FileList | null) => void;
      removeFile: (id: string) => void;
      uploading: boolean;
      error: string | null;
    };
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
    requireAttachment: boolean;
    records: TaskAssignmentDetail[];
    loading: boolean;
    error: string | null;
    close: () => void;
    review: (assignmentId: string, reviewStatus: 'accepted' | 'changes_requested') => Promise<void>;
    attachments: {
      list: TaskAttachment[];
      loading: boolean;
      uploading: boolean;
      error: string | null;
      upload: (file: File) => Promise<void>;
    };
  };
};

export function useTaskDashboard(options: UseTaskDashboardOptions = {}): UseTaskDashboardResult {
  const { activeOrg, user, organizationsLoading } = useOrgContext();
  const { client, fetchImpl: fetchOption, prompt: promptOption } = options;

  const supabase = client ?? defaultSupabase;
  const fetchImpl = fetchOption ?? fetch;
  const promptImpl = useMemo<(message: string, defaultValue?: string) => string | null>(() => {
    if (promptOption) return promptOption;
    return (message: string, defaultValue?: string) =>
      (typeof window === 'undefined' ? null : window.prompt?.(message, defaultValue) ?? null);
  }, [promptOption]);

  const orgId = activeOrg?.id ?? null;
  const userId = user?.id ?? null;

  const {
    list: groupList,
    loading: groupsLoading,
    error: groupsError,
    selectedId: selectedGroupId,
    select: selectGroup,
    selectedGroup,
  } = useGroupsState({ supabase, orgId, userId });

  const tagFiltersState = useTagFiltersState({
    supabase,
    orgId,
    selectedGroupId,
  });

  const {
    list: groupMemberList,
    loading: groupMembersLoading,
    error: groupMembersError,
    memberTagIndex,
  } = useGroupMembersState({
    supabase,
    orgId,
    selectedGroupId,
  });

  const matchesTagFilters = useCallback(
    (userIdToCheck: string) => {
      const relevantCategories = tagFiltersState.relevantCategoryIds;
      if (relevantCategories.size === 0) return true;

      const userTags = memberTagIndex.get(userIdToCheck) ?? new Set<string>();

      let matches = true;
      relevantCategories.forEach((categoryId) => {
        if (!matches) return;
        const tagIds = tagFiltersState.tagFilters[categoryId] ?? [];
        if (tagIds.length === 0) return;
        const category = tagFiltersState.filterable.find((item) => item.id === categoryId);
        if (!category) return;
        if (category.selectionType === 'single') {
          matches = tagIds.some((tagId) => userTags.has(tagId));
        } else {
          matches = tagIds.every((tagId) => userTags.has(tagId));
        }
      });

      return matches;
    },
    [memberTagIndex, tagFiltersState.filterable, tagFiltersState.relevantCategoryIds, tagFiltersState.tagFilters]
  );

  const filteredGroupMembers = useMemo(
    () => groupMemberList.filter((member) => matchesTagFilters(member.userId)),
    [groupMemberList, matchesTagFilters]
  );

  const assigneesState = useAssigneesSelection({ filteredMembers: filteredGroupMembers });

  const {
    list: tasksList,
    loading: tasksLoading,
    error: tasksError,
    refresh: refreshTasks,
    assignmentSummary,
  } = useTasksState({
    supabase,
    orgId,
    selectedGroupId,
  });

  const refreshTasksForGroup = useCallback(async () => {
    await refreshTasks(selectedGroupId);
  }, [refreshTasks, selectedGroupId]);

  const detailState = useTaskDetailState({
    supabase,
    fetchImpl,
    promptImpl,
    userId,
    groupMembers: groupMemberList,
    refreshTasks: refreshTasksForGroup,
  });

  const composerState = useTaskComposerState({
    supabase,
    fetchImpl,
    orgId,
    userId,
    selectedGroupId,
    selectedAssignees: assigneesState.selected,
    setSelectedAssignees: assigneesState.setSelected,
    onTaskCreated: async (taskId, groupId) => {
      await refreshTasks(groupId);
      if (detailState.taskId === taskId) {
        await detailState.attachments.refresh(taskId);
      }
    },
    onAttachmentRecorded: async (taskId) => {
      if (detailState.taskId === taskId) {
        await detailState.attachments.refresh(taskId);
      }
    },
  });

  const handleViewAssignments = useCallback(
    async (taskId: string) => {
      const taskMeta = tasksList.find((item) => item.id === taskId);
      const requiresAttachment = Boolean(taskMeta?.require_attachment);
      await detailState.open(taskId, requiresAttachment);
    },
    [detailState, tasksList]
  );

  return {
    organizationsLoading,
    orgId,
    userId,
    groups: {
      list: groupList,
      loading: groupsLoading,
      error: groupsError,
      selectedId: selectedGroupId,
      select: selectGroup,
    },
    selectedGroup,
    groupMembers: {
      list: groupMemberList,
      filtered: filteredGroupMembers,
      loading: groupMembersLoading,
      error: groupMembersError,
    },
    tagCategories: {
      list: tagFiltersState.list,
      loading: tagFiltersState.loading,
      error: tagFiltersState.error,
      filterable: tagFiltersState.filterable,
      tagFilters: tagFiltersState.tagFilters,
      selectionLabels: tagSelectionLabels,
      hasActiveFilters: tagFiltersState.hasActiveFilters,
      activeFilterCount: tagFiltersState.activeFilterCount,
      resetFilters: tagFiltersState.resetFilters,
      handleSingleChange: tagFiltersState.handleSingleChange,
      handleToggle: tagFiltersState.handleToggle,
    },
    assignees: {
      selected: assigneesState.selected,
      toggle: assigneesState.toggle,
      selectAll: assigneesState.selectAll,
      clear: assigneesState.clear,
    },
    composer: {
      title: composerState.title,
      setTitle: composerState.setTitle,
      description: composerState.description,
      setDescription: composerState.setDescription,
      dueAt: composerState.dueAt,
      setDueAt: composerState.setDueAt,
      creating: composerState.creating,
      error: composerState.error,
      requireAttachment: composerState.requireAttachment,
      setRequireAttachment: composerState.setRequireAttachment,
      attachments: composerState.attachments,
      createTask: composerState.createTask,
    },
    tasks: {
      list: tasksList,
      loading: tasksLoading,
      error: tasksError,
      summary: assignmentSummary,
      viewAssignments: handleViewAssignments,
    },
    detail: {
      taskId: detailState.taskId,
      requireAttachment: detailState.requireAttachment,
      records: detailState.records,
      loading: detailState.loading,
      error: detailState.error,
      close: detailState.close,
      review: detailState.review,
      attachments: {
        list: detailState.attachments.list,
        loading: detailState.attachments.loading,
        uploading: detailState.attachments.uploading,
        error: detailState.attachments.error,
        upload: detailState.attachments.upload,
      },
    },
  };
}
