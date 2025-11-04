import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { REQUEST_STATUS_LABELS } from '../../constants';
import type { JoinRequest } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type InvitePanelProps = {
  redeemCode: string;
  setRedeemCode: (value: string) => void;
  redeemLoading: boolean;
  redeemMessage: string | null;
  redeemError: string | null;
  onRedeem: () => void;
  joinRequests: JoinRequest[];
  joinRequestsLoading: boolean;
  joinRequestsError: string | null;
  onRefreshRequests: () => void;
  formatDateTime: (value: string | null) => string;
};

export function InvitePanel({
  redeemCode,
  setRedeemCode,
  redeemLoading,
  redeemMessage,
  redeemError,
  onRedeem,
  joinRequests,
  joinRequestsLoading,
  joinRequestsError,
  onRefreshRequests,
  formatDateTime,
}: InvitePanelProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('invite.title')}</Text>
      <Text style={styles.sectionHint}>{t('invite.subtitle')}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('invite.codeLabel')}</Text>
        <TextInput
          style={styles.input}
          value={redeemCode}
          onChangeText={setRedeemCode}
          placeholder={t('invite.codePlaceholder')}
        />
      </View>
      {redeemError ? <Text style={styles.errorText}>{redeemError}</Text> : null}
      {redeemMessage ? <Text style={styles.successText}>{redeemMessage}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
          redeemLoading && styles.buttonDisabled,
        ]}
        onPress={onRedeem}
        disabled={redeemLoading}
      >
        {redeemLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('invite.useButton')}</Text>
        )}
      </Pressable>

      <View style={styles.requestSection}>
        <View style={styles.requestHead}>
          <Text style={styles.requestTitle}>{t('invite.requestsTitle')}</Text>
          <Pressable
            style={({ pressed }) => [styles.requestRefresh, pressed && styles.buttonPressedLight]}
            onPress={onRefreshRequests}
          >
            <Text style={styles.requestRefreshText}>{t('invite.refresh')}</Text>
          </Pressable>
        </View>

        {joinRequestsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#111827" />
            <Text style={styles.loadingText}>{t('invite.loading')}</Text>
          </View>
        ) : joinRequestsError ? (
          <Text style={styles.errorText}>{joinRequestsError}</Text>
        ) : joinRequests.length === 0 ? (
          <Text style={styles.emptyText}>{t('invite.empty')}</Text>
        ) : (
          joinRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Text style={styles.requestOrg}>
                  {request.organizationName ?? t('invite.unknownOrganization')}
                </Text>
                <Text style={styles.requestStatus}>{REQUEST_STATUS_LABELS[request.status]}</Text>
              </View>
              <Text style={styles.requestMeta}>
                {t('invite.submitted', { time: formatDateTime(request.createdAt) })}
              </Text>
              {request.reviewedAt ? (
                <Text style={styles.requestMeta}>
                  {t('invite.reviewed', { time: formatDateTime(request.reviewedAt) })}
                </Text>
              ) : null}
              {request.message ? (
                <Text style={styles.requestNote}>{t('invite.note', { message: request.message })}</Text>
              ) : null}
              {request.responseNote ? (
                <Text style={styles.requestNote}>
                  {t('invite.response', { message: request.responseNote })}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
