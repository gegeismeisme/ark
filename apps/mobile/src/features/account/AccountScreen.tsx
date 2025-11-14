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
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { AccountSection } from './AccountSection';
import { CreateOrganizationCard } from './CreateOrganizationCard';
import { InvitePanel } from '../invites/InvitePanel';
import { useOrgJoinApprovals } from './useOrgJoinApprovals';
import { supabase } from '../../lib/supabaseClient';

export type AccountSectionKey = 'profile' | 'organization' | 'join' | 'security';

type InviteProps = {
  redeemCode: string;
  setRedeemCode: (value: string) => void;
  redeemLoading: boolean;
  redeemMessage: string | null;
  redeemError: string | null;
  onRedeem: () => void;
};

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
  onCreateOrganization: (payload: { name: string; description: string; displayName: string }) => Promise<boolean>;
  creatingOrganization: boolean;
  members: OrganizationMember[];
  membersLoading: boolean;
  onRefreshMembers: () => Promise<void>;
  formatDateTime: (value: string | null) => string;
  inviteProps: InviteProps;
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
  const [orgDisplaySaving, setOrgDisplaySaving] = useState(false);

  const { approvals, loading: approvalsLoading } = useOrgJoinApprovals(organization?.id ?? null);

  const [openSections, setOpenSections] = useState<Record<AccountSectionKey, boolean>>({
    profile: true,
    organization: true,
    join: false,
    security: false,
  });
  const [orgHubVisible, setOrgHubVisible] = useState(false);
  const [orgCreateVisible, setOrgCreateVisible] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);

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
  const orgTileSubtitle = organization
    ? t('account.orgTile.active', { name: organization.name })
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

  const handleUpdateOrgDisplayName = async () => {
    if (!organization?.id) return;
    const trimmed = orgDisplayName.trim();
    if (!trimmed) {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.errorMissing'));
      return;
    }
    setOrgDisplaySaving(true);
    const { error } = await supabase
      .from('organization_members')
      .update({ display_name: trimmed })
      .eq('organization_id', organization.id)
      .eq('user_id', session.user.id);
    setOrgDisplaySaving(false);
    if (error) {
      Alert.alert(t('app.alert.noticeTitle'), error.message ?? t('app.alert.genericError'));
    } else {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.displayUpdated'));
      void onRefreshMembers();
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
  }) => {
    const success = await onCreateOrganization(payload);
    if (success) {
      setOrgCreateVisible(false);
      setOrgHubVisible(false);
    }
    return success;
  };

  const memberLimit = effectivePlanLimits.maxMembersPerOrganization ?? Infinity;
  const memberLimitLabel =
    Number.isFinite(memberLimit) ? memberLimit : t('account.organization.memberLimitUnlimited');

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
        <View style={styles.orgTileIcon}>
          <Ionicons name="chevron-forward" size={20} color="#0f172a" />
        </View>
      </Pressable>

      <AccountSection
        title={t('account.sections.organization')}
        defaultOpen={openSections.organization}
        style={styles.accountSectionLavender}
      >
        {organization ? (
          <View style={styles.accountOrgCard}>
            <Text style={styles.accountOrgCardTitle}>{organization.name}</Text>
            <Text style={styles.accountOrgCardMeta}>
              {t('account.organization.role', { role: organization.role ?? 'member' })}
            </Text>
            <View style={styles.accountInlineField}>
              <Text style={styles.accountOrgCardMeta}>{t('account.organization.displayName')}</Text>
              <TextInput
                style={styles.accountInput}
                value={orgDisplayName}
                onChangeText={setOrgDisplayName}
                placeholder={t('account.organization.displayNamePlaceholder')}
              />
              <Pressable
                style={[styles.primaryButton, orgDisplaySaving && styles.buttonDisabled]}
                onPress={handleUpdateOrgDisplayName}
                disabled={orgDisplaySaving}
              >
                {orgDisplaySaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('account.actions.save')}</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.accountOrgCardMeta}>
              {t('account.organization.memberCount', { count: members.length, limit: memberLimitLabel })}
            </Text>
          </View>
        ) : (
          <View style={styles.accountOrgEmptyCard}>
            <Text style={styles.accountOrgEmptyTitle}>{t('account.organization.emptyTitle')}</Text>
            <Text style={styles.accountOrgEmptyText}>{t('account.organization.emptyMessage')}</Text>
            <Pressable style={styles.primaryButton} onPress={handleOpenCreateSheet}>
              <Text style={styles.primaryButtonText}>{t('account.organization.hubCreate')}</Text>
            </Pressable>
          </View>
        )}
      </AccountSection>

      <AccountSection
        title={t('account.sections.join')}
        defaultOpen={openSections.join}
        style={styles.accountSectionMint}
      >
        <InvitePanel
          redeemCode={inviteProps.redeemCode}
          setRedeemCode={inviteProps.setRedeemCode}
          redeemLoading={inviteProps.redeemLoading}
          redeemMessage={inviteProps.redeemMessage}
          redeemError={inviteProps.redeemError}
          onRedeem={inviteProps.onRedeem}
          joinRequests={joinRequests}
          joinRequestsLoading={joinRequestsLoading}
          joinRequestsError={joinRequestsError}
          onRefreshRequests={onRefreshJoinRequests}
          formatDateTime={formatDateTime}
        />

        <View style={styles.accountList}>
          <Text style={styles.accountListTitle}>{t('account.organization.memberHeading')}</Text>
          {membersLoading ? (
            <ActivityIndicator color="#0f172a" />
          ) : members.length === 0 ? (
            <Text style={styles.accountListEmpty}>{t('account.organization.noMembers')}</Text>
          ) : (
            members.map((member) => (
              <View key={member.id} style={styles.accountListItem}>
                <Text style={styles.accountListPrimary}>{member.fullName ?? member.userId}</Text>
                <Text style={styles.accountListSecondary}>{member.role ?? 'member'}</Text>
              </View>
            ))
          )}
        </View>

        {organization ? (
          <View style={styles.accountList}>
            <Text style={styles.accountListTitle}>{t('account.organization.pendingHeading')}</Text>
            {approvalsLoading ? (
              <ActivityIndicator color="#0f172a" />
            ) : approvals.length === 0 ? (
              <Text style={styles.accountListEmpty}>{t('account.organization.noPending')}</Text>
            ) : (
              approvals.map((request) => (
                <View key={request.id} style={styles.accountListItem}>
                  <View style={styles.accountListItemText}>
                    <Text style={styles.accountListPrimary}>{request.fullName ?? request.email ?? '—'}</Text>
                    <Text style={styles.accountListSecondary}>{request.message ?? t('account.organization.noNote')}</Text>
                  </View>
                  <Text style={styles.accountListTag}>{request.status}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}
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
                <View style={styles.orgHubListItem}>
                  <View style={styles.orgHubListInfo}>
                    <Text style={styles.orgHubOrgName}>{organization.name}</Text>
                    <Text style={styles.orgHubOrgMeta}>
                      {t('account.organization.role', { role: organization.role ?? 'member' })}
                    </Text>
                  </View>
                  <View style={styles.orgHubActions}>
                    <View style={styles.orgHubActionIcon}>
                      <Ionicons name="create-outline" size={18} color="#0f172a" />
                    </View>
                    <View style={styles.orgHubActionIcon}>
                      <Ionicons name="settings-outline" size={18} color="#0f172a" />
                    </View>
                  </View>
                </View>
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
          </View>
        </SafeAreaView>
      </Modal>

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
    </View>
  );
}
