import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [tagStatusVersion, setTagStatusVersion] = useState(0);
  const [tagSelectionAssignment, setTagSelectionAssignment] = useState<{
    organizationId: string;
    data: ReturnType<typeof useTagManagement>['assignments'][number];
  } | null>(null);
  const [tagSelectionDraft, setTagSelectionDraft] = useState<Set<string>>(new Set());
  const [tagSelectionSaving, setTagSelectionSaving] = useState(false);
  const [tagSelectionError, setTagSelectionError] = useState<string | null>(null);

  const membershipTagOrgId = tagSettingsTarget?.organizationId ?? null;
  const membershipTagIsAdmin = tagSettingsTarget ? ['owner', 'admin'].includes(tagSettingsTarget.role ?? '') : false;
  const membershipScopedMembers = useMemo(() => {
    if (!tagSettingsTarget) return [];
    const scopedMember: OrganizationMember = {
      id: tagSettingsTarget.id,
      userId: session.user.id,
      fullName: session.user.email ?? session.user.id,
      role: tagSettingsTarget.role ?? null,
    };
    return [scopedMember];
  }, [tagSettingsTarget, session.user.id, session.user.email]);

  const {
    assignments: tagSettingsAssignments,
    loading: tagSettingsLoading,
    error: tagSettingsError,
    refresh: refreshMemberTagData,
  } = useTagManagement({
    organizationId: membershipTagOrgId,
    userId: session.user.id,
    members: membershipScopedMembers,
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
    let isMounted = true;

    const fetchTagStatuses = async () => {
      if (!memberships.length) {
        if (isMounted) {
          setTagStatusByMembership({});
        }
        return;
      }

      const membershipIds = memberships.map((membership) => membership.id).filter(Boolean);
      const organizationIds = Array.from(
        new Set(memberships.map((membership) => membership.organizationId).filter(Boolean)),
      );

      if (!membershipIds.length || !organizationIds.length) {
        if (isMounted) {
          setTagStatusByMembership({});
        }
        return;
      }

      const [requiredCategoriesRes, memberTagsRes] = await Promise.all([
        supabase
          .from('organization_tag_categories')
          .select('id, organization_id')
          .in('organization_id', organizationIds)
          .eq('is_required', true),
        supabase
          .from('member_tags')
          .select(
            `
              member_id,
              organization_tags (
                category_id
              )
            `,
          )
          .in('member_id', membershipIds),
      ]);

      if (!isMounted) {
        return;
      }

      if (requiredCategoriesRes.error || memberTagsRes.error) {
        console.warn(
          '[MembershipSection] Unable to load tag completion status',
          requiredCategoriesRes.error ?? memberTagsRes.error,
        );
        return;
      }

      type RequiredRow = { id: string; organization_id: string };
      type MemberTagRow = { member_id: string; organization_tags?: { category_id: string } | { category_id: string }[] };

      const requiredByOrg = new Map<string, string[]>();
      (requiredCategoriesRes.data as RequiredRow[] | null | undefined)?.forEach((row) => {
        if (!row?.organization_id || !row?.id) return;
        if (!requiredByOrg.has(row.organization_id)) {
          requiredByOrg.set(row.organization_id, []);
        }
        requiredByOrg.get(row.organization_id)!.push(row.id);
      });

      const tagsByMember = new Map<string, Set<string>>();
      const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      };
      (memberTagsRes.data as MemberTagRow[] | null | undefined)?.forEach((row) => {
        if (!row?.member_id) return;
        const categories = toArray(row.organization_tags)
          .map((tag) => tag?.category_id)
          .filter((categoryId): categoryId is string => Boolean(categoryId));
        if (!categories.length) return;
        if (!tagsByMember.has(row.member_id)) {
          tagsByMember.set(row.member_id, new Set<string>());
        }
        const bucket = tagsByMember.get(row.member_id)!;
        categories.forEach((categoryId) => bucket.add(categoryId));
      });

      const nextStatus: Record<string, { missing: number }> = {};
      memberships.forEach((membership) => {
        const requiredCategories = requiredByOrg.get(membership.organizationId) ?? [];
        if (!requiredCategories.length) {
          nextStatus[membership.id] = { missing: 0 };
          return;
        }
        const selectedCategories = tagsByMember.get(membership.id) ?? new Set<string>();
        const missingCount = requiredCategories.reduce(
          (count, categoryId) => (selectedCategories.has(categoryId) ? count : count + 1),
          0,
        );
        nextStatus[membership.id] = { missing: missingCount };
      });

      setTagStatusByMembership(nextStatus);
    };

    void fetchTagStatuses();

    return () => {
      isMounted = false;
    };
  }, [memberships, tagStatusVersion]);

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
    setTagStatusByMembership((prev) => ({
      ...prev,
      [membership.id]: prev[membership.id] ?? { missing: tagSettingsRequired.length },
    }));
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
      setTagStatusVersion((value) => value + 1);
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
    const status = tagStatusByMembership[membership.id] ?? null;
    const isComplete = status ? status.missing === 0 : false;
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
              isComplete ? styles.membershipActionButtonReady : styles.membershipActionButtonWarning,
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
