import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { JoinRequest } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabaseClient';
import type { InviteFormProps } from './types';

type PublicOrgResult = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  createdAt: string;
};

type JoinOrganizationPageProps = {
  visible: boolean;
  onClose: () => void;
  inviteProps: InviteFormProps;
  joinRequests: JoinRequest[];
  joinRequestsLoading: boolean;
  joinRequestsError: string | null;
  onRefreshJoinRequests: () => void;
  onRefreshOrganization: () => Promise<void>;
  onRefreshMemberships: () => Promise<void> | void;
  onOpenApprovals: () => void;
  isOrgAdmin: boolean;
  formatDateTime: (value: string | null) => string;
  userId: string;
};

export function JoinOrganizationPage({
  visible,
  onClose,
  inviteProps,
  joinRequests,
  joinRequestsLoading,
  joinRequestsError,
  onRefreshJoinRequests,
  onRefreshOrganization,
  onRefreshMemberships,
  onOpenApprovals,
  isOrgAdmin,
  formatDateTime,
  userId,
}: JoinOrganizationPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicOrgResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<PublicOrgResult | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'member' | 'pending' | 'none'>('none');
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setSelectedOrg(null);
      setJoinMessage('');
      setDrawerVisible(false);
      return;
    }
  }, [visible]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, description, slug, created_at')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .ilike('name', `%${searchQuery.trim()}%`)
      .limit(20);
    setSearchLoading(false);
    if (error) {
      setSearchError(error.message);
      setSearchResults([]);
      return;
    }
    const mapped =
      (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        slug: row.slug,
        createdAt: row.created_at,
      })) ?? [];
    setSearchResults(mapped);
  }, [searchQuery]);

  const selectedOrgInfo = useMemo(() => selectedOrg, [selectedOrg]);

  const checkMembershipStatus = useCallback(
    (orgId: string) => {
      const pendingRequest = joinRequests.find(
        (req) => req.organizationId === orgId && req.status === 'pending',
      );
      if (pendingRequest) {
        return 'pending';
      }
      // quick check: if join history has approved entry treat as member, otherwise require server call
      const approvedRequest = joinRequests.find(
        (req) => req.organizationId === orgId && req.status === 'approved',
      );
      if (approvedRequest) return 'member';
      return 'none';
    },
    [joinRequests],
  );

  const openDrawerForOrg = useCallback(
    (org: PublicOrgResult) => {
      setSelectedOrg(org);
      const status = checkMembershipStatus(org.id);
      setMembershipStatus(status);
      setDrawerVisible(true);
    },
    [checkMembershipStatus],
  );

  const handleSubmitJoin = useCallback(async () => {
    if (!selectedOrgInfo || membershipStatus !== 'none') return;
    setJoinSubmitting(true);
    setSearchError(null);
    const message = joinMessage.trim() || null;
    const { error } = await supabase.from('organization_join_requests').insert({
      organization_id: selectedOrgInfo.id,
      user_id: userId,
      message,
      status: 'pending',
    });
    setJoinSubmitting(false);
    if (error) {
      setSearchError(error.message);
      return;
    }
    setJoinMessage('');
    setMembershipStatus('pending');
    await Promise.all([onRefreshJoinRequests(), onRefreshOrganization(), onRefreshMemberships()]);
  }, [
    joinMessage,
    membershipStatus,
    onRefreshJoinRequests,
    onRefreshOrganization,
    onRefreshMemberships,
    selectedOrgInfo,
    userId,
  ]);

  const handleDeleteRequest = useCallback(
    async (requestId: string) => {
      setDeleteLoadingId(requestId);
      const { error } = await supabase
        .from('organization_join_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', userId);
      setDeleteLoadingId(null);
      if (error) {
        setSearchError(error.message);
        return;
      }
      await onRefreshJoinRequests();
    },
    [onRefreshJoinRequests, userId],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.joinPage}>
        <View style={styles.joinPageHeader}>
          <Pressable style={styles.joinPageBack} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.joinPageTitle}>{t('account.join.pageTitle')}</Text>
            <Text style={styles.joinPageSubtitle}>{t('account.join.pageSubtitle')}</Text>
          </View>
          {isOrgAdmin ? (
            <Pressable style={styles.joinPageLink} onPress={onOpenApprovals}>
              <Ionicons name="people-circle-outline" size={20} color="#0f172a" />
              <Text style={styles.joinPageLinkText}>{t('account.join.manageLink')}</Text>
            </Pressable>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>
        <ScrollView contentContainerStyle={styles.joinPageContent}>
          <View style={styles.joinPageSection}>
            <Text style={styles.joinPageSectionTitle}>{t('account.join.searchTitle')}</Text>
            <Text style={styles.joinPageSectionHint}>{t('account.join.searchHint')}</Text>
            <View style={styles.joinSearchRow}>
              <TextInput
                style={styles.accountInput}
                placeholder={t('account.join.searchPlaceholder')}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <Pressable style={styles.secondaryButton} onPress={handleSearch}>
                <Text style={styles.secondaryButtonText}>{t('account.join.searchAction')}</Text>
              </Pressable>
            </View>
            {searchLoading ? (
              <ActivityIndicator color="#0f172a" style={{ marginTop: 12 }} />
            ) : searchError ? (
              <Text style={styles.errorText}>{searchError}</Text>
            ) : searchResults.length === 0 ? (
              searchQuery.trim() ? (
                <Text style={styles.joinHistoryEmptyText}>{t('account.join.searchEmpty')}</Text>
              ) : null
            ) : (
              <View style={styles.joinResultList}>
                {searchResults.map((org) => (
                  <Pressable
                    key={org.id}
                    style={[styles.joinResultCard, selectedOrgInfo?.id === org.id && styles.joinResultCardActive]}
                    onPress={() => openDrawerForOrg(org)}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.joinResultName}>{org.name}</Text>
                      {org.description ? (
                        <Text style={styles.joinResultDescription} numberOfLines={2}>
                          {org.description}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#0f172a" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.joinPageSection}>
            <Text style={styles.joinPageSectionTitle}>{t('account.join.inviteTitle')}</Text>
            <Text style={styles.joinPageSectionHint}>{t('account.join.inviteHint')}</Text>
            <TextInput
              style={styles.accountInput}
              placeholder={t('account.join.codePlaceholder')}
              autoCapitalize="characters"
              value={inviteProps.redeemCode}
              onChangeText={inviteProps.setRedeemCode}
            />
            {inviteProps.redeemError ? <Text style={styles.errorText}>{inviteProps.redeemError}</Text> : null}
            {inviteProps.redeemMessage ? (
              <Text style={styles.successText}>{inviteProps.redeemMessage}</Text>
            ) : null}
            <Pressable
              style={[styles.primaryButton, inviteProps.redeemLoading && styles.buttonDisabled]}
              onPress={inviteProps.onRedeem}
              disabled={inviteProps.redeemLoading}
            >
              {inviteProps.redeemLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>{t('account.join.submit')}</Text>
              )}
            </Pressable>
          </View>

          {joinRequests.length > 0 || joinRequestsLoading ? (
            <View style={styles.joinPageSection}>
              <Text style={styles.joinPageSectionTitle}>{t('account.join.historyTitle')}</Text>
              <View style={styles.joinHistoryCard}>
                {joinRequestsLoading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : joinRequestsError ? (
                  <Text style={styles.errorText}>{joinRequestsError}</Text>
                ) : (
                  joinRequests.map((request) => (
                    <View key={request.id} style={styles.joinHistoryItem}>
                      <Text style={styles.joinHistoryOrg}>
                        {request.organizationName ?? t('account.join.unknownOrganization')}
                      </Text>
                      <Text style={styles.joinHistoryMeta}>
                        {t('account.join.submitted', { time: formatDateTime(request.createdAt) })}
                      </Text>
                      <View style={styles.joinHistoryStatusRow}>
                        <Text style={styles.joinHistoryStatus}>{request.status}</Text>
                        <Pressable
                          style={styles.joinHistoryDelete}
                          onPress={() => handleDeleteRequest(request.id)}
                          disabled={deleteLoadingId === request.id}
                        >
                          {deleteLoadingId === request.id ? (
                            <ActivityIndicator color="#0f172a" />
                          ) : (
                            <Ionicons name="trash-outline" size={16} color="#0f172a" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <Modal visible={drawerVisible} animationType="slide" onRequestClose={() => setDrawerVisible(false)} transparent>
          <View style={styles.orgCreateOverlay}>
            <View style={styles.orgCreateSheet}>
              <View style={styles.orgCreateHeader}>
                <Text style={styles.orgCreateTitle}>{selectedOrgInfo?.name ?? ''}</Text>
                <Pressable style={styles.orgCreateClose} onPress={() => setDrawerVisible(false)}>
                  <Ionicons name="close" size={20} color="#0f172a" />
                </Pressable>
              </View>
              {selectedOrgInfo?.description ? (
                <Text style={styles.joinPageSectionHint}>{selectedOrgInfo.description}</Text>
              ) : null}
              <Text style={styles.joinPageMeta}>
                {t('account.join.orgCreated', { time: formatDateTime(selectedOrgInfo?.createdAt ?? null) })}
              </Text>
              {membershipStatus === 'member' || membershipStatus === 'pending' ? (
                <View style={styles.joinInfoCard}>
                  <Ionicons name="information-circle-outline" size={18} color="#0f172a" />
                  <Text style={styles.joinInfoText}>
                    {membershipStatus === 'member'
                      ? t('account.join.alreadyMember')
                      : t('account.join.pendingInfo')}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.joinPageSectionSubtitle}>{t('account.join.reasonLabel')}</Text>
                  <TextInput
                    style={[styles.accountInput, { height: 100, textAlignVertical: 'top' }]}
                    placeholder={t('account.join.reasonPlaceholder')}
                    value={joinMessage}
                    onChangeText={setJoinMessage}
                    multiline
                  />
                  {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
                  <Pressable
                    style={[styles.primaryButton, joinSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmitJoin}
                    disabled={joinSubmitting}
                  >
                    {joinSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('account.join.requestJoin')}</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
