import { Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '../../../../i18n';
import { styles } from '../../../../styles/appStyles';
import type { OrganizationMember } from '../../../organizations/useOrganizationMembers';
import { AssigneeSelector } from '../AssigneeSelector';

type PublishAssigneesStepProps = {
  availableOrgs: Array<{ id: string; name: string }>;
  effectiveOrgId: string | null;
  onSelectOrg: (orgId: string) => void;
  organizationName: string | null;
  onOpenFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  assigneeIds: string[];
  members: OrganizationMember[];
  filteredMembers: OrganizationMember[];
  membershipToUserId: Map<string, string>;
  onAppendMembers: (membershipIds: string[]) => void;
  onClearAssignees: () => void;
  onToggleAssignee: (userId: string) => void;
  membersLoading: boolean;
  membersError: string | null;
  refreshMembers: () => Promise<void>;
  hasFilterMatches: boolean;
  tagFiltersLoading: boolean;
};

export function PublishAssigneesStep({
  availableOrgs,
  effectiveOrgId,
  onSelectOrg,
  organizationName,
  onOpenFilters,
  hasActiveFilters,
  activeFilterCount,
  assigneeIds,
  members,
  filteredMembers,
  membershipToUserId,
  onAppendMembers,
  onClearAssignees,
  onToggleAssignee,
  membersLoading,
  membersError,
  refreshMembers,
  hasFilterMatches,
  tagFiltersLoading,
}: PublishAssigneesStepProps) {
  const totalMembers = members.length;
  const filteredCount = filteredMembers.length;
  const filteredUserIds = filteredMembers
    .map((member) => membershipToUserId.get(member.id))
    .filter((id): id is string => Boolean(id));
  const allFilteredSelected =
    filteredUserIds.length > 0 && filteredUserIds.every((userId) => assigneeIds.includes(userId));

  return (
    <View style={styles.publishStepCard}>
      <View style={styles.publishOrgSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableOrgs.map((orgItem) => {
            const active = orgItem.id === effectiveOrgId;
            return (
              <Pressable
                key={orgItem.id}
                style={[styles.publishOrgPill, active && styles.publishOrgPillActive]}
                onPress={() => onSelectOrg(orgItem.id)}
              >
                <Text style={[styles.publishOrgPillText, active && styles.publishOrgPillTextActive]} numberOfLines={1}>
                  {orgItem.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.publishFilterHeader}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.filters.title')}</Text>
          <Text style={styles.helperText}>{t('app.publish.filters.subtitle')}</Text>
        </View>
        <Pressable style={styles.publishFilterButton} onPress={onOpenFilters}>
          <Text style={styles.publishFilterButtonText}>
            {hasActiveFilters ? `${t('app.publish.filters.open')} (${activeFilterCount})` : t('app.publish.filters.open')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.publishFilterSummary}>
        <Text style={styles.publishFilterSummaryLabel}>
          {t('app.publish.assignees.count', { selected: assigneeIds.length, total: totalMembers })}
          {hasActiveFilters ? ` · ${t('app.publish.filters.summaryIdle', { total: filteredCount })}` : ''}
        </Text>
        <Pressable
          onPress={() => {
            const membershipIds = filteredMembers.map((member) => member.id);
            if (membershipIds.length === 0) return;
            if (allFilteredSelected) {
              onClearAssignees();
            } else {
              onAppendMembers(membershipIds);
            }
          }}
          style={[styles.publishFilterButton, filteredCount === 0 && styles.buttonDisabled]}
          disabled={filteredCount === 0}
        >
          <Text style={styles.publishFilterButtonText}>
            {filteredCount === 0 ? t('common.clear') : allFilteredSelected ? t('common.clear') : t('app.publish.assignees.selectAll')}
          </Text>
        </Pressable>
      </View>
      <AssigneeSelector
        organizationName={organizationName}
        members={filteredMembers}
        loading={membersLoading}
        error={membersError}
        selectedIds={assigneeIds}
        onToggle={onToggleAssignee}
        onRefresh={refreshMembers}
      />
      {hasActiveFilters && !tagFiltersLoading && !hasFilterMatches ? (
        <Text style={styles.helperText}>{t('app.publish.assignees.empty')}</Text>
      ) : null}
    </View>
  );
}
