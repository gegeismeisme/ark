import { useCallback, useEffect, useState } from 'react';
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
  onOpenApprovals: () => void;
  isOrgAdmin: boolean;
  formatDateTime: (value: string | null) => string;
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
  onOpenApprovals,
  isOrgAdmin,
  formatDateTime,
}: JoinOrganizationPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicOrgResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requestLoadingId, setRequestLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setRequestLoadingId(null);
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
      .select('id, name, description, slug')
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
    setSearchResults((data ?? []) as PublicOrgResult[]);
  }, [searchQuery]);

  const handleRequestJoin = useCallback(
    async (orgId: string) => {
      setRequestLoadingId(orgId);
      const { error } = await supabase.from('organization_join_requests').insert({
        organization_id: orgId,
        message: null,
      });
      setRequestLoadingId(null);
      if (error) {
        setSearchError(error.message);
        return;
      }
      await Promise.all([onRefreshJoinRequests(), onRefreshOrganization()]);
    },
    [onRefreshJoinRequests, onRefreshOrganization],
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
                  <View key={org.id} style={styles.joinResultCard}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.joinResultName}>{org.name}</Text>
                      {org.description ? (
                        <Text style={styles.joinResultDescription} numberOfLines={2}>
                          {org.description}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[
                        styles.primaryButton,
                        requestLoadingId === org.id && styles.buttonDisabled,
                        { height: 40 },
                      ]}
                      onPress={() => handleRequestJoin(org.id)}
                      disabled={requestLoadingId === org.id}
                    >
                      {requestLoadingId === org.id ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>{t('account.join.requestJoin')}</Text>
                      )}
                    </Pressable>
                  </View>
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
                      <Text style={styles.joinHistoryStatus}>{request.status}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
