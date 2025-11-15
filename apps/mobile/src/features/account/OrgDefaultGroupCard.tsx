import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type OrgDefaultGroupCardProps = {
  memberCountLabel: string;
  onManageMembers: () => void;
  onShowRemovalRules: () => void;
};

export function OrgDefaultGroupCard({ memberCountLabel, onManageMembers, onShowRemovalRules }: OrgDefaultGroupCardProps) {
  return (
    <View style={[styles.orgSettingsCard, styles.orgSettingsCardMint]}>
      <Text style={styles.orgSettingsCardTitle}>{t('account.organization.defaultGroupHeading')}</Text>
      <Text style={styles.orgSettingsBody}>{t('account.organization.defaultGroupBody')}</Text>
      <Text style={styles.orgSettingsDefaultCount}>{memberCountLabel}</Text>
      <View style={styles.orgSettingsActions}>
        <Pressable style={styles.secondaryButton} onPress={onManageMembers}>
          <Ionicons name="people-outline" size={16} color="#0f172a" />
          <Text style={styles.secondaryButtonText}>{t('account.organization.manageMembers')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onShowRemovalRules}>
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" />
          <Text style={styles.secondaryButtonText}>{t('account.organization.removalRules')}</Text>
        </Pressable>
      </View>
      <Text style={styles.orgSettingsFootnote}>{t('account.organization.defaultGroupNote')}</Text>
    </View>
  );
}
