import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { JoinRequest } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { REQUEST_STATUS_LABELS } from '../../constants';

type JoinRequestHistoryProps = {
  joinRequests: JoinRequest[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  formatDateTime: (value: string | null) => string;
};

export function JoinRequestHistory({
  joinRequests,
  loading,
  error,
  onRefresh,
  formatDateTime,
}: JoinRequestHistoryProps) {
  return (
    <View style={styles.joinHistoryCard}>
      <View style={styles.joinHistoryHeader}>
        <Text style={styles.joinHistoryTitle}>{t('account.join.requestHistory')}</Text>
        <Pressable style={styles.joinHistoryRefresh} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={16} color="#0f172a" />
          <Text style={styles.joinHistoryRefreshText}>{t('account.join.refresh')}</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.joinHistoryEmpty}>
          <ActivityIndicator color="#0f172a" />
          <Text style={styles.joinHistoryEmptyText}>{t('account.join.loading')}</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : joinRequests.length === 0 ? (
        <Text style={styles.joinHistoryEmptyText}>{t('account.join.historyEmpty')}</Text>
      ) : (
        joinRequests.map((request) => (
          <View key={request.id} style={styles.joinHistoryItem}>
            <View style={styles.joinHistoryInfo}>
              <Text style={styles.joinHistoryOrg}>
                {request.organizationName ?? t('account.join.unknownOrganization')}
              </Text>
              <Text style={styles.joinHistoryStatus}>{REQUEST_STATUS_LABELS[request.status]}</Text>
            </View>
            <Text style={styles.joinHistoryMeta}>
              {t('account.join.submitted', { time: formatDateTime(request.createdAt) })}
            </Text>
            {request.reviewedAt ? (
              <Text style={styles.joinHistoryMeta}>
                {t('account.join.reviewed', { time: formatDateTime(request.reviewedAt) })}
              </Text>
            ) : null}
            {request.message ? (
              <Text style={styles.joinHistoryNote}>{request.message}</Text>
            ) : null}
            {request.responseNote ? (
              <Text style={styles.joinHistoryNote}>{request.responseNote}</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
