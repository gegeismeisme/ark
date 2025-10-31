import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { REQUEST_STATUS_LABELS } from '../../constants';
import type { JoinRequest } from '../../types';
import { styles } from '../../styles/appStyles';

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
      <Text style={styles.sectionTitle}>邀请码与加入申请</Text>
      <Text style={styles.sectionHint}>输入邀请码加入组织，同时跟进我的申请进度。</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>邀请码</Text>
        <TextInput
          style={styles.input}
          value={redeemCode}
          onChangeText={setRedeemCode}
          placeholder="粘贴或输入邀请码"
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
          <Text style={styles.primaryButtonText}>使用邀请码</Text>
        )}
      </Pressable>

      <View style={styles.requestSection}>
        <View style={styles.requestHead}>
          <Text style={styles.requestTitle}>我的加入申请</Text>
          <Pressable
            style={({ pressed }) => [styles.requestRefresh, pressed && styles.buttonPressedLight]}
            onPress={onRefreshRequests}
          >
            <Text style={styles.requestRefreshText}>刷新</Text>
          </Pressable>
        </View>

        {joinRequestsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#111827" />
            <Text style={styles.loadingText}>正在加载申请记录…</Text>
          </View>
        ) : joinRequestsError ? (
          <Text style={styles.errorText}>{joinRequestsError}</Text>
        ) : joinRequests.length === 0 ? (
          <Text style={styles.emptyText}>暂无加入申请记录。</Text>
        ) : (
          joinRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Text style={styles.requestOrg}>{request.organizationName ?? '未知组织'}</Text>
                <Text style={styles.requestStatus}>{REQUEST_STATUS_LABELS[request.status]}</Text>
              </View>
              <Text style={styles.requestMeta}>
                提交时间：{formatDateTime(request.createdAt)}
              </Text>
              {request.reviewedAt ? (
                <Text style={styles.requestMeta}>
                  处理时间：{formatDateTime(request.reviewedAt)}
                </Text>
              ) : null}
              {request.message ? (
                <Text style={styles.requestNote}>说明：{request.message}</Text>
              ) : null}
              {request.responseNote ? (
                <Text style={styles.requestNote}>管理员备注：{request.responseNote}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
