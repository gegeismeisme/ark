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
}: AdminMemberTagModalProps) {
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
            assignments.map((assignment) => {
              const isSingle = assignment.selectionType === 'single';
              return (
                <View
                  key={assignment.categoryId}
                  style={[
                    styles.tagAssignmentRow,
                    assignment.required ? styles.tagAssignmentRowWarning : null,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.tagAssignmentName}>{assignment.categoryName}</Text>
                    <Text style={styles.tagAssignmentMeta}>
                      {assignment.required
                        ? t('account.tags.memberRequiredSection')
                        : t('account.tags.memberOptionalSection')}
                    </Text>
                  </View>
                  <View style={styles.tagSelectionList}>
                    {assignment.tagOptions.length === 0 ? (
                      <Text style={styles.tagEmptyText}>{t('account.memberships.tagSelectionEmpty')}</Text>
                    ) : (
                      assignment.tagOptions.map((option) => {
                        const active = draft.has(option.id);
                        return (
                          <Pressable
                            key={option.id}
                            style={[styles.tagSelectionOption, active && styles.tagSelectionOptionActive]}
                            onPress={() => onToggle(option.id, assignment.selectionType)}
                          >
                            <View style={styles.tagSelectionOptionIcon}>
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
                            <Text style={styles.tagSelectionOptionLabel}>{option.name}</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })
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
