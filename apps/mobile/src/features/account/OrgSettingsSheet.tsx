import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import type { OrganizationGroup } from '../organizations/useOrganizationGroups';
import { OrgOverviewCard } from './OrgOverviewCard';
import { OrgDefaultGroupCard } from './OrgDefaultGroupCard';
import { OrgGroupList } from './OrgGroupList';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type OrgSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  organization: ActiveOrganization | null;
  memberUsageLabel: string;
  groupUsageLabel: string;
  planLabel: string;
  planDetail: string;
  defaultGroupMemberLabel: string;
  groups: OrganizationGroup[];
  groupsLoading: boolean;
  groupsError: string | null;
  groupLimitLabel: string;
  groupLimitValue: number | null;
  onRefreshGroups: () => void;
  onManageMembers: () => void;
  onCreateGroup: () => void;
};

export function OrgSettingsSheet({
  visible,
  onClose,
  organization,
  memberUsageLabel,
  groupUsageLabel,
  planLabel,
  planDetail,
  defaultGroupMemberLabel,
  groups,
  groupsLoading,
  groupsError,
  groupLimitLabel,
  groupLimitValue,
  onRefreshGroups,
  onManageMembers,
  onCreateGroup,
}: OrgSettingsSheetProps) {
  const limitReached = groupLimitValue !== null && groups.length >= groupLimitValue;
  const additionalGroups = groups.filter((group) => !group.isDefault);

  const handleRemovalRules = () =>
    Alert.alert(t('account.organization.removalRules'), t('account.organization.removalHint'));

  const handleGroupAction = () => {
    Alert.alert(t('app.alert.noticeTitle'), t('account.organization.groupManagePlaceholder'));
  };

  const handlePlaceholder = () => {
    Alert.alert(t('app.alert.noticeTitle'), t('account.organization.settingsPlaceholderText'));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.orgCreateOverlay}>
        <View style={styles.orgSettingsSheet}>
          <View style={styles.orgSettingsHeader}>
            <View style={styles.orgSettingsHeaderText}>
              <Text style={styles.orgSettingsTitle}>{t('account.organization.settingsTitle')}</Text>
              <Text style={styles.orgSettingsSubtitle}>{t('account.organization.settingsSubtitle')}</Text>
            </View>
            <Pressable style={styles.orgSettingsClose} onPress={onClose}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>
          <ScrollView style={styles.orgSettingsScroll} contentContainerStyle={styles.orgSettingsScrollContent}>
            {organization ? (
              <OrgOverviewCard
                organization={organization}
                memberLabel={memberUsageLabel}
                groupLabel={groupUsageLabel}
                planLabel={planLabel}
                planDetail={planDetail}
              />
            ) : (
              <View style={[styles.orgSettingsCard, styles.orgSettingsCardSky]}>
                <Text style={styles.orgSettingsCardTitle}>{t('account.organization.overviewHeading')}</Text>
                <Text style={styles.orgSettingsBody}>{t('account.organization.hubEmpty')}</Text>
              </View>
            )}
            <OrgDefaultGroupCard
              memberCountLabel={defaultGroupMemberLabel}
              onManageMembers={onManageMembers}
              onShowRemovalRules={handleRemovalRules}
            />
            <OrgGroupList
              groups={additionalGroups}
              loading={groupsLoading}
              errorText={groupsError}
              usageLabel={groupUsageLabel}
              limitReached={limitReached}
              limitValueLabel={groupLimitLabel}
              onCreateGroup={onCreateGroup}
              onRefresh={onRefreshGroups}
              onPlaceholderAction={handleGroupAction}
            />
            <View style={[styles.orgSettingsCard, styles.orgSettingsCardNeutral]}>
              <Text style={styles.orgSettingsCardTitle}>{t('account.organization.settingsPlaceholderHeading')}</Text>
              <Text style={styles.orgSettingsBody}>{t('account.organization.settingsPlaceholderText')}</Text>
              <Text style={styles.orgSettingsFootnote}>{t('account.organization.groupManagePlaceholder')}</Text>
            </View>
          </ScrollView>
          <View style={styles.orgSettingsFooter}>
            <Text style={styles.orgSettingsFooterHint}>{t('account.organization.settingsFooterHint')}</Text>
            <Text style={styles.orgSettingsFooterLink} onPress={handlePlaceholder}>
              {t('account.organization.settingsFooterCta')}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
