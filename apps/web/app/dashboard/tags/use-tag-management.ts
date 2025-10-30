'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../../../lib/supabaseClient';
import { useOrgContext } from '../org-provider';

export type SelectionType = 'single' | 'multiple';

type TagRow = {
  id: string;
  name: string;
  is_active: boolean;
  category_id: string;
};

type TagCategoryRow = {
  id: string;
  name: string;
  is_required: boolean;
  selection_type: SelectionType;
  group_id: string | null;
  groups:
    | {
        id: string;
        name: string;
      }
    | Array<{
        id: string;
        name: string;
      }>
    | null;
  organization_tags: TagRow[] | null;
};

export type TagCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  selectionType: SelectionType;
  groupId: string | null;
  groupName: string | null;
  tags: Array<{ id: string; name: string; isActive: boolean }>;
};

type MemberRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  status: string;
};

export type Member = {
  id: string;
  userId: string;
  fullName: string | null;
  role: string;
  status: string;
};

type GroupRow = {
  id: string;
  name: string;
  organization_id: string;
};

export type GroupSummary = {
  id: string;
  name: string;
};

type MemberGroupRow = {
  group_id: string;
  user_id: string;
  status: string;
  removed_at: string | null;
};

type MemberTagRow = {
  member_id: string;
  tag_id: string;
  organization_tags: {
    id: string;
    category_id: string;
  } | null;
};

export type MemberTagState = Record<string, Record<string, string[]>>;
export type MemberGroupIndex = Record<string, Set<string>>;

export const selectionTypeLabels: Record<SelectionType, string> = {
  single: '单选',
  multiple: '多选',
};

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
};

export function useTagManagement() {
  const { activeOrg, organizationsLoading, user } = useOrgContext();
  const orgId = activeOrg?.id ?? null;
  const userId = user?.id ?? null;
  const isOrgAdmin = activeOrg ? ['owner', 'admin'].includes(activeOrg.role) : false;

  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [memberTags, setMemberTags] = useState<MemberTagState>({});
  const [memberTagsLoading, setMemberTagsLoading] = useState(false);
  const [memberTagsError, setMemberTagsError] = useState<string | null>(null);

  const [orgGroups, setOrgGroups] = useState<GroupSummary[]>([]);
  const [orgGroupsLoading, setOrgGroupsLoading] = useState(false);
  const [orgGroupsError, setOrgGroupsError] = useState<string | null>(null);

  const [adminGroupIds, setAdminGroupIds] = useState<Set<string>>(new Set());
  const [adminGroupsLoading, setAdminGroupsLoading] = useState(false);

  const [memberGroupIndex, setMemberGroupIndex] = useState<MemberGroupIndex>({});

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryRequired, setNewCategoryRequired] = useState(false);
  const [newCategorySelection, setNewCategorySelection] = useState<SelectionType>('single');
  const [newCategoryScope, setNewCategoryScope] = useState<'organization' | 'group'>('organization');
  const [newCategoryGroupId, setNewCategoryGroupId] = useState<string | null>(null);
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);
  const [categoryUpdating, setCategoryUpdating] = useState<Record<string, boolean>>({});

  const [newTagNames, setNewTagNames] = useState<Record<string, string>>({});
  const [tagActionError, setTagActionError] = useState<string | null>(null);
  const [tagMutations, setTagMutations] = useState<Record<string, boolean>>({});

  const [memberTagActionError, setMemberTagActionError] = useState<string | null>(null);
  const [memberTagUpdating, setMemberTagUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!orgId) {
      setCategories([]);
      setMembers([]);
      setMemberTags({});
      setOrgGroups([]);
      setAdminGroupIds(new Set());
      setMemberGroupIndex({});
    }
  }, [orgId]);

  const refreshOrgGroups = useCallback(async () => {
    if (!orgId) {
      setOrgGroups([]);
      setOrgGroupsError(null);
      return;
    }

    setOrgGroupsLoading(true);
    setOrgGroupsError(null);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, organization_id, deleted_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      setOrgGroups([]);
      setOrgGroupsError(error.message);
      setOrgGroupsLoading(false);
      return;
    }

    const mapped =
      (data ?? [])
        .map((row: GroupRow & { deleted_at?: string | null }) => ({
          id: row.id,
          name: row.name,
        })) ?? [];

    setOrgGroups(mapped);
    setOrgGroupsLoading(false);
  }, [orgId]);

  const refreshAdminGroups = useCallback(async () => {
    if (!orgId || !userId) {
      setAdminGroupIds(new Set());
      return;
    }

    setAdminGroupsLoading(true);
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, role, status, removed_at, groups(id, organization_id)')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .is('removed_at', null)
      .eq('groups.organization_id', orgId);

    if (error) {
      setAdminGroupIds(new Set());
      setAdminGroupsLoading(false);
      return;
    }

    const next = new Set<string>();
    (data ?? []).forEach((row: {
      group_id: string;
      groups:
        | { id: string; organization_id: string }
        | Array<{ id: string; organization_id: string }>
        | null;
    }) => {
      const group = Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups;
      if (!group || group.organization_id !== orgId) return;
      next.add(row.group_id);
    });

    setAdminGroupIds(next);
    setAdminGroupsLoading(false);
  }, [orgId, userId]);

  const refreshMemberGroups = useCallback(async () => {
    if (!orgId) {
      setMemberGroupIndex({});
      return;
    }

    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, user_id, status, removed_at, groups(organization_id)')
      .eq('status', 'active')
      .is('removed_at', null)
      .eq('groups.organization_id', orgId);

    if (error) {
      setMemberGroupIndex({});
      return;
    }

    const index: MemberGroupIndex = {};
    (data ?? []).forEach((row: MemberGroupRow & {
      groups:
        | { organization_id: string }
        | Array<{ organization_id: string }>
        | null;
    }) => {
      const group = Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups;
  if (!group || group.organization_id !== orgId) return;
  if (!index[row.user_id]) {
    index[row.user_id] = new Set();
  }
  index[row.user_id]!.add(row.group_id);
});

setMemberGroupIndex(index);
}, [orgId]);

  useEffect(() => {
    if (!orgId || organizationsLoading) return;
    void refreshOrgGroups();
    void refreshMemberGroups();
  }, [orgId, organizationsLoading, refreshMemberGroups, refreshOrgGroups]);

  useEffect(() => {
    if (!orgId || !userId || organizationsLoading) {
      setAdminGroupIds((prev) => {
        if (prev.size === 0) return prev;
        return new Set();
      });
      return;
    }
    void refreshAdminGroups();
  }, [orgId, userId, organizationsLoading, refreshAdminGroups]);

  useEffect(() => {
    if (isOrgAdmin) {
      return;
    }
    if (adminGroupIds.size > 0) {
      if (newCategoryScope !== 'group') {
        setNewCategoryScope('group');
      }
      if (!newCategoryGroupId || !adminGroupIds.has(newCategoryGroupId)) {
        const firstGroupId = Array.from(adminGroupIds)[0] ?? null;
        if (firstGroupId !== newCategoryGroupId) {
          setNewCategoryGroupId(firstGroupId);
        }
      }
    } else {
      if (newCategoryScope !== 'organization') {
        setNewCategoryScope('organization');
      }
      if (newCategoryGroupId !== null) {
        setNewCategoryGroupId(null);
      }
    }
  }, [adminGroupIds, isOrgAdmin, newCategoryGroupId, newCategoryScope]);

  const refreshCategories = useCallback(async () => {
    if (!orgId) return;

    setCategoriesLoading(true);
    setCategoriesError(null);

    const { data, error } = await supabase
      .from('organization_tag_categories')
      .select(
        'id, name, is_required, selection_type, group_id, groups(id, name), organization_tags(id, name, is_active, category_id)'
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      setCategories([]);
      setCategoriesError(error.message);
      setCategoriesLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map((row: TagCategoryRow) => {
        const group =
          Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups ?? null;
        return {
          id: row.id,
          name: row.name,
          isRequired: row.is_required,
          selectionType: row.selection_type,
          groupId: row.group_id ?? null,
          groupName: group?.name ?? null,
          tags:
            row.organization_tags?.map((tag) => ({
              id: tag.id,
              name: tag.name,
              isActive: tag.is_active,
            })) ?? [],
        };
      }) ?? [];

    setCategories(mapped);
    setCategoriesLoading(false);
  }, [orgId]);

  const refreshMembers = useCallback(async () => {
    if (!orgId) return;

    setMembersLoading(true);
    setMembersError(null);

    const { data, error } = await supabase
      .from('organization_member_details')
      .select('id, user_id, full_name, role, status')
      .eq('organization_id', orgId)
      .is('removed_at', null)
      .order('full_name', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      setMembers([]);
      setMembersError(error.message);
      setMembersLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map((row: MemberRow) => ({
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
      })) ?? [];

    setMembers(mapped);
    setMembersLoading(false);
  }, [orgId]);

  const refreshMemberTags = useCallback(async () => {
    if (!orgId) return;

    setMemberTagsLoading(true);
    setMemberTagsError(null);

    const { data, error } = await supabase
      .from('member_tags')
      .select('member_id, tag_id, organization_tags(id, category_id)')
      .eq('organization_id', orgId);

    if (error) {
      setMemberTags({});
      setMemberTagsError(error.message);
      setMemberTagsLoading(false);
      return;
    }

    const map: MemberTagState = {};
    (data ?? []).forEach((row: MemberTagRow) => {
      if (!row.organization_tags) return;

      const memberId = row.member_id;
      const categoryId = row.organization_tags.category_id;
      const tagId = row.organization_tags.id;

      if (!map[memberId]) {
        map[memberId] = {};
      }
      if (!map[memberId][categoryId]) {
        map[memberId][categoryId] = [];
      }
      map[memberId][categoryId].push(tagId);
    });

    setMemberTags(map);
    setMemberTagsLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (!orgId || organizationsLoading) return;
    void refreshCategories();
  }, [orgId, organizationsLoading, refreshCategories]);

  useEffect(() => {
    if (!orgId || organizationsLoading) return;
    void refreshMembers();
  }, [orgId, organizationsLoading, refreshMembers]);

  useEffect(() => {
    if (!orgId || organizationsLoading) return;
    void refreshMemberTags();
  }, [orgId, organizationsLoading, refreshMemberTags]);

  useEffect(() => {
    setNewTagNames((prev) => {
      const next: Record<string, string> = {};
      categories.forEach((category) => {
        next[category.id] = prev[category.id] ?? '';
      });
      return next;
    });
  }, [categories]);

const memberTagNames = useMemo(() => {
    const categoryMap = new Map<string, TagCategory>();
    categories.forEach((category) => {
      categoryMap.set(category.id, category);
    });

    const map: Record<string, Record<string, string[]>> = {};
    Object.entries(memberTags).forEach(([memberId, categoryEntries]) => {
      map[memberId] = {};
      Object.entries(categoryEntries).forEach(([categoryId, tagIds]) => {
        const category = categoryMap.get(categoryId);
        if (!category) return;

        const names = tagIds
          .map((tagId) => category.tags.find((tag) => tag.id === tagId)?.name)
          .filter((name): name is string => Boolean(name));
        map[memberId][categoryId] = names;
      });
    });

  return map;
}, [memberTags, categories]);

  const manageableCategoryIds = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((category) => {
      if (isOrgAdmin || (category.groupId && adminGroupIds.has(category.groupId))) {
        set.add(category.id);
      }
    });
    return set;
  }, [adminGroupIds, categories, isOrgAdmin]);

  const groupOptions = useMemo(() => {
    if (isOrgAdmin) {
      return orgGroups;
    }
    return orgGroups.filter((group) => adminGroupIds.has(group.id));
  }, [adminGroupIds, isOrgAdmin, orgGroups]);

  const canManageAnyCategory = isOrgAdmin || manageableCategoryIds.size > 0;

  const handleCategoryNameChange = useCallback((value: string) => {
    setNewCategoryName(value);
  }, []);

const handleCategorySelectionChange = useCallback((value: SelectionType) => {
  setNewCategorySelection(value);
}, []);

const handleCategoryRequiredChange = useCallback((value: boolean) => {
  setNewCategoryRequired(value);
}, []);

const handleCategoryScopeChange = useCallback((value: 'organization' | 'group') => {
  setNewCategoryScope(value);
  if (value === 'organization') {
    setNewCategoryGroupId(null);
  } else if (!newCategoryGroupId) {
    setNewCategoryGroupId((prev) => prev ?? groupOptions[0]?.id ?? null);
  }
}, [groupOptions, newCategoryGroupId]);

const handleCategoryGroupChange = useCallback((groupId: string) => {
  setNewCategoryGroupId(groupId || null);
}, []);

const handleTagNameChange = useCallback((categoryId: string, value: string) => {
  setNewTagNames((prev) => ({ ...prev, [categoryId]: value }));
}, []);

const handleCreateCategory = useCallback(
  async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orgId) return;

    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    if (!isOrgAdmin && adminGroupIds.size === 0) {
      setCategoryActionError('当前账号没有可以管理的标签类别。');
      return;
    }

    if (newCategoryScope === 'organization' && !isOrgAdmin) {
      setCategoryActionError('只有组织管理员可以创建组织级标签类别。');
      return;
    }

    let scopeGroupId: string | null = null;
    if (newCategoryScope === 'group') {
      scopeGroupId = newCategoryGroupId;
      if (!scopeGroupId) {
        setCategoryActionError('请选择要关联的小组。');
        return;
      }
      if (!isOrgAdmin && !adminGroupIds.has(scopeGroupId)) {
        setCategoryActionError('只能在自己管理的小组下创建标签类别。');
        return;
      }
      if (isOrgAdmin && !orgGroups.some((group) => group.id === scopeGroupId)) {
        setCategoryActionError('所选小组不存在或已被删除。');
        return;
      }
    }

    setCreatingCategory(true);
    setCategoryActionError(null);

    try {
      const { error } = await supabase.from('organization_tag_categories').insert({
        organization_id: orgId,
        name: trimmedName,
        is_required: newCategoryRequired,
        selection_type: newCategorySelection,
        group_id: scopeGroupId,
      });

      if (error) {
        throw error;
      }

      setNewCategoryName('');
      setNewCategoryRequired(false);
      setNewCategorySelection('single');
      if (isOrgAdmin) {
        setNewCategoryScope('organization');
        setNewCategoryGroupId(null);
      }
      await refreshCategories();
    } catch (error: unknown) {
      setCategoryActionError(resolveErrorMessage(error, '新增标签类别失败，请稍后再试。'));
    } finally {
      setCreatingCategory(false);
    }
  },
  [
    adminGroupIds,
    isOrgAdmin,
    newCategoryGroupId,
    newCategoryName,
    newCategoryRequired,
    newCategoryScope,
    newCategorySelection,
    orgGroups,
    orgId,
    refreshCategories,
  ]
);

const handleUpdateCategory = useCallback(
  async (categoryId: string, updates: Partial<{ is_required: boolean; selection_type: SelectionType }>) => {
    if (!orgId) return;
    if (!manageableCategoryIds.has(categoryId)) {
      setCategoryActionError('没有权限修改该标签类别。');
      return;
    }

    setCategoryActionError(null);
    setCategoryUpdating((prev) => ({ ...prev, [categoryId]: true }));

    try {
        const { error } = await supabase
          .from('organization_tag_categories')
          .update(updates)
          .eq('id', categoryId)
          .eq('organization_id', orgId);

        if (error) {
          throw error;
        }

        await refreshCategories();
      } catch (error: unknown) {
        setCategoryActionError(resolveErrorMessage(error, '更新标签类别失败，请稍后再试。'));
      } finally {
        setCategoryUpdating((prev) => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
      }
    },
    [manageableCategoryIds, orgId, refreshCategories]
  );

const handleCreateTag = useCallback(
  async (event: FormEvent<HTMLFormElement>, categoryId: string) => {
    event.preventDefault();
    if (!orgId) return;
    if (!manageableCategoryIds.has(categoryId)) {
      setTagActionError('没有权限在该类别下新增标签。');
      return;
    }

    const name = (newTagNames[categoryId] ?? '').trim();
    if (!name) return;

      const key = `create-${categoryId}`;
      setTagActionError(null);
      setTagMutations((prev) => ({ ...prev, [key]: true }));

      try {
        const { error } = await supabase.from('organization_tags').insert({
          organization_id: orgId,
          category_id: categoryId,
          name,
        });

        if (error) {
          throw error;
        }

        setNewTagNames((prev) => ({ ...prev, [categoryId]: '' }));
        await refreshCategories();
      } catch (error: unknown) {
        setTagActionError(resolveErrorMessage(error, '新增标签失败，请稍后再试。'));
      } finally {
        setTagMutations((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [manageableCategoryIds, newTagNames, orgId, refreshCategories]
  );

const handleToggleTagActive = useCallback(
  async (tagId: string, shouldActivate: boolean) => {
    if (!orgId) return;
    const category = categories.find((cat) => cat.tags.some((tag) => tag.id === tagId));
    if (category && !manageableCategoryIds.has(category.id)) {
      setTagActionError('没有权限更新该标签状态。');
      return;
    }

    const key = `tag-${tagId}`;
    setTagActionError(null);
    setTagMutations((prev) => ({ ...prev, [key]: true }));

      try {
        const { error } = await supabase
          .from('organization_tags')
          .update({ is_active: shouldActivate })
          .eq('id', tagId)
          .eq('organization_id', orgId);

        if (error) {
          throw error;
        }

        await refreshCategories();
      } catch (error: unknown) {
        setTagActionError(resolveErrorMessage(error, '更新标签状态失败，请稍后再试。'));
      } finally {
        setTagMutations((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [categories, manageableCategoryIds, orgId, refreshCategories]
  );

const applyMemberCategoryTags = useCallback(
  async (memberId: string, category: TagCategory, nextTagIds: string[]) => {
    if (!orgId) return;
    if (!manageableCategoryIds.has(category.id)) {
      setMemberTagActionError('没有权限调整该标签类别。');
      return;
    }
    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember) {
      setMemberTagActionError('未找到成员信息，无法更新标签。');
      return;
    }

    if (category.groupId) {
      const targetGroups = memberGroupIndex[targetMember.userId];
      if (!targetGroups || !targetGroups.has(category.groupId)) {
        setMemberTagActionError('该成员不属于标签绑定的小组，无法更新标签。');
        return;
      }
    }

    const cellKey = `${memberId}:${category.id}`;
    setMemberTagActionError(null);
    setMemberTagUpdating((prev) => ({ ...prev, [cellKey]: true }));

      try {
        const categoryTagIds = category.tags.map((tag) => tag.id);
        if (categoryTagIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('member_tags')
            .delete()
            .eq('organization_id', orgId)
            .eq('member_id', memberId)
            .in('tag_id', categoryTagIds);

          if (deleteError) {
            throw deleteError;
          }
        }

        if (nextTagIds.length > 0) {
          const rows = nextTagIds.map((tagId) => ({
            organization_id: orgId,
            member_id: memberId,
            tag_id: tagId,
          }));

          const { error: insertError } = await supabase.from('member_tags').insert(rows);
          if (insertError) {
            throw insertError;
          }
        }

        await refreshMemberTags();
      } catch (error: unknown) {
        setMemberTagActionError(resolveErrorMessage(error, '更新成员标签失败，请稍后再试。'));
      } finally {
        setMemberTagUpdating((prev) => {
          const next = { ...prev };
          delete next[cellKey];
          return next;
        });
      }
    },
    [manageableCategoryIds, memberGroupIndex, members, orgId, refreshMemberTags]
  );

  const handleMemberSingleChange = useCallback(
    async (memberId: string, category: TagCategory, event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      const nextTagIds = value ? [value] : [];
      await applyMemberCategoryTags(memberId, category, nextTagIds);
    },
    [applyMemberCategoryTags]
  );

  const handleMemberMultiToggle = useCallback(
    async (
      memberId: string,
      category: TagCategory,
      tagId: string,
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const checked = event.target.checked;
      const current = new Set(memberTags[memberId]?.[category.id] ?? []);
      if (checked) {
        current.add(tagId);
      } else {
        current.delete(tagId);
      }
      await applyMemberCategoryTags(memberId, category, Array.from(current));
    },
    [applyMemberCategoryTags, memberTags]
  );

  const handleClearMemberTags = useCallback(
    async (memberId: string, category: TagCategory) => {
      await applyMemberCategoryTags(memberId, category, []);
    },
    [applyMemberCategoryTags]
  );

return {
    organizationsLoading,
    orgId,
    isOrgAdmin,
    canManageAnyCategory,
    categories,
    categoriesLoading,
    categoriesError,
    manageableCategoryIds,
    orgGroups,
    orgGroupsLoading,
    orgGroupsError,
    groupOptions,
    adminGroupIds,
    adminGroupsLoading,
    creatingCategory,
    newCategoryName,
    newCategorySelection,
    newCategoryRequired,
    newCategoryScope,
    newCategoryGroupId,
    categoryActionError,
    categoryUpdating,
    newTagNames,
    tagActionError,
    tagMutations,
    members,
    membersLoading,
    membersError,
    memberTags,
    memberTagNames,
    memberTagsLoading,
    memberTagsError,
    memberTagActionError,
    memberTagUpdating,
    handleCategoryNameChange,
    handleCategorySelectionChange,
    handleCategoryRequiredChange,
    handleCategoryScopeChange,
    handleCategoryGroupChange,
    handleTagNameChange,
    handleCreateCategory,
    handleUpdateCategory,
    handleCreateTag,
    handleToggleTagActive,
    handleMemberSingleChange,
    handleMemberMultiToggle,
    handleClearMemberTags,
  };
}
