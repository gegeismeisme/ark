import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { t } from '../../../i18n';
import { styles } from '../../../styles/appStyles';
import type { TagCategory } from '../../tags/useMemberTagFilters';

type TagFilterDrawerProps = {
  visible: boolean;
  categories: TagCategory[];
  filters: Record<string, string[]>;
  loading: boolean;
  error: string | null;
  onApply: (next: Record<string, string[]>) => void;
  onClear: () => void;
  onClose: () => void;
  memberSummaries: Array<{ membershipId: string; name: string }>;
  memberTagIndex: Map<string, Set<string>>;
  onAppendMatches: (membershipIds: string[]) => void;
};

export function TagFilterDrawer({
  visible,
  categories,
  filters,
  loading,
  error,
  onApply,
  onClear,
  onClose,
  memberSummaries,
  memberTagIndex,
  onAppendMatches,
}: TagFilterDrawerProps) {
  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>(filters);

  useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [visible, filters]);

  const toggleTag = (categoryId: string, tagId: string) => {
    setDraftFilters((prev) => {
      const next = { ...prev };
      const current = new Set(next[categoryId] ?? []);
      if (current.has(tagId)) {
        current.delete(tagId);
      } else {
        current.add(tagId);
      }
      next[categoryId] = Array.from(current);
      return next;
    });
  };

  const matchingMembers = useMemo(() => {
    const activeFilters = Object.entries(draftFilters).filter(([, ids]) => ids.length > 0);
    if (activeFilters.length === 0) return memberSummaries;
    return memberSummaries.filter((member) =>
      activeFilters.every(([, tagIds]) => {
        const tagSet = memberTagIndex.get(member.membershipId);
        if (!tagSet || tagSet.size === 0) return false;
        return tagIds.some((tagId) => tagSet.has(tagId));
      }),
    );
  }, [draftFilters, memberSummaries, memberTagIndex]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.publishFilterDrawer}>
        <View style={styles.publishFilterDrawerHeader}>
          <Text style={styles.publishFilterDrawerTitle}>{t('app.publish.filters.drawerTitle')}</Text>
          <Pressable style={styles.publishFilterDrawerClose} onPress={onClose}>
            <Ionicons name="close" size={18} color="#0f172a" />
          </Pressable>
        </View>
        {loading ? (
          <Text style={styles.helperText}>{t('common.loading')}</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : categories.length === 0 ? (
          <Text style={styles.helperText}>{t('app.publish.filters.empty')}</Text>
        ) : (
          <ScrollView style={styles.publishFilterDrawerBody} showsVerticalScrollIndicator={false}>
            {categories.map((category) => (
              <View key={category.id} style={styles.publishFilterCategory}>
                <View style={styles.publishFilterCategoryHeader}>
                  <Text style={styles.publishFilterCategoryTitle}>{category.name}</Text>
                  {category.isRequired ? (
                    <Text style={styles.publishFilterCategoryMeta}>{t('account.tags.memberRequiredSection')}</Text>
                  ) : null}
                </View>
                <View style={styles.publishFilterTagRow}>
                  {category.tags.length === 0 ? (
                    <Text style={styles.helperText}>{t('app.publish.filters.noTags')}</Text>
                  ) : (
                    category.tags.map((tag) => {
                      const active = draftFilters[category.id]?.includes(tag.id);
                      return (
                        <Pressable
                          key={tag.id}
                          style={[styles.publishFilterTag, active && styles.publishFilterTagActive]}
                          onPress={() => toggleTag(category.id, tag.id)}
                        >
                          <Text
                            style={[
                              styles.publishFilterTagLabel,
                              active && styles.publishFilterTagLabelActive,
                            ]}
                          >
                            {tag.name}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.publishFilterMatches}>
          <Text style={styles.publishFilterMatchesTitle}>
            {t('app.publish.filters.summaryIdle', { total: matchingMembers.length })}
          </Text>
          {matchingMembers.length === 0 ? (
            <Text style={styles.helperText}>{t('app.publish.filters.noMatches')}</Text>
          ) : (
            <View style={styles.publishFilterMatchList}>
              {matchingMembers.map((member) => (
                <View key={member.membershipId} style={styles.publishFilterMatchChip}>
                  <Text style={styles.publishFilterMatchLabel}>{member.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.publishFilterDrawerFooter}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              onClear();
              const empty: Record<string, string[]> = {};
              categories.forEach((category) => {
                empty[category.id] = [];
              });
              setDraftFilters(empty);
            }}
          >
            <Text style={styles.secondaryButtonText}>{t('common.clear')}</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              onApply(draftFilters);
              onAppendMatches(matchingMembers.map((member) => member.membershipId));
              onClose();
            }}
          >
            <Text style={styles.primaryButtonText}>{t('common.apply')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
