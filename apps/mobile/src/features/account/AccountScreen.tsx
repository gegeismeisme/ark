import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import type { OrganizationMember } from '../organizations/useOrganizationMembers';
import type { JoinRequest } from '../../types';
import type { Profile } from '../profile/useProfile';
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
};

export function AccountScreen({
  profile,
  session,
  planTier,
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

  const memberLimit = planTier === 'free' ? FREE_LIMITS.members : Infinity;
  const canCreateOrg =
    planTier !== 'free' || !organization ? true : members.length === 0 && !organization;

  return (
    <View style={styles.accountScreen}>
      <AccountSection title={t('account.sections.profile')} defaultOpen={openSections.profile}>
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
            <Text style={styles.accountJoined}>
              {profile?.createdAt
                ? t('account.joined', { time: new Date(profile.createdAt).toLocaleDateString() })
                : t('account.joined', { time: '--' })}
            </Text>
          </View>
        </View>
      </AccountSection>

      <AccountSection title={t('account.sections.organization')} defaultOpen={openSections.organization}>
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
              {t('account.organization.memberCount', { count: members.length, limit: memberLimit })}
            </Text>
          </View>
        ) : (
          <CreateOrganizationCard
            creating={creatingOrganization}
            onCreate={onCreateOrganization}
            canCreate={planTier !== 'free' || !organization}
            disabledReason={
              planTier === 'free' ? t('account.organization.upgradeHint', { limit: FREE_LIMITS.organizations }) : null
            }
          />
        )}
      </AccountSection>

      <AccountSection title={t('account.sections.join')} defaultOpen={openSections.join}>
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

      <AccountSection title={t('account.sections.security')} defaultOpen={openSections.security}>
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
    </View>
  );
}
