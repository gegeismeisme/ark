import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { OrgJoinApproval } from './useOrgJoinApprovals';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type ManageJoinRequestsSheetProps = {
  visible: boolean;
  approvals: OrgJoinApproval[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onApprove: (request: OrgJoinApproval) => void;
  onReject: (request: OrgJoinApproval) => void;
  processingId: string | null;
  formatDateTime: (value: string | null) => string;
};

export function ManageJoinRequestsSheet({
  visible,
  approvals,
  loading,
  error,
  onClose,
  onRefresh,
  onApprove,
  onReject,
  processingId,
  formatDateTime,
}: ManageJoinRequestsSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.orgCreateOverlay}>
        <View style={styles.joinManageSheet}>
          <View style={styles.joinManageHeader}>
            <View style={styles.joinManageHeaderText}>
              <Text style={styles.joinManageTitle}>{t('account.join.manageTitle')}</Text>
              <Text style={styles.joinManageSubtitle}>{t('account.join.manageSubtitle')}</Text>
            </View>
            <Pressable style={styles.orgCreateClose} onPress={onClose}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>
          <Pressable style={styles.joinManageRefresh} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={16} color="#0f172a" />
            <Text style={styles.joinManageRefreshText}>{t('account.join.refresh')}</Text>
          </Pressable>
          {loading ? (
            <View style={styles.joinHistoryEmpty}>
              <ActivityIndicator color="#0f172a" />
              <Text style={styles.joinHistoryEmptyText}>{t('account.join.loading')}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : approvals.length === 0 ? (
            <Text style={styles.joinHistoryEmptyText}>{t('account.join.manageEmpty')}</Text>
          ) : (
            <View style={styles.joinManageList}>
              {approvals.map((request) => {
                const isProcessing = processingId === request.id;
                return (
                  <View key={request.id} style={styles.joinManageItem}>
                    <View style={styles.joinManageInfo}>
                      <Text style={styles.joinManageName}>{request.fullName ?? request.email ?? '—'}</Text>
                      <Text style={styles.joinManageMeta}>
                        {t('account.join.submitted', { time: formatDateTime(request.createdAt) })}
                      </Text>
                      <Text style={styles.joinManageMessage}>
                        {request.message ?? t('account.organization.noNote')}
                      </Text>
                    </View>
                    <View style={styles.joinManageActions}>
                      <Pressable
                        style={[styles.secondaryButton, styles.joinManageApprove, isProcessing && styles.buttonDisabled]}
                        onPress={() => onApprove(request)}
                        disabled={isProcessing}
                      >
                        <Text style={styles.secondaryButtonText}>{t('account.join.approve')}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.secondaryButton, styles.joinManageReject, isProcessing && styles.buttonDisabled]}
                        onPress={() => onReject(request)}
                        disabled={isProcessing}
                      >
                        <Text style={styles.secondaryButtonText}>{t('account.join.reject')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
