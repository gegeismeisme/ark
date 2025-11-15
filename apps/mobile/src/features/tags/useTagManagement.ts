import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';
import type { OrganizationMember } from '../organizations/useOrganizationMembers';

export type TagSelectionType = 'single' | 'multiple';

export type TagOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type TagCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  selectionType: TagSelectionType;
  groupId: string | null;
  groupName: string | null;
  tags: TagOption[];
};

export type TagAssignment = {
  categoryId: string;
  categoryName: string;
  required: boolean;
  selectionType: TagSelectionType;
  tagOptions: TagOption[];
  selectedTagIds: string[];
  hasMissingRequired: boolean;
};

export type TagRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type TagRequest = {
  id: string;
  memberId: string;
  memberName: string | null;
  tagId: string;
  tagName: string;
  categoryId: string;
  categoryName: string;
  groupName: string | null;
  status: TagRequestStatus;
  reason: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  is_required: boolean;
  selection_type: TagSelectionType;
  group_id: string | null;
  groups?:
    | {
        id: string;
        name: string;
      }
    | Array<{
        id: string;
        name: string;
      }>
    | null;
  organization_tags?:
    | Array<{
        id: string;
        name: string;
        is_active: boolean;
      }>
    | {
        id: string;
        name: string;
        is_active: boolean;
      }
    | null;
};

type MemberTagRow = {
  member_id: string;
  organization_tags?:
    | {
        id: string;
        name: string;
        category_id: string;
      }
    | Array<{
        id: string;
        name: string;
        category_id: string;
      }>
    | null;
};

type TagRequestRow = {
  id: string;
  member_id: string;
  organization_id: string;
  tag_id: string;
  status: TagRequestStatus;
  reason: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  organization_tags?:
    | {
        id: string;
        name: string;
        organization_tag_categories?:
          | {
              id: string;
              name: string;
              groups?:
                | {
                    id: string;
                    name: string;
                  }
                | Array<{
                    id: string;
                    name: string;
                  }>
                | null;
            }
          | Array<{
              id: string;
              name: string;
              groups?:
                | {
                    id: string;
                    name: string;
                  }
                | Array<{
                    id: string;
                    name: string;
                  }>
                | null;
            }>
          | null;
      }
    | Array<{
        id: string;
        name: string;
        organization_tag_categories?:
          | {
              id: string;
              name: string;
              groups?:
                | {
                    id: string;
                    name: string;
                  }
                | Array<{
                    id: string;
                    name: string;
                  }>
                | null;
            }
          | Array<{
              id: string;
              name: string;
              groups?:
                | {
                    id: string;
                    name: string;
                  }
                | Array<{
                    id: string;
                    name: string;
                  }>
                | null;
            }>
          | null;
      }>
    | null;
};

const normalizeArray = <T,>(input: T | T[] | null | undefined): T[] => {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
};

const normalizeFirst = <T,>(input: T | T[] | null | undefined): T | null => {
  if (!input) return null;
  return Array.isArray(input) ? input[0] ?? null : input;
};

type UseTagManagementOptions = {
  organizationId: string | null;
  userId: string | null;
  members: OrganizationMember[];
  isOrgAdmin: boolean;
};

export type UseTagManagementResult = {
  categories: TagCategory[];
  assignments: TagAssignment[];
  requests: TagRequest[];
  loading: boolean;
  error: string | null;
  pendingAdminRequests: number;
  pendingMemberRequests: number;
  missingRequiredCount: number;
  refresh: () => Promise<void>;
};

export function useTagManagement({
  organizationId,
  userId,
  members,
  isOrgAdmin,
}: UseTagManagementOptions): UseTagManagementResult {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
  const [requests, setRequests] = useState<TagRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selfMemberId = useMemo(() => {
    if (!userId) return null;
    return members.find((member) => member.userId === userId)?.id ?? null;
  }, [members, userId]);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setCategories([]);
      setAssignments([]);
      setRequests([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const [categoryRes, memberTagRes, requestRes] = await Promise.all([
      supabase
        .from('organization_tag_categories')
        .select(
          `
            id,
            name,
            is_required,
            selection_type,
            group_id,
            groups(id, name),
            organization_tags(id, name, is_active)
          `,
        )
        .eq('organization_id', organizationId)
        .order('name', { ascending: true }),
      selfMemberId
        ? supabase
            .from('member_tags')
            .select('member_id, organization_tags(id, name, category_id)')
            .eq('member_id', selfMemberId)
        : Promise.resolve({ data: [], error: null }),
      (() => {
        const query = supabase
          .from('tag_requests')
          .select(
            `
              id,
              organization_id,
              member_id,
              tag_id,
              status,
              reason,
              admin_note,
              created_at,
              resolved_at,
              organization_tags (
                id,
                name,
                organization_tag_categories (
                  id,
                  name,
                  groups (id, name)
                )
              )
            `,
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (!isOrgAdmin) {
          if (!selfMemberId) {
            return Promise.resolve({ data: [], error: null });
          }
          query.eq('member_id', selfMemberId);
        }
        return query;
      })(),
    ]);

    const categoryError = categoryRes.error;
    const memberTagError = memberTagRes.error;
    const requestError = requestRes.error;

    if (categoryError || memberTagError || requestError) {
      setError(categoryError?.message ?? memberTagError?.message ?? requestError?.message ?? 'Unknown error');
      setLoading(false);
      return;
    }

    const categoryRows = (categoryRes.data ?? []) as CategoryRow[];
    const mappedCategories: TagCategory[] = categoryRows.map((row) => {
      const group = normalizeFirst(row.groups);
      return {
        id: row.id,
        name: row.name,
        isRequired: row.is_required,
        selectionType: row.selection_type,
        groupId: row.group_id ?? null,
        groupName: group?.name ?? null,
        tags: normalizeArray(row.organization_tags).map((tag) => ({
          id: tag.id,
          name: tag.name,
          isActive: tag.is_active,
        })),
      };
    });

    const memberTagRows = (memberTagRes.data ?? []) as MemberTagRow[];
    const memberCategorySelections: Record<string, string[]> = {};

    memberTagRows.forEach((row) => {
      const orgTags = normalizeArray(row.organization_tags);
      orgTags.forEach((tag) => {
        if (!tag?.category_id) return;
        if (!memberCategorySelections[tag.category_id]) {
          memberCategorySelections[tag.category_id] = [];
        }
        memberCategorySelections[tag.category_id]!.push(tag.id);
      });
    });

    const mappedAssignments: TagAssignment[] = mappedCategories.map((category) => {
      const selected = memberCategorySelections[category.id] ?? [];
      return {
        categoryId: category.id,
        categoryName: category.name,
        required: category.isRequired,
        selectionType: category.selectionType,
        tagOptions: category.tags,
        selectedTagIds: selected,
        hasMissingRequired: category.isRequired && selected.length === 0,
      };
    });

    const requestRows = (requestRes.data ?? []) as TagRequestRow[];
    const mappedRequests: TagRequest[] = requestRows.map((row) => {
      const tagEntry = normalizeFirst(row.organization_tags);
      const categoryEntry = normalizeFirst(tagEntry?.organization_tag_categories);
      const groupEntry = normalizeFirst(categoryEntry?.groups);
      const member = members.find((item) => item.id === row.member_id) ?? null;
      return {
        id: row.id,
        memberId: row.member_id,
        memberName: member?.fullName ?? null,
        tagId: row.tag_id,
        tagName: tagEntry?.name ?? '',
        categoryId: categoryEntry?.id ?? '',
        categoryName: categoryEntry?.name ?? '',
        groupName: groupEntry?.name ?? null,
        status: row.status,
        reason: row.reason,
        adminNote: row.admin_note,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      };
    });

    setCategories(mappedCategories);
    setAssignments(mappedAssignments);
    setRequests(mappedRequests);
    setLoading(false);
  }, [organizationId, selfMemberId, isOrgAdmin, members]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pendingAdminRequests = useMemo(() => {
    if (!isOrgAdmin) return 0;
    return requests.filter((request) => request.status === 'pending').length;
  }, [requests, isOrgAdmin]);

  const pendingMemberRequests = useMemo(() => {
    if (!selfMemberId) return 0;
    return requests.filter((request) => request.memberId === selfMemberId && request.status === 'pending').length;
  }, [requests, selfMemberId]);

  const missingRequiredCount = useMemo(
    () => assignments.filter((assignment) => assignment.required && assignment.hasMissingRequired).length,
    [assignments],
  );

  return {
    categories,
    assignments,
    requests,
    loading,
    error,
    pendingAdminRequests,
    pendingMemberRequests,
    missingRequiredCount,
    refresh,
  };
}
