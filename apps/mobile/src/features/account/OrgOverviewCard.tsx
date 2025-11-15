import { View, Text } from 'react-native';

import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type OrgOverviewCardProps = {
  organization: ActiveOrganization | null;
  memberLabel: string;
  groupLabel: string;
  planLabel: string;
  planDetail: string;
};

export function OrgOverviewCard({ organization, memberLabel, groupLabel, planLabel, planDetail }: OrgOverviewCardProps) {
  if (!organization) return null;

  return (
    <View style={[styles.orgSettingsCard, styles.orgSettingsCardSky]}>
      <Text style={styles.orgSettingsCardTitle}>{t('account.organization.overviewHeading')}</Text>
      <View style={styles.orgSettingsBadgeRow}>
        <View
          style={[
            styles.orgSettingsBadge,
            organization.visibility === 'private' ? styles.orgSettingsBadgePrivate : styles.orgSettingsBadgePublic,
          ]}
        >
          <Text style={styles.orgSettingsBadgeText}>
            {t(
              organization.visibility === 'private'
                ? 'account.organization.visibilityPrivate'
                : 'account.organization.visibilityPublic',
            )}
          </Text>
        </View>
        {organization.slug ? (
          <View style={[styles.orgSettingsBadge, styles.orgSettingsBadgeNeutral]}>
            <Text style={styles.orgSettingsBadgeText}>{t('account.organization.slugLabel', { slug: organization.slug })}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.orgSettingsPlanLabel}>{planLabel}</Text>
      <Text style={styles.orgSettingsPlanDetail}>{planDetail}</Text>
      <View style={styles.orgSettingsStatRow}>
        <Text style={styles.orgSettingsStatLabel}>{memberLabel}</Text>
        <Text style={styles.orgSettingsStatLabel}>{groupLabel}</Text>
      </View>
      <Text style={styles.orgSettingsDescription}>
        {organization.description?.trim() ? organization.description : t('account.organization.noDescription')}
      </Text>
    </View>
  );
}
