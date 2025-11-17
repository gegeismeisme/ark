import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';
import { useOrganizationMembers } from '../organizations/useOrganizationMembers';
import { useMemberTagStatus } from '../tags/useMemberTagStatus';
import { supabase } from '../../lib/supabaseClient';

type MembersManagerScreenProps = {
  visible: boolean;
  organizationId: string | null;
  onClose: () => void;
  onOpenMemberTags: (member: {
    id: string;
    displayName: string | null;
    fullName: string | null;
    organizationId: string;
  }) => void;
  onMembershipsChanged?: () => Promise<void> | void;
};

const roleOrder: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

export function MembersManagerScreen({
  visible,
  organizationId,
  onClose,
  onOpenMemberTags,
  onMembershipsChanged,
}: MembersManagerScreenProps) {
  const { members, loading, error, refresh } = useOrganizationMembers(organizationId);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { status: tagStatus } = useMemberTagStatus(organizationId, memberIds);
  const [actionTarget, setActionTarget] = useState<ReturnType<typeof useOrganizationMembers>['members'][number] | null>(
    null,
  );
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const orderA = roleOrder[a.role ?? 'member'] ?? 3;
      const orderB = roleOrder[b.role ?? 'member'] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      return (a.fullName ?? '').localeCompare(b.fullName ?? '');
    });
  }, [members]);

  const closeAction = () => {
    if (saving) return;
    setActionTarget(null);
    setNameDraft('');
    setRemoveConfirm(false);
  };

  const openActions = (member: (typeof members)[number]) => {
    setActionTarget(member);
    setNameDraft(member.displayName ?? member.fullName ?? '');
    setRemoveConfirm(false);
  };

  const handleSaveName = async () => {
    if (!actionTarget) return;
    if (actionTarget.displayNameLocked) {
      Alert.alert(t('app.alert.noticeTitle'), t('account.memberships.editLocked'));
      return;
    }
    setSaving(true);
    const trimmed = nameDraft.trim();
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ display_name: trimmed || null })
      .eq('id', actionTarget.id);
    setSaving(false);
    if (updateError) {
      Alert.alert(t('app.alert.noticeTitle'), updateError.message);
      return;
    }
    await refresh();
    if (onMembershipsChanged) {
      await onMembershipsChanged();
    }
    closeAction();
  };

  const handleToggleLock = async () => {
    if (!actionTarget) return;
    if (actionTarget.role === 'owner') {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.ownerImmutable'));
      return;
    }
    setSaving(true);
    const nextLocked = !actionTarget.displayNameLocked;
    const { error: updateError } = await supabase.rpc('set_member_lock', {
      p_member_id: actionTarget.id,
      p_locked: nextLocked,
    });
    setSaving(false);
    if (updateError) {
      Alert.alert(t('app.alert.noticeTitle'), updateError.message);
      return;
    }
    await refresh();
    if (onMembershipsChanged) {
      await onMembershipsChanged();
    }
    closeAction();
  };

  const handleToggleRole = async () => {
    if (!actionTarget) return;
    if (actionTarget.role === 'owner') {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.ownerImmutable'));
      return;
    }
    const nextRole = actionTarget.role === 'admin' ? 'member' : 'admin';
    setSaving(true);
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ role: nextRole })
      .eq('id', actionTarget.id);
    setSaving(false);
    if (updateError) {
      Alert.alert(t('app.alert.noticeTitle'), updateError.message);
      return;
    }
    await refresh();
    if (onMembershipsChanged) {
      await onMembershipsChanged();
    }
    closeAction();
  };

  const handleRemove = async () => {
    if (!actionTarget) return;
    if (actionTarget.role === 'owner') {
      Alert.alert(t('app.alert.noticeTitle'), t('account.organization.ownerImmutable'));
      return;
    }
    if (actionTarget.role === 'admin') {
      Alert.alert(t('app.alert.noticeTitle'), t('account.members.demoteAdmin'));
      return;
    }
    if (!removeConfirm) {
      setRemoveConfirm(true);
      return;
    }
    setSaving(true);
    const { error: deleteError } = await supabase.from('organization_members').delete().eq('id', actionTarget.id);
    setSaving(false);
    if (deleteError) {
      Alert.alert(t('app.alert.noticeTitle'), deleteError.message);
      return;
    }
    await refresh();
    if (onMembershipsChanged) {
      await onMembershipsChanged();
    }
    closeAction();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.tagSettingsContainer}>
        <View style={styles.tagSettingsHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </Pressable>
          <Text style={styles.tagSelectionTitle}>{t('account.members.manageTitle')}</Text>
          <Pressable onPress={refresh} hitSlop={12}>
            <Ionicons name="refresh" size={20} color="#0f172a" />
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.tagStatusRow}>
            <Text style={styles.tagStatusText}>{t('app.loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.tagStatusRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {sortedMembers.map((member) => {
              const missing = tagStatus[member.id]?.missing ?? 0;
              const tagsComplete = missing === 0;
              const cardStyle =
                member.role === 'owner'
                  ? styles.membershipCardOwner
                  : member.role === 'admin'
                    ? styles.membershipCardAdmin
                    : styles.membershipCardMember;
              return (
                <View key={member.id} style={[styles.membershipCard, cardStyle]}>
                  <View style={styles.membershipInfo}>
                    <Text style={styles.membershipName} numberOfLines={1}>
                      {member.displayName ?? member.fullName ?? t('account.memberships.unknownMember')}
                    </Text>
                    <Text style={styles.membershipRole}>
                      {member.role ? member.role.toUpperCase() : t('account.memberships.roleMember')}
                    </Text>
                  </View>
                  <View style={styles.membershipActions}>
                    <View
                      style={[
                        styles.membershipActionButton,
                        member.displayNameLocked ? styles.membershipActionButtonWarning : styles.membershipActionButtonReady,
                      ]}
                    >
                      <Ionicons
                        name={member.displayNameLocked ? 'lock-closed-outline' : 'lock-open-outline'}
                        size={16}
                        color="#0f172a"
                      />
                    </View>
                    <Pressable
                      style={[
                        styles.membershipActionButton,
                        tagsComplete ? styles.membershipActionButtonReady : styles.membershipActionButtonWarning,
                      ]}
                      onPress={() =>
                        onOpenMemberTags({
                          id: member.id,
                          displayName: member.displayName ?? member.fullName ?? null,
                          fullName: member.fullName,
                          organizationId: member.organizationId,
                        })
                      }
                    >
                      <Ionicons name={tagsComplete ? 'pricetag' : 'pricetag-outline'} size={16} color="#0f172a" />
                    </Pressable>
                    <Pressable style={styles.membershipActionButton} onPress={() => openActions(member)}>
                      <Ionicons name="settings-outline" size={18} color="#0f172a" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={Boolean(actionTarget)} transparent animationType="slide" onRequestClose={closeAction}>
        <View style={styles.orgCreateOverlay}>
          <View style={styles.orgCreateSheet}>
            <View style={styles.orgCreateHeader}>
              <Text style={styles.orgCreateTitle}>{t('account.members.manageTitle')}</Text>
              <Pressable style={styles.orgCreateClose} onPress={closeAction}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
            {actionTarget ? (
              <>
                <Text style={styles.orgImmutableHint}>{actionTarget.fullName ?? ''}</Text>
                <TextInput
                  style={styles.input}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder={t('account.memberships.editPlaceholder')}
                  editable={!actionTarget.displayNameLocked && !saving}
                />
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: '#16a34a' }]}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Text style={styles.primaryButtonText}>{t('account.memberships.editTitle')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, { backgroundColor: '#facc15' }]}
                  onPress={handleToggleLock}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>
                    {actionTarget.displayNameLocked ? t('account.members.unlock') : t('account.members.lock')}
                  </Text>
                </Pressable>
                {actionTarget.role !== 'owner' ? (
                  <Pressable style={styles.secondaryButton} onPress={handleToggleRole} disabled={saving}>
                    <Text style={styles.secondaryButtonText}>
                      {actionTarget.role === 'admin'
                        ? t('account.members.demoteAdmin')
                        : t('account.members.promoteAdmin')}
                    </Text>
                  </Pressable>
                ) : null}
                {actionTarget.role !== 'owner' ? (
                  <Pressable
                    style={[styles.secondaryButton, { backgroundColor: '#dc2626' }]}
                    onPress={handleRemove}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {removeConfirm ? t('account.members.removeConfirmStage') : t('account.members.remove')}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
