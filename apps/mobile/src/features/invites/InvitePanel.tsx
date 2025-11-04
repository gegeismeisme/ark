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
      <Text style={styles.sectionTitle}>Join an organization</Text>
      <Text style={styles.sectionHint}>
        Enter the invite code to join your workspace and keep track of pending requests.
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Invite code</Text>
        <TextInput
          style={styles.input}
          value={redeemCode}
          onChangeText={setRedeemCode}
          placeholder="Paste the invite code"
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
          <Text style={styles.primaryButtonText}>Use invite code</Text>
        )}
      </Pressable>

      <View style={styles.requestSection}>
        <View style={styles.requestHead}>
          <Text style={styles.requestTitle}>My join requests</Text>
          <Pressable
            style={({ pressed }) => [styles.requestRefresh, pressed && styles.buttonPressedLight]}
            onPress={onRefreshRequests}
          >
            <Text style={styles.requestRefreshText}>Refresh</Text>
          </Pressable>
        </View>

        {joinRequestsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#111827" />
            <Text style={styles.loadingText}>Loading requests…</Text>
          </View>
        ) : joinRequestsError ? (
          <Text style={styles.errorText}>{joinRequestsError}</Text>
        ) : joinRequests.length === 0 ? (
          <Text style={styles.emptyText}>No join requests yet.</Text>
        ) : (
          joinRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Text style={styles.requestOrg}>{request.organizationName ?? 'Unknown organization'}</Text>
                <Text style={styles.requestStatus}>{REQUEST_STATUS_LABELS[request.status]}</Text>
              </View>
              <Text style={styles.requestMeta}>
                Submitted: {formatDateTime(request.createdAt)}
              </Text>
              {request.reviewedAt ? (
                <Text style={styles.requestMeta}>
                  Reviewed: {formatDateTime(request.reviewedAt)}
                </Text>
              ) : null}
              {request.message ? (
                <Text style={styles.requestNote}>Note: {request.message}</Text>
              ) : null}
              {request.responseNote ? (
                <Text style={styles.requestNote}>Admin response: {request.responseNote}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
