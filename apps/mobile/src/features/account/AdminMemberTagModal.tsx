import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';

type AdminTagAssignment = {
  categoryId: string;
  categoryName: string;
  selectionType: 'single' | 'multiple';
  tagOptions: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
  selectedTagIds: string[];
  required: boolean;
  hasMissing: boolean;
  confirmed: boolean;
};

type AdminMemberTagModalProps = {
  visible: boolean;
  memberName: string | null;
  assignments: AdminTagAssignment[];
  draft: Set<string>;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onToggle: (tagId: string, selectionType: 'single' | 'multiple') => void;
  onSave: () => void;
  onConfirm: (categoryId: string, nextState: boolean) => void;
  confirmingCategoryId: string | null;
};

export function AdminMemberTagModal({
  visible,
  memberName,
  assignments,
  draft,
  saving,
  error,
  onClose,
  onToggle,
  onSave,
  onConfirm,
  confirmingCategoryId,
}: AdminMemberTagModalProps) {
  const requiredAssignments = assignments.filter((assignment) => assignment.required);
  const optionalAssignments = assignments.filter((assignment) => !assignment.required);

  const renderCard = (assignment: AdminTagAssignment) => {
    const isSingle = assignment.selectionType === 'single';
    const baseStyle = [styles.adminTagCard as any];
    if (assignment.required) {
      if (assignment.hasMissing) {
        baseStyle.push(styles.adminTagCardDanger);
      } else if (assignment.confirmed) {
        baseStyle.push(styles.adminTagCardSuccess);
      } else {
        baseStyle.push(styles.adminTagCardPending);
      }
    } else {
      if (assignment.confirmed) {
        baseStyle.push(styles.adminTagCardOptionalConfirmed);
      } else {
        baseStyle.push(styles.adminTagCardOptional);
      }
    }

    return (
      <View key={assignment.categoryId} style={baseStyle}>
        <View style={styles.adminTagCardHeader}>
          <View>
            <Text style={styles.adminTagCardTitle}>{assignment.categoryName}</Text>
            <Text style={styles.adminTagCardMeta}>
              {assignment.required ? t('account.tags.memberRequiredSection') : t('account.tags.memberOptionalSection')}
            </Text>
          </View>
          <Pressable
            style={[
              styles.adminTagConfirmButton,
              assignment.confirmed && styles.adminTagConfirmButtonActive,
            ]}
            onPress={() => onConfirm(assignment.categoryId, !assignment.confirmed)}
            disabled={confirmingCategoryId === assignment.categoryId}
          >
            {confirmingCategoryId === assignment.categoryId ? (
              <ActivityIndicator color="#0f172a" size="small" />
            ) : (
              <Ionicons
                name={assignment.confirmed ? 'checkmark-circle' : 'checkmark-outline'}
                size={18}
                color={assignment.confirmed ? '#0f172a' : '#94a3b8'}
              />
            )}
          </Pressable>
        </View>
        <View style={styles.adminTagOptionList}>
          {assignment.tagOptions.length === 0 ? (
            <Text style={styles.tagEmptyText}>{t('account.memberships.tagSelectionEmpty')}</Text>
          ) : (
            assignment.tagOptions.map((option) => {
              const active = draft.has(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.adminTagOptionRow, active && styles.adminTagOptionActive]}
                  onPress={() => onToggle(option.id, assignment.selectionType)}
                >
                  <View style={styles.adminTagOptionIcon}>
                    <Ionicons
                      name={
                        isSingle
                          ? active
                            ? 'radio-button-on'
                            : 'radio-button-off'
                          : active
                            ? 'checkbox-outline'
                            : 'square-outline'
                      }
                      size={18}
                      color={active ? '#0f172a' : '#94a3b8'}
                    />
                  </View>
                  <Text style={styles.adminTagOptionLabel}>{option.name}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.tagSettingsContainer}>
        <View style={styles.tagSettingsHeader}>
          <Pressable style={styles.tagSettingsBack} onPress={onClose}>
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.tagSettingsTitle}>{memberName ?? t('account.memberships.unknownMember')}</Text>
            <Text style={styles.tagSettingsSubtitle}>{t('account.memberships.tagSettingsSubtitle')}</Text>
          </View>
          <View style={styles.tagSettingsAddButton}>
            <Ionicons name="reader-outline" size={18} color="#94a3b8" />
          </View>
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {assignments.length === 0 ? (
            <Text style={styles.tagEmptyText}>{t('account.memberships.tagEmpty')}</Text>
          ) : (
            <>
              <View style={styles.tagSettingsSection}>
                <Text style={styles.tagSettingsSectionTitle}>{t('account.tags.memberRequiredSection')}</Text>
                {requiredAssignments.length === 0 ? (
                  <Text style={styles.tagEmptyText}>{t('account.tags.memberRequiredEmpty')}</Text>
                ) : (
                  requiredAssignments.map(renderCard)
                )}
              </View>
              <View style={styles.tagSettingsSection}>
                <Text style={styles.tagSettingsSectionTitle}>{t('account.tags.memberOptionalSection')}</Text>
                {optionalAssignments.length === 0 ? (
                  <Text style={styles.tagEmptyText}>{t('account.tags.memberOptionalEmpty')}</Text>
                ) : (
                  optionalAssignments.map(renderCard)
                )}
              </View>
            </>
          )}
          {error ? <Text style={styles.tagSheetError}>{error}</Text> : null}
        </ScrollView>
        <Pressable style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('account.actions.save')}</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
