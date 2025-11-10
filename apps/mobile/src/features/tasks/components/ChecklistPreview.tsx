'use client';

import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { TaskChecklistItem } from '../../../types';
import { t } from '../../../i18n';
import { styles } from '../../../styles/appStyles';
import { useChecklistProgress } from '../hooks/useChecklistProgress';

type ChecklistPreviewProps = {
  taskId: string | null | undefined;
  checklist: TaskChecklistItem[];
  readOnly?: boolean;
};

export function ChecklistPreview({ taskId, checklist, readOnly }: ChecklistPreviewProps) {
  const baseItems = useMemo(() => checklist ?? [], [checklist]);
  const [draft, setDraft] = useState('');

  const {
    items,
    loading,
    hydrated,
    error,
    toggleItem,
    addItem,
    removeItem,
    reset,
    completedRatio,
  } = useChecklistProgress({
    taskId,
    baseItems,
  });

  const showEmpty = !items.length && readOnly;

  return (
    <View style={styles.checklist}>
      <View style={styles.checklistHeader}>
        <Text style={styles.sectionTitle}>{t('task.checklist.title')}</Text>
        {completedRatio ? <Text style={styles.helperText}>{completedRatio}</Text> : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!hydrated || loading ? (
        <Text style={styles.helperText}>{t('common.loading')}</Text>
      ) : null}

      {showEmpty ? (
        <Text style={styles.emptyText}>{t('task.checklist.empty')}</Text>
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={styles.checklistRow}>
          <Pressable
            disabled={readOnly}
            style={({ pressed }) => [
              styles.checklistItem,
              item.completed && styles.checklistItemChecked,
              pressed && !readOnly && styles.buttonPressedLight,
            ]}
            onPress={() => (!readOnly ? toggleItem(item.id) : undefined)}
          >
            <Text style={styles.checklistIcon}>{item.completed ? '☑️' : '⬜️'}</Text>
            <Text
              style={[
                styles.checklistLabel,
                item.completed && styles.checklistLabelChecked,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
          {!readOnly && item.isCustom ? (
            <Pressable
              style={({ pressed }) => [
                styles.chip,
                styles.chipDanger,
                pressed && styles.buttonPressedLight,
              ]}
              onPress={() => removeItem(item.id)}
            >
              <Text style={styles.chipDangerText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {!readOnly ? (
        <>
          <View style={styles.checklistInputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('task.checklist.addPlaceholder')}
              style={styles.modalInput}
              maxLength={140}
              autoCapitalize="sentences"
            />
            <Pressable
              style={({ pressed }) => [
                styles.actionPrimary,
                pressed && styles.buttonPressed,
                !draft.trim() && styles.buttonDisabled,
              ]}
              disabled={!draft.trim()}
              onPress={() => {
                addItem(draft);
                setDraft('');
              }}
            >
              <Text style={styles.actionPrimaryText}>{t('task.checklist.addButton')}</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>{t('task.checklist.localOnly')}</Text>
          {items.length ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionSecondary,
                pressed && styles.buttonPressedLight,
              ]}
              onPress={reset}
            >
              <Text style={styles.actionSecondaryText}>
                {t('task.checklist.resetButton')}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
