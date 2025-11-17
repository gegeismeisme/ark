import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import type { OrganizationMember } from '../organizations/useOrganizationMembers';
import type { JoinRequest } from '../../types';
import type { Profile } from '../profile/useProfile';
import type { PlanLimitsMap } from '../profile/usePlanLimits';
import type { InviteFormProps } from './types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { AccountSection } from './AccountSection';
import { CreateOrganizationCard } from './CreateOrganizationCard';
import { EditOrganizationCard } from './EditOrganizationCard';
import { OrgSettingsSheet } from './OrgSettingsSheet';
import { OrgGroupForm } from './OrgGroupForm';
import { JoinOrganizationPage } from './JoinOrganizationPage';
import { ManageJoinRequestsSheet } from './ManageJoinRequestsSheet';
import { useOrgJoinApprovals } from './useOrgJoinApprovals';
import type { OrgJoinApproval } from './useOrgJoinApprovals';
import { supabase } from '../../lib/supabaseClient';
import { useOrganizationGroups } from '../organizations/useOrganizationGroups';
import { useUserMemberships } from '../organizations/useUserMemberships';
import type { UserMembership } from '../organizations/useUserMemberships';
import { useTagManagement } from '../tags/useTagManagement';
import type { TagOption } from '../tags/useTagManagement';
import type { TagCategory } from '../tags/useTagManagement';
import { MembershipSection } from './MembershipSection';
import { MembersManagerScreen } from './MembersManagerScreen';
import { AdminMemberTagModal } from './AdminMemberTagModal';
import { AdminMemberTagModal } from './AdminMemberTagModal';

export type AccountSectionKey = 'profile' | 'organization' | 'join' | 'security';

type AccountScreenProps = {
  profile: Profile | null;
  session: Session;
  planTier: string | null;
  planExpiresAt: string | null;
  planLimits: PlanLimitsMap;
  planLimitsLoading: boolean;
  onUpdateName: (name: string) => Promise<boolean>;
  onSignOut: () => void;
  signOutLoading: boolean;
  organization: ActiveOrganization | null;
  onCreateOrganization: (payload: { name: string; description: string; displayName: string; visibility: 'public' | 'private' }) => Promise<boolean>;
  creatingOrganization: boolean;
  members: OrganizationMember[];
  membersLoading: boolean;
  onRefreshMembers: () => Promise<void>;
  onRefreshOrganization: () => Promise<void>;
  formatDateTime: (value: string | null) => string;
  inviteProps: InviteFormProps;
  joinRequests: JoinRequest[];
  joinRequestsLoading: boolean;
  joinRequestsError: string | null;
  onRefreshJoinRequests: () => void;
  focusSection: AccountSectionKey | null;
  onFocusSectionHandled: () => void;
};

const FREE_LIMITS = {
  members: 50,
  groups: 5,
  organizations: 1,
  admins: 10,
};
const NAME_MAX_LENGTH = 18;

export function AccountScreen({
  profile,
  session,
  planTier,
  planExpiresAt,
  planLimits,
  planLimitsLoading,
  onUpdateName,
  onSignOut,
  signOutLoading,
  organization,
  onCreateOrganization,
  creatingOrganization,
  members,
  membersLoading,
  onRefreshMembers,
  onRefreshOrganization,
  formatDateTime,
  inviteProps,
  joinRequests,
  joinRequestsLoading,
  joinRequestsError,
  onRefreshJoinRequests,
  focusSection,
  onFocusSectionHandled,
}: AccountScreenProps) {
  const displayName = profile?.fullName ?? session.user.email ?? session.user.id;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const tapRef = useRef(0);

  const [orgDisplayName, setOrgDisplayName] = useState('');
  const {
    approvals,
    loading: approvalsLoading,
    error: approvalsError,
    refresh: approvalsRefresh,
  } = useOrgJoinApprovals(organization?.id ?? null);
  const {
    memberships,
    loading: membershipsLoading,
    error: membershipsError,
    refresh: refreshMemberships,
  } = useUserMemberships(session.user.id);

  const [openSections, setOpenSections] = useState<Record<AccountSectionKey, boolean>>({
    profile: true,
    organization: true,
    join: false,
    security: false,
  });
  const [orgHubVisible, setOrgHubVisible] = useState(false);
  const [orgCreateVisible, setOrgCreateVisible] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [orgEditVisible, setOrgEditVisible] = useState(false);
  const [orgSettingsVisible, setOrgSettingsVisible] = useState(false);
  const [tagCenterVisible, setTagCenterVisible] = useState(false);
  const handleTagPlaceholder = () => Alert.alert(t('app.alert.noticeTitle'), t('account.tags.comingSoon'));
  const [tagCategorySheet, setTagCategorySheet] = useState<
    { mode: 'view' | 'create' | 'edit'; category: TagCategory | null } | null
  >(null);
  const [groupFormVisible, setGroupFormVisible] = useState(false);
  const [joinPageVisible, setJoinPageVisible] = useState(false);
  const [manageRequestsVisible, setManageRequestsVisible] = useState(false);
  const [manageMembersVisible, setManageMembersVisible] = useState(false);
  const [adminTagTarget, setAdminTagTarget] = useState<{ memberId: string; memberName: string | null } | null>(null);
  const [adminTagAssignments, setAdminTagAssignments] = useState<
    Array<{
      categoryId: string;
      categoryName: string;
      selectionType: 'single' | 'multiple';
      tagOptions: TagOption[];
      selectedTagIds: string[];
      required: boolean;
    }>
  >([]);
  const [adminTagDraft, setAdminTagDraft] = useState<Set<string>>(new Set());
  const [adminTagLoading, setAdminTagLoading] = useState(false);
  const [adminTagError, setAdminTagError] = useState<string | null>(null);
  const [orgEditValues, setOrgEditValues] = useState<{
    name: string;
    description: string;
    displayName: string;
    visibility: 'public' | 'private';
  }>({
    name: '',
    description: '',
    displayName: '',
    visibility: 'public',
  });
  const [orgEditSaving, setOrgEditSaving] = useState(false);
  const [groupFormSaving, setGroupFormSaving] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const { groups, loading: groupsLoading, error: groupsError, refresh: refreshGroups } = useOrganizationGroups(
    organization?.id ?? null,
  );

  const normalizedPlan = planTier ?? 'free';
  const isFreePlan = normalizedPlan === 'free';
  const currentPlanLimits = planLimits[normalizedPlan];
  const effectivePlanLimits = currentPlanLimits ?? {
    planTier: normalizedPlan,
    maxOrgsPerUser: FREE_LIMITS.organizations,
    maxGroupsPerOrganization: FREE_LIMITS.groups,
    maxMembersPerOrganization: FREE_LIMITS.members,
    maxGroupAdminRolesPerUser: FREE_LIMITS.admins,
  };
  const formatLimitValue = (value: number | null | undefined) =>
    value === null || typeof value === 'undefined' ? t('account.plan.unlimited') : value.toString();
  const memberUsageLabel = t('account.organization.memberUsage', {
    current: members.length,
    limit: formatLimitValue(effectivePlanLimits.maxMembersPerOrganization),
  });
  const groupLimitValue = effectivePlanLimits.maxGroupsPerOrganization ?? null;
  const groupLimitLabel = formatLimitValue(groupLimitValue);
  const groupUsageLabel = t('account.organization.groupUsage', {
    current: groups.length,
    limit: groupLimitLabel,
  });
  const defaultGroupMemberLabel = t('account.organization.defaultGroupMembers', { count: members.length });
  const orgRole = organization?.role ?? null;
  const isOrgAdmin = orgRole ? ['owner', 'admin'].includes(orgRole) : false;
  const {
    categories: tagCategories,
    assignments: tagAssignments,
    loading: tagCenterLoading,
    error: tagCenterError,
    pendingAdminRequests,
    pendingMemberRequests,
    missingRequiredCount,
    refresh: refreshTagData,
  } = useTagManagement({
    organizationId: organization?.id ?? null,
    userId: session.user.id,
    members,
    isOrgAdmin,
  });
  const requiredAssignments = useMemo(() => tagAssignments.filter((assignment) => assignment.required), [tagAssignments]);
  const optionalAssignments = useMemo(
    () => tagAssignments.filter((assignment) => !assignment.required),
    [tagAssignments],
  );
  const CATEGORY_FORM_DEFAULT = {
    name: '',
    scope: 'organization' as 'organization' | 'group',
    groupId: null as string | null,
    selectionType: 'single' as 'single' | 'multiple',
    required: true,
  };
  const [categoryForm, setCategoryForm] = useState(CATEGORY_FORM_DEFAULT);
  const [categoryFormSaving, setCategoryFormSaving] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [tagMutationId, setTagMutationId] = useState<string | null>(null);
  const [tagActionError, setTagActionError] = useState<string | null>(null);
  const [categoryDeleteLoading, setCategoryDeleteLoading] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);
  const handleOpenCategorySheet = (category: TagCategory) => setTagCategorySheet({ mode: 'view', category });
  const handleStartCreateCategory = () => setTagCategorySheet({ mode: 'create', category: null });
  const handleStartEditCategory = () => {
    if (!tagCategorySheet?.category) return;
    setTagCategorySheet({ mode: 'edit', category: tagCategorySheet.category });
  };
  const handleCloseCategorySheet = () => setTagCategorySheet(null);

  useEffect(() => {
    if (!tagCategorySheet) {
      setCategoryForm(CATEGORY_FORM_DEFAULT);
      setCategoryFormError(null);
      setCategoryFormSaving(false);
      setNewTagName('');
      setTagActionError(null);
      setCategoryDeleteLoading(false);
      setConfirmDeleteCategory(false);
      return;
    }
    if (tagCategorySheet.mode === 'edit' && tagCategorySheet.category) {
      setCategoryForm({
        name: tagCategorySheet.category.name,
        scope: tagCategorySheet.category.groupId ? 'group' : 'organization',
        groupId: tagCategorySheet.category.groupId,
        selectionType: tagCategorySheet.category.selectionType,
        required: tagCategorySheet.category.isRequired,
      });
    } else if (tagCategorySheet.mode === 'create') {
      setCategoryForm(CATEGORY_FORM_DEFAULT);
    }
    setCategoryFormError(null);
    setCategoryFormSaving(false);
    setNewTagName('');
    setTagActionError(null);
    setCategoryDeleteLoading(false);
    setConfirmDeleteCategory(false);
  }, [tagCategorySheet]);

  useEffect(() => {
    if (!tagCategorySheet?.category || tagCategorySheet.mode !== 'view') {
      return;
    }
    const updated = tagCategories.find((cat) => cat.id === tagCategorySheet.category?.id);
    if (updated && updated !== tagCategorySheet.category) {
      setTagCategorySheet((prev) => (prev ? { ...prev, category: updated } : prev));
    }
  }, [tagCategories, tagCategorySheet?.category?.id, tagCategorySheet?.mode]);

  const handleSubmitCategoryForm = async () => {
    if (!organization?.id || !tagCategorySheet) return;
    const trimmedName = categoryForm.name.trim();
    if (!trimmedName) {
      setCategoryFormError(t('account.tags.sheet.nameRequired'));
      return;
    }
    if (categoryForm.scope === 'group' && !categoryForm.groupId) {
      setCategoryFormError(t('account.tags.sheet.groupRequired'));
      return;
    }
    setCategoryFormSaving(true);
    setCategoryFormError(null);
    try {
      if (tagCategorySheet.mode === 'create') {
        const { error } = await supabase.from('organization_tag_categories').insert({
          organization_id: organization.id,
          name: trimmedName,
          is_required: categoryForm.required,
          selection_type: categoryForm.selectionType,
          group_id: categoryForm.scope === 'group' ? categoryForm.groupId : null,
        });
        if (error) {
          throw error;
        }
      } else if (tagCategorySheet.mode === 'edit' && tagCategorySheet.category) {
        const { error } = await supabase
          .from('organization_tag_categories')
          .update({
            name: trimmedName,
            is_required: categoryForm.required,
            selection_type: categoryForm.selectionType,
            group_id: categoryForm.scope === 'group' ? categoryForm.groupId : null,
          })
          .eq('id', tagCategorySheet.category.id)
          .eq('organization_id', organization.id);
        if (error) {
          throw error;
        }
      }
      await refreshTagData();
      setTagCategorySheet(null);
    } catch (error) {
      setCategoryFormError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : t('account.tags.sheet.genericError'),
      );
    } finally {
      setCategoryFormSaving(false);
    }
  };
  const handleAddTag = async () => {
    if (!organization?.id || !tagCategorySheet?.category) return;
    const trimmed = newTagName.trim();
    if (!trimmed) {
      setCategoryFormError(t('account.tags.sheet.tagNameRequired'));
      return;
    }
    setTagMutationId('create');
    setCategoryFormError(null);
    try {
      const { error } = await supabase.from('organization_tags').insert({
        organization_id: organization.id,
        category_id: tagCategorySheet.category.id,
        name: trimmed,
      });
      if (error) {
        throw error;
      }
      setNewTagName('');
      await refreshTagData();
    } catch (error) {
      setTagActionError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : t('account.tags.sheet.tagCreateError'),
      );
    } finally {
      setTagMutationId(null);
    }
  };
  const handleToggleTag = async (tag: TagOption) => {
    if (!organization?.id || !tagCategorySheet?.category) return;
    setTagMutationId(tag.id);
    setTagActionError(null);
    try {
      const { error } = await supabase
        .from('organization_tags')
        .update({ is_active: !tag.isActive })
        .eq('id', tag.id)
        .eq('organization_id', organization.id);
      if (error) {
        throw error;
      }
      await refreshTagData();
    } catch (error) {
      setTagActionError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : t('account.tags.sheet.tagToggleError'),
      );
    } finally {
      setTagMutationId(null);
    }
  };
  const handleDeleteTag = async (tag: TagOption) => {
    if (!organization?.id || !tagCategorySheet?.category) return;
    setTagMutationId(`delete-${tag.id}`);
    setTagActionError(null);
    try {
      const { error } = await supabase
        .from('organization_tags')
        .delete()
        .eq('id', tag.id)
        .eq('organization_id', organization.id);
      if (error) {
        throw error;
      }
      await refreshTagData();
    } catch (error) {
      setTagActionError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : t('account.tags.sheet.tagDeleteError'),
      );
    } finally {
      setTagMutationId(null);
    }
  };
  const handleDeleteCategory = async () => {
    if (!organization?.id || !tagCategorySheet?.category) return;
    setCategoryDeleteLoading(true);
    setTagActionError(null);
    try {
      const categoryId = tagCategorySheet.category?.id ?? '';
      if (!categoryId) {
        throw new Error('Missing category id');
      }
      const tagIds = tagCategorySheet.category?.tags.map((tag) => tag.id) ?? [];
      if (tagIds.length > 0) {
        const { error: memberDeleteError } = await supabase
          .from('member_tags')
          .delete()
          .eq('organization_id', organization.id)
          .in('tag_id', tagIds);
        if (memberDeleteError) {
          throw memberDeleteError;
        }
      }
      const { error: tagDeleteError } = await supabase
        .from('organization_tags')
        .delete()
        .eq('category_id', categoryId)
        .eq('organization_id', organization.id);
      if (tagDeleteError) {
        throw tagDeleteError;
      }
      const { error } = await supabase
        .from('organization_tag_categories')
        .delete()
        .eq('id', categoryId)
        .eq('organization_id', organization.id);
      if (error) {
        throw error;
      }
      await refreshTagData();
      setTagCategorySheet(null);
      setConfirmDeleteCategory(false);
    } catch (error) {
      setTagActionError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : t('account.tags.sheet.genericError'),
      );
      setCategoryDeleteLoading(false);
    }
  };
  const planExpiryText = useMemo(() => {
    if (!planExpiresAt) return null;
    const date = new Date(planExpiresAt);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  }, [planExpiresAt]);

  const readablePlanTier =
    normalizedPlan.slice(0, 1).toUpperCase() + normalizedPlan.slice(1);
  const planLabel = isFreePlan
    ? t('account.profile.planFree')
    : t('account.profile.planPaid', { tier: readablePlanTier });
  const planDetail = currentPlanLimits
    ? t('account.profile.planDynamicDetail', {
        orgs: formatLimitValue(currentPlanLimits.maxOrgsPerUser),
        groups: formatLimitValue(currentPlanLimits.maxGroupsPerOrganization),
        members: formatLimitValue(currentPlanLimits.maxMembersPerOrganization),
      })
    : planExpiryText
      ? t('account.profile.planExpires', { date: planExpiryText })
      : t('account.profile.planFreeDetail');
  const planDetailText =
    planLimitsLoading && !currentPlanLimits ? t('account.plan.loading') : planDetail;
  const joinedDateText = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : '--';
  const nameLimitHint = t('account.profile.nameLimitHint', {
    zh: Math.floor(NAME_MAX_LENGTH / 2),
    max: NAME_MAX_LENGTH,
  });
  const orgVisibilityLabel =
    organization?.visibility === 'private'
      ? t('account.organization.visibilityPrivate')
      : t('account.organization.visibilityPublic');
  const orgTileSubtitle = organization
    ? `${t('account.orgTile.active', { name: organization.name })} 路 ${orgVisibilityLabel}`
    : t('account.orgTile.subtitle');

  useEffect(() => {
    if (focusSection) {
      setOpenSections((prev) => ({ ...prev, [focusSection]: true }));
      onFocusSectionHandled();
    }
  }, [focusSection, onFocusSectionHandled]);

  useEffect(() => {
    if (!organization?.id) {
      setOrgDisplayName('');
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('organization_members')
        .select('display_name')
        .eq('organization_id', organization.id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!active) return;
      setOrgDisplayName((data?.display_name as string | null) ?? '');
    })();
    return () => {
      active = false;
    };
  }, [organization?.id, session.user.id]);

  const handleOpenOrgHub = () => {
    setOrgHubVisible(true);
  };

  const handleCloseOrgHub = () => {
    setOrgHubVisible(false);
  };

  const handleCloseCreateSheet = () => {
    setOrgCreateVisible(false);
  };

  const handleNamePress = () => {
    const now = Date.now();
    if (now - tapRef.current < 300) {
      setEditingName(true);
      setNameDraft(displayName);
    }
    tapRef.current = now;
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || savingName) return;
    setSavingName(true);
    const success = await onUpdateName(trimmed);
    setSavingName(false);
    if (success) {
      setEditingName(false);
    }
  };

  const handleOpenCreateSheet = () => {
    if (isFreePlan && organization) {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.limitWarning'));
      return;
    }
    setOrgCreateVisible(true);
  };

  const handleCreateFromSheet = async (payload: {
    name: string;
    description: string;
    displayName: string;
    visibility: 'public' | 'private';
  }) => {
    const success = await onCreateOrganization(payload);
    if (success) {
      setOrgCreateVisible(false);
      setOrgHubVisible(false);
    }
    return success;
  };

  const handleOpenEditModal = () => {
    if (!organization) return;
    setOrgEditValues({
      name: organization.name,
      description: organization.description ?? '',
      displayName: orgDisplayName,
      visibility: (organization.visibility as 'public' | 'private') ?? 'public',
    });
    setOrgEditVisible(true);
  };

  const handleOpenOrgSettings = () => {
    if (!organization) return;
    setOrgSettingsVisible(true);
  };

  const handleCloseOrgSettings = () => setOrgSettingsVisible(false);

  const handleFocusMembersFromSettings = () => {
    setOpenSections((prev) => ({ ...prev, organization: true }));
    setOrgSettingsVisible(false);
    setManageMembersVisible(true);
  };

  const handleOpenJoinPage = () => {
    setJoinPageVisible(true);
  };

  const handleCloseJoinPage = () => {
    if (inviteProps.redeemLoading) return;
    setJoinPageVisible(false);
  };

  const handleOpenApprovals = () => {
    if (!organization || !isOrgAdmin) {
      Alert.alert(t('app.alert.noticeTitle'), t('account.join.manageUnavailable'));
      return;
    }
    setManageRequestsVisible(true);
  };

  const handleCloseManageRequests = () => setManageRequestsVisible(false);

  const handleReviewRequest = async (request: OrgJoinApproval, nextStatus: 'approved' | 'rejected') => {
    if (!organization) return;
    setProcessingRequestId(request.id);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('organization_join_requests')
      .update({
        status: nextStatus,
        response_note: null,
        reviewed_at: nowIso,
        reviewed_by: session.user.id,
      })
      .eq('id', request.id)
      .eq('organization_id', organization.id);
    if (error) {
      setProcessingRequestId(null);
      Alert.alert(t('app.alert.noticeTitle'), error.message ?? t('account.join.manageError'));
      return;
    }
    if (nextStatus === 'approved') {
      const { error: memberError } = await supabase
        .from('organization_members')
        .upsert(
          {
            organization_id: organization.id,
            user_id: request.userId,
            role: 'member',
            status: 'active',
            invited_by: session.user.id,
            invited_at: nowIso,
            joined_at: nowIso,
          },
          { onConflict: 'organization_id,user_id' },
        );
      if (memberError) {
        setProcessingRequestId(null);
        Alert.alert(t('app.alert.noticeTitle'), memberError.message ?? t('account.join.manageError'));
        return;
      }
    }
    await Promise.all([approvalsRefresh(), onRefreshMembers(), onRefreshJoinRequests()]);
    await refreshMemberships();
    setProcessingRequestId(null);
    Alert.alert(
      t('app.alert.noticeTitle'),
      nextStatus === 'approved' ? t('account.join.approvedSuccess') : t('account.join.rejectedSuccess'),
    );
  };

  const handleOpenGroupForm = () => {
    if (groupLimitValue !== null && groups.length >= groupLimitValue) {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.limitReached', { limit: groupLimitLabel }));
      return;
    }
    setGroupFormVisible(true);
  };

  const handleCloseGroupForm = () => {
    if (groupFormSaving) return;
    setGroupFormVisible(false);
  };

  const handleSubmitGroup = async ({ name, description }: { name: string; description: string }) => {
    if (!organization) return;
    setGroupFormSaving(true);
    const { error } = await supabase.from('groups').insert({
      organization_id: organization.id,
      name,
      description: description || null,
      created_by: session.user.id,
    });
    if (error) {
      setGroupFormSaving(false);
      Alert.alert(t('app.alert.noticeTitle'), error.message ?? t('account.organization.groupCreateError'));
      return;
    }
    await refreshGroups();
    setGroupFormSaving(false);
    setGroupFormVisible(false);
    Alert.alert(t('account.organization.groupCreateSuccess'));
  };

  const handleUpdateOrganization = async (values: {
    name: string;
    description: string;
    displayName: string;
    visibility: 'public' | 'private';
  }) => {
    if (!organization) return;
    if (!values.name.trim()) {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.errorMissing'));
      return;
    }
    setOrgEditSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: values.name.trim(),
        description: values.description.trim() || null,
        visibility: values.visibility,
      })
      .eq('id', organization.id);
    if (error) {
      setOrgEditSaving(false);
      Alert.alert(t('app.alert.noticeTitle'), error.message ?? t('app.alert.genericError'));
      return;
    }

    if (values.displayName.trim()) {
      const { error: memberError } = await supabase
        .from('organization_members')
        .update({ display_name: values.displayName.trim() })
        .eq('organization_id', organization.id)
        .eq('user_id', session.user.id);
      if (memberError) {
        setOrgEditSaving(false);
        Alert.alert(t('app.alert.noticeTitle'), memberError.message ?? t('app.alert.genericError'));
        return;
      }
      setOrgDisplayName(values.displayName.trim());
      void onRefreshMembers();
    }

    setOrgEditSaving(false);
    Alert.alert(t('account.organization.editTitle'), t('account.organization.editSuccess'));
    setOrgEditVisible(false);
    await Promise.all([onRefreshOrganization(), refreshMemberships()]);
  };

  return (
    <View style={styles.accountScreen}>
      <View style={styles.profileCard}>
        <View style={styles.accountHeader}>
          <Pressable style={styles.accountAvatar} onPress={handleNamePress}>
            <Text style={styles.accountAvatarInitial}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
          <View style={styles.accountHeaderText}>
            {editingName ? (
              <View style={styles.accountNameEditRow}>
                <TextInput
                  style={styles.accountNameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  maxLength={NAME_MAX_LENGTH}
                />
                <Pressable
                  style={[styles.accountSaveButton, savingName && styles.buttonDisabled]}
                  onPress={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.accountSaveButtonText}>{t('account.actions.save')}</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleNamePress}>
                <Text style={styles.accountName}>{displayName}</Text>
                <Text style={styles.accountNameHint}>{t('account.actions.doubleTap')}</Text>
              </Pressable>
            )}
            <Text style={styles.accountJoined}>{t('account.joined', { time: joinedDateText })}</Text>
          </View>
        </View>
        {editingName ? <Text style={styles.accountNameLimit}>{nameLimitHint}</Text> : null}
        <View style={styles.profilePlanBadgeRow}>
          <Pressable style={styles.profilePlanBadge} onPress={() => setPlanModalVisible(true)}>
            <Text style={styles.profilePlanBadgeText}>{planLabel}</Text>
          </Pressable>
          <Text style={styles.profilePlanDetail}>{planDetailText}</Text>
        </View>
      </View>

      <Pressable style={styles.orgTile} onPress={handleOpenOrgHub}>
        <View>
          <Text style={styles.orgTileTitle}>{t('account.orgTile.title')}</Text>
          <Text style={styles.orgTileSubtitle}>{orgTileSubtitle}</Text>
        </View>
        <View style={styles.orgTileIconRow}>
          {isOrgAdmin ? (
            <Pressable style={styles.orgTileIcon} onPress={handleOpenApprovals}>
              <Ionicons name="people-circle-outline" size={22} color="#0f172a" />
              {approvals.length > 0 ? (
                <View style={styles.orgTileBadge}>
                  <Text style={styles.orgTileBadgeText}>
                    {approvals.length > 99 ? '99+' : approvals.length.toString()}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          <View style={styles.orgTileIcon}>
            <Ionicons name="chevron-forward" size={20} color="#0f172a" />
          </View>
        </View>
      </Pressable>

      <Pressable style={styles.tagTile} onPress={() => setTagCenterVisible(true)}>
        <View style={styles.tagTileCopy}>
          <Text style={styles.tagTileTitle}>{t('account.tags.tileLabel')}</Text>
          <Text style={styles.tagTileSubtitle} numberOfLines={1} ellipsizeMode="tail">
            {t('account.tags.manageIntro')}
          </Text>
        </View>
        <View style={styles.tagTileIconRow}>
          <View style={styles.tagTileIcon}>
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
          </View>
          <View style={styles.tagTileIcon}>
            <Ionicons name="chevron-forward" size={20} color="#0f172a" />
          </View>
        </View>
      </Pressable>

      <AccountSection
        title={t('account.sections.security')}
        defaultOpen={openSections.security}
        style={styles.accountSectionSand}
      >
        <Text style={styles.accountListEmpty}>{t('account.security.placeholder')}</Text>
      </AccountSection>

      <Pressable
        style={[styles.signOutButton, signOutLoading && styles.buttonDisabled]}
        onPress={onSignOut}
        disabled={signOutLoading}
      >
        {signOutLoading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.signOutButtonText}>{t('session.signOut')}</Text>
        )}
      </Pressable>

      <Modal
        visible={planModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <View style={styles.planModalOverlay}>
          <View style={styles.planModalCard}>
            <View style={styles.planModalHeader}>
              <Text style={styles.planModalTitle}>{planLabel}</Text>
              <Pressable style={styles.planModalClose} onPress={() => setPlanModalVisible(false)}>
                <Ionicons name="close" size={18} color="#0f172a" />
              </Pressable>
            </View>
            <Text style={styles.planModalDetail}>{planDetail}</Text>
            <View style={styles.planLimitList}>
              <Text style={styles.planLimitItem}>
                {t('account.plan.limitOrgs', { count: formatLimitValue(effectivePlanLimits.maxOrgsPerUser) })}
              </Text>
              <Text style={styles.planLimitItem}>
                {t('account.plan.limitGroups', { count: formatLimitValue(effectivePlanLimits.maxGroupsPerOrganization) })}
              </Text>
              <Text style={styles.planLimitItem}>
                {t('account.plan.limitMembers', { count: formatLimitValue(effectivePlanLimits.maxMembersPerOrganization) })}
              </Text>
              <Text style={styles.planLimitItem}>
                {t('account.plan.limitAdmins', { count: formatLimitValue(effectivePlanLimits.maxGroupAdminRolesPerUser) })}
              </Text>
            </View>
            <Pressable style={styles.planUpgradeButton}>
              <Text style={styles.planUpgradeButtonText}>{t('account.plan.upgradeCta')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={orgHubVisible} animationType="slide" onRequestClose={handleCloseOrgHub}>
        <SafeAreaView style={styles.orgHubSafeArea}>
          <View style={styles.orgHubHeader}>
            <Pressable style={styles.orgHubBackButton} onPress={handleCloseOrgHub}>
              <Ionicons name="chevron-back" size={24} color="#0f172a" />
            </Pressable>
            <Text style={styles.orgHubTitle}>{t('account.organization.hubTitle')}</Text>
            <View style={styles.orgHubHeaderSpacer} />
          </View>
          <View style={styles.orgHubBody}>
            <Text style={styles.orgHubSubtitle}>{t('account.organization.hubSubtitle')}</Text>
            {organization ? (
              <View style={styles.orgHubList}>
                <Pressable
                  style={[
                    styles.accountOrgRow,
                    organization.visibility === 'private'
                      ? styles.accountOrgRowPrivate
                      : styles.accountOrgRowPublic,
                  ]}
                  onPress={handleOpenEditModal}
                >
                  <View style={styles.orgHubRowLeft}>
                    <Text style={styles.accountOrgRowName} numberOfLines={1}>
                      {organization.name}
                    </Text>
                    <Text style={styles.accountOrgCardMeta}>
                      {t('account.organization.role', { role: organization.role ?? 'member' })}
                    </Text>
                  </View>
                  <View style={styles.accountOrgRowMeta}>
                    <View
                      style={[
                        styles.accountOrgRowBadge,
                        organization.visibility === 'private'
                          ? styles.accountOrgRowBadgePrivate
                          : styles.accountOrgRowBadgePublic,
                      ]}
                    >
                      <Text style={styles.accountOrgRowBadgeText}>{orgVisibilityLabel}</Text>
                    </View>
                    <Pressable style={styles.orgRowAction} onPress={handleOpenEditModal}>
                      <Ionicons name="create-outline" size={18} color="#0f172a" />
                    </Pressable>
                    <Pressable style={styles.orgRowAction} onPress={handleOpenOrgSettings}>
                      <Ionicons name="settings-outline" size={18} color="#0f172a" />
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            ) : (
              <View style={styles.orgHubEmpty}>
                <Text style={styles.orgHubEmptyText}>{t('account.organization.hubEmpty')}</Text>
              </View>
            )}
            <Pressable style={styles.orgHubCreateButton} onPress={handleOpenCreateSheet}>
              <Ionicons name="add-circle-outline" size={20} color="#ecfeff" />
              <Text style={styles.orgHubCreateButtonText}>{t('account.organization.hubCreate')}</Text>
            </Pressable>
            {isFreePlan ? (
              <Text style={styles.orgHubHint}>{t('account.organization.freeLimitHint')}</Text>
            ) : null}
            {organization ? (
              <Pressable style={styles.orgHubJoinButton} onPress={handleOpenJoinPage}>
                <View style={styles.orgHubJoinIcon}>
                  <Ionicons name="people-outline" size={20} color="#ecfeff" />
                </View>
                <Text style={styles.orgHubJoinButtonText}>{t('account.join.orgHubButton')}</Text>
                <View style={styles.orgHubJoinIcon}>
                  <Ionicons name="chevron-forward" size={20} color="#ecfeff" />
                </View>
              </Pressable>
            ) : null}
            {organization ? (
              <Pressable style={styles.orgHubJoinButton} onPress={() => setManageMembersVisible(true)}>
                <View style={styles.orgHubJoinIcon}>
                  <Ionicons name="settings-outline" size={20} color="#ecfeff" />
                </View>
                <Text style={styles.orgHubJoinButtonText}>{t('account.members.manageEntry')}</Text>
                <View style={styles.orgHubJoinIcon}>
                  <Ionicons name="chevron-forward" size={20} color="#ecfeff" />
                </View>
              </Pressable>
            ) : null}
            <MembershipSection
              session={session}
              organization={organization}
              members={members}
              memberships={memberships}
              membershipsLoading={membershipsLoading}
              membershipsError={membershipsError}
              onRefreshMemberships={refreshMemberships}
              onRefreshMembers={onRefreshMembers}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <OrgSettingsSheet
        visible={orgSettingsVisible}
        onClose={handleCloseOrgSettings}
        organization={organization}
        memberUsageLabel={memberUsageLabel}
        groupUsageLabel={groupUsageLabel}
        planLabel={planLabel}
        planDetail={planDetail}
        defaultGroupMemberLabel={defaultGroupMemberLabel}
        groups={groups}
        groupsLoading={groupsLoading}
        groupsError={groupsError}
        groupLimitLabel={groupLimitLabel}
        groupLimitValue={groupLimitValue}
        onRefreshGroups={refreshGroups}
        onManageMembers={handleFocusMembersFromSettings}
        onCreateGroup={handleOpenGroupForm}
      />

      <OrgGroupForm
        visible={groupFormVisible}
        saving={groupFormSaving}
        onClose={handleCloseGroupForm}
        onSubmit={handleSubmitGroup}
      />

      <JoinOrganizationPage
        visible={joinPageVisible}
        onClose={handleCloseJoinPage}
        inviteProps={inviteProps}
        joinRequests={joinRequests}
        joinRequestsLoading={joinRequestsLoading}
        joinRequestsError={joinRequestsError}
        onRefreshJoinRequests={onRefreshJoinRequests}
        onRefreshOrganization={onRefreshOrganization}
        onRefreshMemberships={refreshMemberships}
        onOpenApprovals={handleOpenApprovals}
        isOrgAdmin={isOrgAdmin}
        formatDateTime={formatDateTime}
        userId={session.user.id}
      />

      <ManageJoinRequestsSheet
        visible={manageRequestsVisible}
        approvals={approvals}
        loading={approvalsLoading}
        error={approvalsError}
        onClose={handleCloseManageRequests}
        onRefresh={approvalsRefresh}
        onApprove={(req) => handleReviewRequest(req, 'approved')}
        onReject={(req) => handleReviewRequest(req, 'rejected')}
        processingId={processingRequestId}
        formatDateTime={formatDateTime}
      />

      <MembersManagerScreen
        visible={manageMembersVisible}
        organizationId={organization?.id ?? null}
        onClose={() => setManageMembersVisible(false)}
      />

      <Modal
        visible={orgCreateVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseCreateSheet}
      >
        <View style={styles.orgCreateOverlay}>
          <View style={styles.orgCreateSheet}>
            <View style={styles.orgCreateHeader}>
              <Text style={styles.orgCreateTitle}>{t('account.organization.hubCreate')}</Text>
              <Pressable style={styles.orgCreateClose} onPress={handleCloseCreateSheet}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
            <Text style={styles.orgImmutableHint}>{t('account.organization.nameImmutableHint')}</Text>
            <CreateOrganizationCard
              creating={creatingOrganization}
              onCreate={handleCreateFromSheet}
              canCreate
              disabledReason={null}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={orgEditVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOrgEditVisible(false)}
      >
        <View style={styles.orgCreateOverlay}>
          <View style={styles.orgCreateSheet}>
            <View style={styles.orgCreateHeader}>
              <Text style={styles.orgCreateTitle}>{t('account.organization.editTitle')}</Text>
              <Pressable style={styles.orgCreateClose} onPress={() => setOrgEditVisible(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
            <Text style={styles.orgImmutableHint}>{t('account.organization.editIntro')}</Text>
            <EditOrganizationCard
              initialName={orgEditValues.name}
              initialDescription={orgEditValues.description}
              initialDisplayName={orgEditValues.displayName}
              initialVisibility={orgEditValues.visibility}
              saving={orgEditSaving}
              onSave={handleUpdateOrganization}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={tagCenterVisible} animationType="slide" onRequestClose={() => setTagCenterVisible(false)}>
        <SafeAreaView style={styles.tagCenterContainer}>
          <View style={styles.tagCenterHeader}>
            <Pressable style={styles.tagCenterBack} onPress={() => setTagCenterVisible(false)}>
              <Text style={styles.tagCenterBackText}>{t('app.back')}</Text>
            </Pressable>
            <View>
              <Text style={styles.tagCenterTitle}>{t('account.tags.centerTitle')}</Text>
              <Text style={styles.tagCenterSubtitle}>{t('account.tags.centerSubtitle')}</Text>
            </View>
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.tagCenterContent}
            showsVerticalScrollIndicator={false}
          >
            {tagCenterLoading ? (
              <View style={styles.tagStatusRow}>
                <ActivityIndicator color="#4c1d95" size="small" />
                <Text style={styles.tagStatusText}>{t('account.tags.loading')}</Text>
              </View>
            ) : null}
            {tagCenterError ? <Text style={styles.tagErrorText}>{tagCenterError}</Text> : null}
            {isOrgAdmin ? (
              <View style={[styles.tagCard, styles.tagAdminCard]}>
                <View style={styles.tagCardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.tagCardTitle}>{t('account.tags.adminHeading')}</Text>
                    <Text style={styles.tagCardSubtitle}>{t('account.tags.adminSubtitle')}</Text>
                  </View>
                  <View style={styles.tagCardIcon}>
                    <Ionicons name="shield-checkmark-outline" size={26} color="#4c1d95" />
                  </View>
                </View>
                <View style={styles.tagStatsRow}>
                  <View style={styles.tagStatPill}>
                    <Text style={styles.tagStatValue}>{tagCategories.length}</Text>
                    <Text style={styles.tagStatLabel}>{t('account.tags.statCategories')}</Text>
                  </View>
                  <View style={styles.tagStatPill}>
                    <Text style={styles.tagStatValue}>{pendingAdminRequests}</Text>
                    <Text style={styles.tagStatLabel}>{t('account.tags.statPending')}</Text>
                  </View>
                </View>
                <View style={styles.tagChecklist}>
                  <View style={styles.tagChecklistItem}>
                    <Ionicons name="layers-outline" size={20} color="#4c1d95" />
                    <View style={styles.tagChecklistCopy}>
                      <Text style={styles.tagChecklistTitle}>{t('account.tags.adminCategoriesTitle')}</Text>
                      <Text style={styles.tagChecklistText}>{t('account.tags.adminCategoriesHint')}</Text>
                    </View>
                  </View>
                  <View style={styles.tagChecklistItem}>
                    <Ionicons name="notifications-outline" size={20} color="#4c1d95" />
                    <View style={styles.tagChecklistCopy}>
                      <Text style={styles.tagChecklistTitle}>{t('account.tags.adminWorkflowTitle')}</Text>
                      <Text style={styles.tagChecklistText}>{t('account.tags.adminWorkflowHint')}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tagCategoryList}>
                  {tagCategories.length === 0 ? (
                    <Text style={styles.tagEmptyText}>{t('account.tags.adminCategoryEmpty')}</Text>
                  ) : (
                    tagCategories.slice(0, 4).map((category) => (
                      <Pressable
                        key={category.id}
                        style={styles.tagCategoryRow}
                        onPress={() => handleOpenCategorySheet(category)}
                      >
                        <View style={styles.flex}>
                          <View style={styles.tagCategoryHeader}>
                            <Text style={styles.tagCategoryName}>{category.name}</Text>
                            {category.isRequired ? (
                              <Text style={[styles.tagBadge, styles.tagBadgeRequired]}>
                                {t('account.tags.badgeRequired')}
                              </Text>
                            ) : null}
                            <Text style={[styles.tagBadge, styles.tagBadgeSelection]}>
                              {category.selectionType === 'single'
                                ? t('account.tags.badgeSingle')
                                : t('account.tags.badgeMultiple')}
                            </Text>
                          </View>
                          <Text style={styles.tagCategoryMeta}>
                            {category.groupName
                              ? t('account.tags.categoryGroupMeta', { group: category.groupName })
                              : t('account.tags.categoryOrgMeta')}
                            {' 路 '}
                            {t('account.tags.categoryTagCount', { count: category.tags.length })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#475569" />
                      </Pressable>
                    ))
                  )}
                  {tagCategories.length > 4 ? (
                    <Pressable style={styles.tagMoreButton} onPress={handleTagPlaceholder}>
                      <Text style={styles.tagMoreButtonText}>
                        {t('account.tags.adminCategoryMore', { count: tagCategories.length - 4 })}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.tagActionRow}>
                  <Pressable style={styles.tagOutlineButton} onPress={handleTagPlaceholder}>
                    <Text style={styles.tagOutlineButtonText}>{t('account.tags.adminRequestsButton')}</Text>
                  </Pressable>
                  <Pressable style={styles.tagPrimaryButton} onPress={handleStartCreateCategory}>
                    <Text style={styles.tagPrimaryButtonText}>{t('account.tags.adminCreateButton')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <View style={[styles.tagCard, styles.tagMemberCard]}>
                <View style={styles.tagCardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.tagCardTitle}>{t('account.tags.memberHeading')}</Text>
                    <Text style={styles.tagCardSubtitle}>{t('account.tags.memberSubtitle')}</Text>
                  </View>
                  <View style={styles.tagCardIcon}>
                    <Ionicons name="pricetag-outline" size={26} color="#0f172a" />
                  </View>
                </View>
                <View style={styles.tagStatsRow}>
                  <View style={styles.tagStatPill}>
                    <Text style={styles.tagStatValue}>{missingRequiredCount}</Text>
                    <Text style={styles.tagStatLabel}>{t('account.tags.statMissing')}</Text>
                  </View>
                  <View style={styles.tagStatPill}>
                    <Text style={styles.tagStatValue}>{pendingMemberRequests}</Text>
                    <Text style={styles.tagStatLabel}>{t('account.tags.statPending')}</Text>
                  </View>
                </View>
                <View style={styles.tagChecklist}>
                  <View style={styles.tagChecklistItem}>
                    <Ionicons name="alert-circle-outline" size={20} color="#b45309" />
                    <View style={styles.tagChecklistCopy}>
                      <Text style={styles.tagChecklistTitle}>{t('account.tags.memberRequiredTitle')}</Text>
                      <Text style={styles.tagChecklistText}>{t('account.tags.memberRequiredHint')}</Text>
                    </View>
                  </View>
                  <View style={styles.tagChecklistItem}>
                    <Ionicons name="color-filter-outline" size={20} color="#0f172a" />
                    <View style={styles.tagChecklistCopy}>
                      <Text style={styles.tagChecklistTitle}>{t('account.tags.memberOptionalTitle')}</Text>
                      <Text style={styles.tagChecklistText}>{t('account.tags.memberOptionalHint')}</Text>
                    </View>
                  </View>
                  <View style={styles.tagChecklistItem}>
                    <Ionicons name="time-outline" size={20} color="#0f172a" />
                    <View style={styles.tagChecklistCopy}>
                      <Text style={styles.tagChecklistTitle}>{t('account.tags.memberHistoryTitle')}</Text>
                      <Text style={styles.tagChecklistText}>{t('account.tags.memberHistoryHint')}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tagAssignmentSection}>
                  <Text style={styles.tagAssignmentHeading}>{t('account.tags.memberRequiredSection')}</Text>
                  {requiredAssignments.length === 0 ? (
                    <Text style={styles.tagEmptyText}>{t('account.tags.memberRequiredEmpty')}</Text>
                  ) : (
                    requiredAssignments.map((assignment) => (
                      <Pressable
                        key={assignment.categoryId}
                        style={[
                          styles.tagAssignmentRow,
                          assignment.hasMissingRequired && styles.tagAssignmentRowWarning,
                        ]}
                        onPress={handleTagPlaceholder}
                      >
                        <View style={styles.flex}>
                          <Text style={styles.tagAssignmentName}>{assignment.categoryName}</Text>
                          <Text style={styles.tagAssignmentMeta}>
                            {assignment.selectedTagIds.length > 0
                              ? t('account.tags.memberSelectedCount', { count: assignment.selectedTagIds.length })
                              : t('account.tags.memberMissing')}
                          </Text>
                        </View>
                        <Ionicons
                          name={assignment.hasMissingRequired ? 'alert-circle' : 'chevron-forward'}
                          size={18}
                          color={assignment.hasMissingRequired ? '#b45309' : '#475569'}
                        />
                      </Pressable>
                    ))
                  )}
                  <Text style={styles.tagAssignmentHeading}>{t('account.tags.memberOptionalSection')}</Text>
                  {optionalAssignments.length === 0 ? (
                    <Text style={styles.tagEmptyText}>{t('account.tags.memberOptionalEmpty')}</Text>
                  ) : (
                    optionalAssignments.slice(0, 4).map((assignment) => (
                      <Pressable key={assignment.categoryId} style={styles.tagAssignmentRow} onPress={handleTagPlaceholder}>
                        <View style={styles.flex}>
                          <Text style={styles.tagAssignmentName}>{assignment.categoryName}</Text>
                          <Text style={styles.tagAssignmentMeta}>
                            {assignment.selectedTagIds.length > 0
                              ? t('account.tags.memberSelectedCount', { count: assignment.selectedTagIds.length })
                              : t('account.tags.memberOptionalHintShort')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#475569" />
                      </Pressable>
                    ))
                  )}
                </View>
                <View style={styles.tagActionRow}>
                  <Pressable style={styles.tagPrimaryButton} onPress={handleTagPlaceholder}>
                    <Text style={styles.tagPrimaryButtonText}>{t('account.tags.memberStartButton')}</Text>
                  </Pressable>
                  <Pressable style={styles.tagOutlineButton} onPress={handleTagPlaceholder}>
                    <Text style={styles.tagOutlineButtonText}>{t('account.tags.memberHistoryButton')}</Text>
                  </Pressable>
                </View>
              </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={tagCategorySheet !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCloseCategorySheet}
      >
        <View style={styles.orgCreateOverlay}>
          <View style={styles.orgCreateSheet}>
            <View style={styles.orgCreateHeader}>
              <Text style={styles.orgCreateTitle}>
                {tagCategorySheet?.mode === 'create'
                  ? t('account.tags.sheet.createTitle')
                  : tagCategorySheet?.mode === 'edit'
                    ? t('account.tags.sheet.editTitle')
                    : t('account.tags.sheet.viewTitle')}
              </Text>
              <Pressable style={styles.orgCreateClose} onPress={handleCloseCategorySheet}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
            {tagCategorySheet?.mode === 'view' ? (
              <>
                <View style={styles.tagSheetMeta}>
                  <Text style={styles.tagSheetMetaText}>
                    {tagCategorySheet?.category?.groupName
                      ? t('account.tags.sheet.scopeGroup', { group: tagCategorySheet?.category?.groupName ?? '' })
                      : t('account.tags.sheet.scopeOrg')}
                  </Text>
                  <Text style={styles.tagSheetMetaText}>
                    {tagCategorySheet?.category?.selectionType === 'single'
                      ? t('account.tags.sheet.selectionSingle')
                      : t('account.tags.sheet.selectionMultiple')}
                  </Text>
                  <Text style={styles.tagSheetMetaText}>
                    {tagCategorySheet?.category?.isRequired
                      ? t('account.tags.sheet.requirementRequired')
                      : t('account.tags.sheet.requirementOptional')}
                  </Text>
                </View>
                <View style={styles.tagSheetTagList}>
                  <Text style={styles.tagSheetTagHeading}>{t('account.tags.sheet.tagsHeading')}</Text>
                  {tagCategorySheet?.category?.tags.length ? (
                    tagCategorySheet?.category?.tags.map((tag) => (
                      <View key={tag.id} style={styles.tagSheetTagRow}>
                        <View style={styles.flex}>
                          <Text style={styles.tagSheetTagName}>{tag.name}</Text>
                          {!tag.isActive ? (
                            <Text style={[styles.tagBadge, styles.tagBadgeRequired]}>
                              {t('account.tags.badgeInactive')}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.tagSheetTagActions}>
                          <Pressable
                            style={styles.tagChipButton}
                            onPress={() => handleToggleTag(tag)}
                            disabled={tagMutationId === tag.id}
                          >
                            {tagMutationId === tag.id ? (
                              <ActivityIndicator color="#0f172a" />
                            ) : (
                              <Ionicons
                                name={tag.isActive ? 'pause-outline' : 'play-outline'}
                                size={18}
                                color="#0f172a"
                              />
                            )}
                          </Pressable>
                          <Pressable
                            style={[styles.tagChipButton, styles.tagChipDanger]}
                            onPress={() => handleDeleteTag(tag)}
                            disabled={tagMutationId === `delete-${tag.id}`}
                          >
                            {tagMutationId === `delete-${tag.id}` ? (
                              <ActivityIndicator color="#b91c1c" />
                            ) : (
                              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                            )}
                          </Pressable>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.tagEmptyText}>{t('account.tags.sheet.tagsEmpty')}</Text>
                  )}
                </View>
                <View style={styles.tagSheetAddRow}>
                  <TextInput
                    style={[styles.accountInput, styles.tagSheetTagInput]}
                    value={newTagName}
                    onChangeText={setNewTagName}
                    placeholder={t('account.tags.sheet.tagNamePlaceholder')}
                  />
                  <Pressable
                    style={[styles.primaryButton, styles.tagSheetAddButton, (tagMutationId === 'create' || !newTagName.trim()) && styles.buttonDisabled]}
                    onPress={handleAddTag}
                    disabled={tagMutationId === 'create' || !newTagName.trim()}
                  >
                    {tagMutationId === 'create' ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('account.tags.sheet.addTag')}</Text>
                    )}
                  </Pressable>
                </View>
                {tagActionError ? <Text style={styles.tagSheetError}>{tagActionError}</Text> : null}
                <View style={styles.tagSheetButtons}>
                  <Pressable style={styles.secondaryButton} onPress={handleStartEditCategory}>
                    <Text style={styles.secondaryButtonText}>{t('account.tags.sheet.editButton')}</Text>
                  </Pressable>
                </View>
                {tagActionError ? <Text style={styles.tagSheetError}>{tagActionError}</Text> : null}
                {confirmDeleteCategory ? (
                  <View style={styles.tagDeleteConfirm}>
                    <Text style={styles.tagDeleteConfirmText}>{t('account.tags.sheet.deleteConfirm')}</Text>
                    <View style={styles.tagDeleteConfirmActions}>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => {
                          setConfirmDeleteCategory(false);
                          setCategoryDeleteLoading(false);
                          setTagActionError(null);
                        }}
                      >
                        <Text style={styles.secondaryButtonText}>{t('app.cancel')}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.tagDeleteButton, categoryDeleteLoading && styles.buttonDisabled]}
                        onPress={handleDeleteCategory}
                        disabled={categoryDeleteLoading}
                      >
                        {categoryDeleteLoading ? (
                          <ActivityIndicator color="#b91c1c" />
                        ) : (
                          <Text style={styles.tagDeleteButtonText}>{t('account.tags.sheet.deleteCategory')}</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable style={styles.tagDeleteButtonOutline} onPress={() => setConfirmDeleteCategory(true)}>
                    <Text style={styles.tagDeleteButtonText}>{t('account.tags.sheet.deleteCategory')}</Text>
                  </Pressable>
                )}
                </>
            ) : (
              <View style={styles.tagSheetForm}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('account.tags.sheet.nameLabel')}</Text>
                  <TextInput
                    style={styles.accountInput}
                    value={categoryForm.name}
                    onChangeText={(text) => setCategoryForm((prev) => ({ ...prev, name: text }))}
                    placeholder={t('account.tags.sheet.nameLabel')}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('account.tags.sheet.scopeLabel')}</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      style={[styles.toggleButton, categoryForm.scope === 'organization' && styles.toggleButtonActive]}
                      onPress={() =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          scope: 'organization',
                          groupId: null,
                        }))
                      }
                    >
                      <Text
                        style={categoryForm.scope === 'organization' ? styles.toggleLabelActive : styles.toggleLabel}
                      >
                        {t('account.tags.sheet.scopeOrgShort')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toggleButton, categoryForm.scope === 'group' && styles.toggleButtonActive]}
                      onPress={() =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          scope: 'group',
                          groupId: prev.groupId ?? groups[0]?.id ?? null,
                        }))
                      }
                    >
                      <Text style={categoryForm.scope === 'group' ? styles.toggleLabelActive : styles.toggleLabel}>
                        {t('account.tags.sheet.scopeGroupShort')}
                      </Text>
                    </Pressable>
                  </View>
                  {categoryForm.scope === 'group' ? (
                    groups.length === 0 ? (
                      <Text style={styles.tagSheetGroupHint}>{t('account.tags.sheet.groupMissing')}</Text>
                    ) : (
                      <View style={styles.tagSheetGroupList}>
                        {groups.map((group) => (
                          <Pressable
                            key={group.id}
                            style={[
                              styles.tagSheetGroupItem,
                              categoryForm.groupId === group.id && styles.tagSheetGroupItemActive,
                            ]}
                            onPress={() => setCategoryForm((prev) => ({ ...prev, groupId: group.id }))}
                          >
                            <Text
                              style={
                                categoryForm.groupId === group.id
                                  ? styles.tagSheetGroupItemTextActive
                                  : styles.tagSheetGroupItemText
                              }
                            >
                              {group.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )
                  ) : null}
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('account.tags.sheet.selectionLabel')}</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      style={[styles.toggleButton, categoryForm.selectionType === 'single' && styles.toggleButtonActive]}
                      onPress={() => setCategoryForm((prev) => ({ ...prev, selectionType: 'single' }))}
                    >
                      <Text
                        style={categoryForm.selectionType === 'single' ? styles.toggleLabelActive : styles.toggleLabel}
                      >
                        {t('account.tags.sheet.selectionSingleShort')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toggleButton, categoryForm.selectionType === 'multiple' && styles.toggleButtonActive]}
                      onPress={() => setCategoryForm((prev) => ({ ...prev, selectionType: 'multiple' }))}
                    >
                      <Text
                        style={
                          categoryForm.selectionType === 'multiple' ? styles.toggleLabelActive : styles.toggleLabel
                        }
                      >
                        {t('account.tags.sheet.selectionMultipleShort')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('account.tags.sheet.requiredLabel')}</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      style={[styles.toggleButton, categoryForm.required && styles.toggleButtonActive]}
                      onPress={() => setCategoryForm((prev) => ({ ...prev, required: true }))}
                    >
                      <Text style={categoryForm.required ? styles.toggleLabelActive : styles.toggleLabel}>
                        {t('account.tags.sheet.requirementRequiredShort')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toggleButton, !categoryForm.required && styles.toggleButtonActive]}
                      onPress={() => setCategoryForm((prev) => ({ ...prev, required: false }))}
                    >
                      <Text style={!categoryForm.required ? styles.toggleLabelActive : styles.toggleLabel}>
                        {t('account.tags.sheet.requirementOptionalShort')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {categoryFormError ? <Text style={styles.tagSheetError}>{categoryFormError}</Text> : null}
                {tagActionError ? <Text style={styles.tagSheetError}>{tagActionError}</Text> : null}
                <Pressable
                  style={[styles.primaryButton, categoryFormSaving && styles.buttonDisabled]}
                  onPress={handleSubmitCategoryForm}
                  disabled={categoryFormSaving}
                >
                  {categoryFormSaving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {tagCategorySheet?.mode === 'create'
                        ? t('account.tags.sheet.save')
                        : t('account.tags.sheet.save')}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

