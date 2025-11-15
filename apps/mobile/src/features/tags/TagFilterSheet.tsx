import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { TagCategory, TagSelectionType } from './useMemberTagFilters';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type TagFilterSheetProps = {
  visible: boolean;
  categories: TagCategory[];
  loading: boolean;
  error: string | null;
  filters: Record<string, string[]>;
  onApply: (filters: Record<string, string[]>) => void;
  onClose: () => void;
  onClearAll: () => void;
};

const selectionLabel = (type: TagSelectionType) =>
  type === 'single' ? t('tags.selection.single') : t('tags.selection.multiple');

export function TagFilterSheet({
  visible,
  categories,
  loading,
  error,
  filters,
  onApply,
  onClose,
  onClearAll,
}: TagFilterSheetProps) {
  const [draft, setDraft] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [filters, visible]);

  const handleToggle = (categoryId: string, tagId: string, selectionType: TagSelectionType) => {
    setDraft((prev) => {
      const current = prev[categoryId] ?? [];
      if (selectionType === 'single') {
        return {
          ...prev,
          [categoryId]: current.includes(tagId) ? [] : [tagId],
        };
      }
      if (current.includes(tagId)) {
        return {
          ...prev,
          [categoryId]: current.filter((id) => id !== tagId),
        };
      }
      return {
        ...prev,
        [categoryId]: [...current, tagId],
      };
    });
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    onClearAll();
    setDraft({});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.orgCreateOverlay}>
        <View style={styles.tagFilterSheet}>
          <View style={styles.tagFilterHeader}>
            <View style={styles.tagFilterHeaderText}>
              <Text style={styles.tagFilterTitle}>{t('tags.filter.sheetTitle')}</Text>
              <Text style={styles.tagFilterSubtitle}>{t('tags.filter.sheetSubtitle')}</Text>
            </View>
            <Pressable style={styles.orgCreateClose} onPress={onClose}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.joinHistoryEmpty}>
              <ActivityIndicator color="#0f172a" />
              <Text style={styles.joinHistoryEmptyText}>{t('tags.filter.loading')}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : categories.length === 0 ? (
            <Text style={styles.joinHistoryEmptyText}>{t('tags.filter.empty')}</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.tagFilterContent}>
              {categories.map((category) => {
                const selected = draft[category.id] ?? [];
                return (
                  <View key={category.id} style={styles.tagFilterCategory}>
                    <View style={styles.tagFilterCategoryHeader}>
                      <Text style={styles.tagFilterCategoryTitle}>{category.name}</Text>
                      <Text style={styles.tagFilterCategoryMeta}>
                        {selectionLabel(category.selectionType)}
                      </Text>
                    </View>
                    {category.tags.length === 0 ? (
                      <Text style={styles.tagFilterEmpty}>{t('tags.filter.noTags')}</Text>
                    ) : (
                      <View style={styles.tagFilterChipRow}>
                        {category.tags.map((tag) => {
                          const isActive = selected.includes(tag.id);
                          return (
                            <Pressable
                              key={tag.id}
                              style={[
                                styles.tagFilterChip,
                                isActive && styles.tagFilterChipActive,
                              ]}
                              onPress={() =>
                                handleToggle(category.id, tag.id, category.selectionType)
                              }
                            >
                              <Text
                                style={
                                  isActive
                                    ? styles.tagFilterChipLabelActive
                                    : styles.tagFilterChipLabel
                                }
                              >
                                {tag.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.tagFilterFooter}>
            <Pressable style={styles.secondaryButton} onPress={handleClear}>
              <Text style={styles.secondaryButtonText}>{t('tags.filter.clear')}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleApply}>
              <Text style={styles.primaryButtonText}>{t('tags.filter.apply')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
