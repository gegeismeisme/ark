import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Session } from '@supabase/supabase-js';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import type { OrganizationMember } from '../organizations/useOrganizationMembers';
import type { UserMembership } from '../organizations/useUserMemberships';
import { supabase } from '../../lib/supabaseClient';
import { useTagManagement } from '../tags/useTagManagement';
import type { TagOption } from '../tags/useTagManagement';
import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';

type MembershipSectionProps = {
  session: Session;
  organization: ActiveOrganization | null;
  members: OrganizationMember[];
  memberships: UserMembership[];
  membershipsLoading: boolean;
  membershipsError: string | null;
  onRefreshMemberships: () => Promise<void>;
  onRefreshMembers: () => Promise<void>;
};

export function MembershipSection({
  session,
  organization,
  members,
  memberships,
  membershipsLoading,
  membershipsError,
  onRefreshMemberships,
  onRefreshMembers,
}: MembershipSectionProps) {
  const [membershipEditor, setMembershipEditor] = useState<{ id: string; organizationName: string | null } | null>(null);
  const [membershipNameDraft, setMembershipNameDraft] = useState('');
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [tagSettingsTarget, setTagSettingsTarget] = useState<UserMembership | null>(null);
  const [tagStatusByMembership, setTagStatusByMembership] = useState<Record<string, { missing: number }>>({});
  const [tagSelectionAssignment, setTagSelectionAssignment] = useState<{
    organizationId: string;
    data: ReturnType<typeof useTagManagement>['assignments'][number];
  } | null>(null);
  const [tagSelectionDraft, setTagSelectionDraft] = useState<Set<string>>(new Set());
  const [tagSelectionSaving, setTagSelectionSaving] = useState(false);
  const [tagSelectionError, setTagSelectionError] = useState<string | null>(null);

  const membershipTagOrgId = tagSettingsTarget?.organizationId ?? null;
  const membershipTagIsAdmin = tagSettingsTarget ? ['owner', 'admin'].includes(tagSettingsTarget.role ?? '') : false;

  const {
    assignments: tagSettingsAssignments,
    loading: tagSettingsLoading,
    error: tagSettingsError,
    refresh: refreshMemberTagData,
  } = useTagManagement({
    organizationId: membershipTagOrgId,
    userId: session.user.id,
    members,
    isOrgAdmin: membershipTagIsAdmin,
  });

  const tagSettingsRequired = useMemo(
    () => tagSettingsAssignments.filter((assignment) => assignment.required),
    [tagSettingsAssignments],
  );
  const tagSettingsOptional = useMemo(
    () => tagSettingsAssignments.filter((assignment) => !assignment.required),
    [tagSettingsAssignments],
  );

  useEffect(() => {
    if (!tagSettingsTarget) return;
    const missing = tagSettingsAssignments.filter((assignment) => assignment.required && assignment.hasMissingRequired)
      .length;
    setTagStatusByMembership((prev) => ({
      ...prev,
      [tagSettingsTarget.id]: { missing },
    }));
  }, [tagSettingsAssignments, tagSettingsTarget]);

  useEffect(() => {
    if (!tagSettingsTarget) {
      setTagSelectionAssignment(null);
    }
  }, [tagSettingsTarget]);

  useEffect(() => {
    if (!tagSelectionAssignment) {
      setTagSelectionDraft(new Set());
      setTagSelectionError(null);
      setTagSelectionSaving(false);
      return;
    }
    setTagSelectionDraft(new Set(tagSelectionAssignment.data.selectedTagIds));
    setTagSelectionError(null);
    setTagSelectionSaving(false);
  }, [tagSelectionAssignment]);

  const handleOpenMembershipEditor = (membership: UserMembership) => {
    setMembershipEditor({
      id: membership.id,
      organizationName: membership.organizationName ?? null,
    });
    setMembershipNameDraft(membership.displayName ?? '');
  };

  const handleCloseMembershipEditor = () => {
    if (membershipSaving) return;
    setMembershipEditor(null);
    setMembershipNameDraft('');
  };

  const handleSaveMembershipName = async () => {
    if (!membershipEditor) return;
    const trimmed = membershipNameDraft.trim();
    setMembershipSaving(true);
    const { error } = await supabase
      .from('organization_members')
      .update({ display_name: trimmed || null })
      .eq('id', membershipEditor.id);
    if (error) {
      setMembershipSaving(false);
      Alert.alert(t('app.alert.noticeTitle'), error.message ?? t('account.join.manageError'));
      return;
    }
    setMembershipSaving(false);
    setMembershipEditor(null);
    setMembershipNameDraft('');
    await onRefreshMemberships();
  };

  const handleMembershipTags = (membership: UserMembership) => {
    setTagSettingsTarget(membership);
  };

  const handleMembershipInfo = () => {
    Alert.alert(t('app.alert.noticeTitle'), t('account.memberships.infoPlaceholder'));
  };

  const handleCloseMembershipTags = () => {
    setTagSettingsTarget(null);
  };

  const handleOpenTagSelection = (assignment: ReturnType<typeof useTagManagement>['assignments'][number]) => {
    if (!tagSettingsTarget) return;
    setTagSelectionAssignment({ organizationId: tagSettingsTarget.organizationId, data: assignment });
  };

  const handleCloseTagSelection = () => {
    setTagSelectionAssignment(null);
  };

  const handleSaveTagSelection = async () => {
    if (!tagSelectionAssignment || !tagSettingsTarget) return;
    const nextTagIds = Array.from(tagSelectionDraft);
    setTagSelectionSaving(true);
    setTagSelectionError(null);
    try {
      const categoryTagIds = tagSelectionAssignment.data.tagOptions.map((tag) => tag.id);
      if (categoryTagIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('member_tags')
          .delete()
          .eq('organization_id', tagSelectionAssignment.organizationId)
          .eq('member_id', tagSettingsTarget.id)
          .in('tag_id', categoryTagIds);
        if (deleteError) {
          throw deleteError;
        }
      }
      if (nextTagIds.length > 0) {
        const rows = nextTagIds.map((tagId) => ({
          organization_id: tagSelectionAssignment.organizationId,
          member_id: tagSettingsTarget.id,
          tag_id: tagId,
        }));
        const { error: insertError } = await supabase.from('member_tags').insert(rows);
        if (insertError) {
          throw insertError;
        }
      }
      await refreshMemberTagData();
      await onRefreshMemberships();
      setTagSelectionAssignment(null);
    } catch (error) {
      setTagSelectionError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : t('account.tags.sheet.genericError'),
      );
    } finally {
      setTagSelectionSaving(false);
    }
  };

  const renderMembershipCard = (membership: UserMembership) => {
    const roleLabel =
      membership.role === 'owner'
        ? t('account.memberships.roleOwner')
        : membership.role === 'admin'
          ? t('account.memberships.roleAdmin')
          : t('account.memberships.roleMember');
    const missing = tagStatusByMembership[membership.id]?.missing ?? 0;
    const cardStyle =
      membership.role === 'owner'
        ? styles.membershipCardOwner
        : membership.role === 'admin'
          ? styles.membershipCardAdmin
          : styles.membershipCardMember;

    return (
      <View key={membership.id} style={[styles.membershipCard, cardStyle]}>
        <View style={styles.membershipInfo}>
          <Text style={styles.membershipName}>{membership.organizationName ?? t('account.memberships.unknownOrg')}</Text>
          <Text style={styles.membershipRole}>{roleLabel}</Text>
          {membership.displayName ? (
            <Text style={styles.membershipDisplayName}>
              {t('account.memberships.displayName', { name: membership.displayName })}
            </Text>
          ) : null}
        </View>
        <View style={styles.membershipActions}>
          <Pressable style={styles.membershipActionButton} onPress={() => handleOpenMembershipEditor(membership)}>
            <Ionicons name="create-outline" size={18} color="#0f172a" />
          </Pressable>
          <Pressable
            style={[
              styles.membershipActionButton,
              missing > 0 ? styles.membershipActionButtonWarning : styles.membershipActionButtonReady,
            ]}
            onPress={() => handleMembershipTags(membership)}
          >
            <Ionicons name="pricetag-outline" size={18} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.membershipActionButton} onPress={handleMembershipInfo}>
            <Ionicons name="information-circle-outline" size={18} color="#0f172a" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <>
      {membershipsLoading ? (
        <ActivityIndicator color="#0f172a" style={styles.membershipLoading} />
      ) : membershipsError ? (
        <Text style={styles.errorText}>{membershipsError}</Text>
      ) : memberships.length > 0 ? (
        <View style={styles.membershipSection}>
          <Text style={styles.membershipSectionTitle}>{t('account.memberships.sectionTitle')}</Text>
          <Text style={styles.membershipSectionHint}>{t('account.memberships.sectionHint')}</Text>
          <View style={styles.membershipList}>{memberships.map(renderMembershipCard)}</View>
        </View>
      ) : null}

      <Modal visible={Boolean(membershipEditor)} animationType="slide" transparent onRequestClose={handleCloseMembershipEditor}>
        <View style={styles.orgCreateOverlay}>
          <View style={styles.orgCreateSheet}>
            <View style={styles.orgCreateHeader}>
              <Text style={styles.orgCreateTitle}>{t('account.memberships.editTitle')}</Text>
              <Pressable style={styles.orgCreateClose} onPress={handleCloseMembershipEditor}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
            <Text style={styles.orgImmutableHint}>
              {membershipEditor?.organizationName ?? t('account.memberships.unknownOrg')}
            </Text>
            <TextInput
              style={styles.accountInput}
              value={membershipNameDraft}
              onChangeText={setMembershipNameDraft}
              placeholder={t('account.memberships.editPlaceholder')}
            />
            <Pressable
              style={[styles.primaryButton, membershipSaving && styles.buttonDisabled]}
              onPress={handleSaveMembershipName}
              disabled={membershipSaving}
            >
              {membershipSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>{t('account.actions.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(tagSettingsTarget)} animationType="slide" onRequestClose={handleCloseMembershipTags}>
        <SafeAreaView style={styles.tagSettingsContainer}>
          <View style={styles.tagSettingsHeader}>
            <Pressable style={styles.tagSettingsBack} onPress={handleCloseMembershipTags}>
              <Ionicons name="chevron-back" size={20} color="#0f172a" />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.tagSettingsTitle}>
                {tagSettingsTarget?.organizationName ?? t('account.memberships.unknownOrg')}
              </Text>
              <Text style={styles.tagSettingsSubtitle}>{t('account.memberships.tagSettingsSubtitle')}</Text>
            </View>
            <Pressable style={styles.tagSettingsAddButton} onPress={() => Alert.alert(t('app.alert.noticeTitle'), t('account.tags.comingSoon'))}>
              <Ionicons name="add" size={20} color="#0f172a" />
            </Pressable>
          </View>
          {tagSettingsLoading ? (
            <View style={styles.tagStatusRow}>
              <ActivityIndicator color="#0f172a" />
              <Text style={styles.tagStatusText}>{t('account.tags.loading')}</Text>
            </View>
          ) : tagSettingsError ? (
            <Text style={styles.tagErrorText}>{tagSettingsError}</Text>
          ) : (
            <ScrollView style={styles.flex} contentContainerStyle={styles.tagSettingsContent}>
              <View style={styles.tagSettingsSection}>
                <Text style={styles.tagSettingsSectionTitle}>{t('account.memberships.tagRequiredHeading')}</Text>
                {tagSettingsRequired.length === 0 ? (
                  <Text style={styles.tagEmptyText}>{t('account.memberships.tagEmpty')}</Text>
                ) : (
                  tagSettingsRequired.map((assignment) => (
                    <Pressable
                      key={assignment.categoryId}
                      style={[
                        styles.tagSettingsRow,
                        styles.tagSettingsRowRequired,
                        assignment.hasMissingRequired && styles.tagSettingsRowWarning,
                      ]}
                      onPress={() => handleOpenTagSelection(assignment)}
                    >
                      <View style={styles.flex}>
                        <Text style={styles.tagSettingsRowName}>{assignment.categoryName}</Text>
                        <Text style={styles.tagSettingsRowStatus}>
                          {assignment.hasMissingRequired
                            ? t('account.memberships.tagRowMissing')
                            : t('account.memberships.tagRowCompleted')}
                        </Text>
                      </View>
                      <Ionicons
                        name={assignment.hasMissingRequired ? 'alert-circle' : 'chevron-forward'}
                        size={18}
                        color={assignment.hasMissingRequired ? '#b45309' : '#475569'}
                      />
                    </Pressable>
                  ))
                )}
              </View>
              <View style={styles.tagSettingsSection}>
                <Text style={styles.tagSettingsSectionTitle}>{t('account.memberships.tagOptionalHeading')}</Text>
                {tagSettingsOptional.length === 0 ? (
                  <Text style={styles.tagEmptyText}>{t('account.memberships.tagEmpty')}</Text>
                ) : (
                  tagSettingsOptional.map((assignment) => (
                    <Pressable
                      key={assignment.categoryId}
                      style={[styles.tagSettingsRow, styles.tagSettingsRowOptional]}
                      onPress={() => handleOpenTagSelection(assignment)}
                    >
                      <View style={styles.flex}>
                        <Text style={styles.tagSettingsRowName}>{assignment.categoryName}</Text>
                        <Text style={styles.tagSettingsRowStatus}>
                          {assignment.selectedTagIds.length > 0
                            ? t('account.memberships.tagRowCompleted')
                            : t('account.memberships.tagOptionalHint')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#475569" />
                    </Pressable>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={Boolean(tagSelectionAssignment)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseTagSelection}
      >
        <View style={styles.orgCreateOverlay}>
          <View style={styles.tagSelectionSheet}>
            <View style={styles.tagSelectionHeader}>
              <Text style={styles.tagSelectionTitle}>
                {tagSelectionAssignment?.data.categoryName ?? t('account.memberships.tagSelectionTitle')}
              </Text>
              <Pressable style={styles.orgCreateClose} onPress={handleCloseTagSelection}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
            {tagSelectionAssignment ? (
              <>
                <View style={styles.tagSelectionList}>
                  {tagSelectionAssignment.data.tagOptions.length === 0 ? (
                    <Text style={styles.tagEmptyText}>{t('account.memberships.tagSelectionEmpty')}</Text>
                  ) : (
                    tagSelectionAssignment.data.tagOptions.map((option) => {
                      const isSelected = tagSelectionDraft.has(option.id);
                      const isSingle = tagSelectionAssignment.data.selectionType === 'single';
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.tagSelectionOption, isSelected && styles.tagSelectionOptionActive]}
                          onPress={() =>
                            setTagSelectionDraft((prev) => {
                              const next = new Set(prev);
                              if (isSingle) {
                                next.clear();
                                if (!prev.has(option.id)) {
                                  next.add(option.id);
                                }
                              } else if (next.has(option.id)) {
                                next.delete(option.id);
                              } else {
                                next.add(option.id);
                              }
                              return next;
                            })
                          }
                        >
                          <View style={styles.tagSelectionOptionIcon}>
                            {isSingle ? (
                              <Ionicons
                                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                size={18}
                                color={isSelected ? '#0f172a' : '#94a3b8'}
                              />
                            ) : (
                              <Ionicons
                                name={isSelected ? 'checkbox-outline' : 'square-outline'}
                                size={18}
                                color={isSelected ? '#0f172a' : '#94a3b8'}
                              />
                            )}
                          </View>
                          <Text style={styles.tagSelectionOptionLabel}>{option.name}</Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
                {tagSelectionError ? <Text style={styles.tagSheetError}>{tagSelectionError}</Text> : null}
                <Pressable
                  style={[styles.primaryButton, tagSelectionSaving && styles.buttonDisabled]}
                  onPress={handleSaveTagSelection}
                  disabled={tagSelectionSaving}
                >
                  {tagSelectionSaving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('account.actions.save')}</Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
