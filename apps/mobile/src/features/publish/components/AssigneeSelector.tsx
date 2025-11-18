import { Pressable, Text, View } from 'react-native';

import { t } from '../../../i18n';
import { styles } from '../../../styles/appStyles';
import type { OrganizationMember } from '../../organizations/useOrganizationMembers';

type AssigneeSelectorProps = {
  organizationName: string | null;
  members: OrganizationMember[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  onToggle: (userId: string) => void;
  onRefresh: () => void;
};

export function AssigneeSelector({
  organizationName,
  members,
  loading,
  error,
  selectedIds,
  onToggle,
  onRefresh,
}: AssigneeSelectorProps) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{t('app.publish.assignees.title')}</Text>
      <Text style={styles.helperText}>
        {organizationName
          ? t('app.publish.assignees.subtitle', { name: organizationName })
          : t('app.publish.assignees.subtitleFallback')}
      </Text>
      {error ? (
        <View style={styles.reminderActionRow}>
          <Text style={styles.errorText}>
            {t('app.publish.assignees.error', { error })}
          </Text>
          <Pressable
            style={[styles.reminderActionButton, styles.chip]}
            onPress={() => void onRefresh()}
          >
            <Text style={styles.reminderActionButtonText}>
              {t('app.publish.assignees.retry')}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <Text style={styles.helperText}>{t('app.publish.assignees.loading')}</Text>
      ) : members.length === 0 ? (
        <Text style={styles.helperText}>{t('app.publish.assignees.empty')}</Text>
      ) : (
        <View style={styles.chipRow}>
          {members.map((member) => {
            const active = selectedIds.includes(member.userId);
            return (
              <Pressable
                key={member.userId}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onToggle(member.userId)}
              >
                <Text
                  style={[styles.chipLabel, active && styles.chipLabelActive]}
                  numberOfLines={1}
                >
                  {member.fullName ?? member.userId.slice(0, 6)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Text style={styles.helperText}>
        {t('app.publish.assignees.count', { count: selectedIds.length })}
      </Text>
    </View>
  );
}
