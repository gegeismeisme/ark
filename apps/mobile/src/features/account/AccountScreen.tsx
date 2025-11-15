import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
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
import { supabase } from '../../lib/supabaseClient';
import { useOrganizationGroups } from '../organizations/useOrganizationGroups';

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
  const [groupFormVisible, setGroupFormVisible] = useState(false);
  const [joinPageVisible, setJoinPageVisible] = useState(false);
  const [manageRequestsVisible, setManageRequestsVisible] = useState(false);
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
    ? `${t('account.orgTile.active', { name: organization.name })} · ${orgVisibilityLabel}`
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

  const handleReviewRequest = async (requestId: string, nextStatus: 'approved' | 'rejected') => {
    if (!organization) return;
    setProcessingRequestId(requestId);
    const { error } = await supabase.rpc('review_org_join_request', {
      p_request_id: requestId,
      p_next_status: nextStatus,
      p_response_note: null,
    });
    if (error) {
      setProcessingRequestId(null);
      Alert.alert(t('app.alert.noticeTitle'), error.message ?? t('account.join.manageError'));
      return;
    }
    await Promise.all([approvalsRefresh(), onRefreshMembers(), onRefreshJoinRequests()]);
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
    await onRefreshOrganization();
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

      <AccountSection
        title={t('account.sections.organization')}
        defaultOpen={openSections.organization}
        style={styles.accountSectionLavender}
      >
        <Text style={styles.accountListEmpty}>{t('account.organization.manageInHub')}</Text>
        <Text style={styles.accountOrgHint}>{t('account.join.manageInHub')}</Text>
        <Pressable style={styles.accountOrgShortcut} onPress={handleOpenOrgHub}>
          <Ionicons name="business-outline" size={18} color="#0f172a" />
          <Text style={styles.accountOrgShortcutText}>{t('account.orgTile.title')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#0f172a" />
        </Pressable>
      </AccountSection>

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
        onOpenApprovals={handleOpenApprovals}
        isOrgAdmin={isOrgAdmin}
        formatDateTime={formatDateTime}
      />

      <ManageJoinRequestsSheet
        visible={manageRequestsVisible}
        approvals={approvals}
        loading={approvalsLoading}
        error={approvalsError}
        onClose={handleCloseManageRequests}
        onRefresh={approvalsRefresh}
        onApprove={(id) => handleReviewRequest(id, 'approved')}
        onReject={(id) => handleReviewRequest(id, 'rejected')}
        processingId={processingRequestId}
        formatDateTime={formatDateTime}
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
    </View>
  );
}
