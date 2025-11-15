import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { OrganizationGroup } from '../organizations/useOrganizationGroups';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type OrgGroupListProps = {
  groups: OrganizationGroup[];
  loading: boolean;
  usageLabel: string;
  limitReached: boolean;
  limitValueLabel: string;
  errorText?: string | null;
  onCreateGroup: () => void;
  onRefresh: () => void;
  onPlaceholderAction: () => void;
};

export function OrgGroupList({
  groups,
  loading,
  usageLabel,
  limitReached,
  limitValueLabel,
  errorText,
  onCreateGroup,
  onRefresh,
  onPlaceholderAction,
}: OrgGroupListProps) {
  return (
    <View style={[styles.orgSettingsCard, styles.orgSettingsCardPeach]}>
      <View style={styles.orgSettingsHeaderRow}>
        <Text style={styles.orgSettingsCardTitle}>{t('account.organization.groupsHeading')}</Text>
        <Text style={styles.orgSettingsUsage}>{usageLabel}</Text>
      </View>
      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : loading ? (
        <ActivityIndicator color="#0f172a" style={{ marginVertical: 12 }} />
      ) : groups.length === 0 ? (
        <Text style={styles.orgSettingsBody}>{t('account.organization.groupsEmpty')}</Text>
      ) : (
        <View style={styles.orgGroupList}>
          {groups.map((group) => (
            <View key={group.id} style={styles.orgGroupRow}>
              <View style={styles.orgGroupInfo}>
                <Text style={styles.orgGroupName}>{group.name}</Text>
                <Text style={styles.orgGroupMeta}>
                  {t('account.organization.groupMembersLabel', { count: group.memberCount })}
                </Text>
              </View>
              <Pressable style={styles.orgGroupAction} onPress={onPlaceholderAction}>
                <Ionicons name="settings-outline" size={18} color="#0f172a" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.orgSettingsActions}>
        <Pressable
          style={[styles.primaryButton, limitReached && styles.buttonDisabled]}
          onPress={onCreateGroup}
          disabled={limitReached}
        >
          <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
          <Text style={styles.primaryButtonText}>{t('account.organization.createGroup')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={16} color="#0f172a" />
          <Text style={styles.secondaryButtonText}>{t('account.organization.refreshGroups')}</Text>
        </Pressable>
      </View>
      {limitReached ? (
        <Text style={styles.orgSettingsFootnote}>
          {t('account.organization.limitReached', { limit: limitValueLabel })}
        </Text>
      ) : null}
    </View>
  );
}
