import { Pressable, Text, View } from 'react-native';

import { t } from '../../../i18n';
import { styles } from '../../../styles/appStyles';
import {
  ATTACHMENT_SOURCE_META,
  DEFAULT_ATTACHMENT_SOURCES,
} from '../../tasks/attachmentSources';
import { formatFileSize } from '../formatFileSize';
import type { AttachmentSource, PickedAttachment } from '../../tasks/useAttachmentActions';

type AttachmentDraft = {
  id: string;
  source: AttachmentSource;
  file: PickedAttachment;
};

type AttachmentPickerProps = {
  drafts: AttachmentDraft[];
  requireAttachment: boolean;
  picking: boolean;
  submitting: boolean;
  maxSizeLabel: string;
  error: string | null;
  onAdd: (source: AttachmentSource) => void;
  onRemove: (draftId: string) => void;
};

export function AttachmentPicker({
  drafts,
  requireAttachment,
  picking,
  submitting,
  maxSizeLabel,
  error,
  onAdd,
  onRemove,
}: AttachmentPickerProps) {
  return (
    <View style={styles.formField}>
      <View style={styles.attachmentHeaderRow}>
        <View style={styles.attachmentTitleRow}>
          <Text style={styles.formLabel}>{t('app.publish.attachments.title')}</Text>
          {requireAttachment ? (
            <Text style={styles.attachmentRequiredBadge}>{t('task.attachments.required')}</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.helperText}>{t('app.publish.attachments.subtitle')}</Text>

      {drafts.length === 0 ? (
        <Text style={styles.helperText}>{t('app.publish.attachments.empty')}</Text>
      ) : (
        <View style={styles.attachmentPendingSection}>
          {drafts.map((draft) => (
            <View key={draft.id} style={styles.attachmentPendingItem}>
              <View style={styles.attachmentPendingInfo}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {draft.file.name}
                </Text>
                <Text style={styles.attachmentPendingMeta}>
                  {ATTACHMENT_SOURCE_META[draft.source].icon}{' '}
                  {t(ATTACHMENT_SOURCE_META[draft.source].labelKey)} · {formatFileSize(draft.file.size)}
                </Text>
              </View>
              <View style={styles.attachmentPendingActions}>
                <Pressable
                  style={styles.attachmentPendingRemove}
                  onPress={() => onRemove(draft.id)}
                >
                  <Text style={styles.attachmentPendingRemoveText}>
                    {t('app.publish.attachments.remove')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.helperText}>{t('app.publish.attachments.sourcesTitle')}</Text>
      <View style={styles.attachmentSourceRow}>
        {DEFAULT_ATTACHMENT_SOURCES.map((source) => {
          const meta = ATTACHMENT_SOURCE_META[source];
          return (
            <Pressable
              key={source}
              style={[
                styles.attachmentSourceButton,
                (picking || submitting) && styles.buttonDisabled,
              ]}
              disabled={picking || submitting}
              onPress={() => onAdd(source)}
            >
              <Text style={styles.attachmentSourceIcon}>{meta.icon}</Text>
              <Text style={styles.attachmentSourceLabel}>{t(meta.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.helperText}>
        {t('app.publish.attachments.limit', { size: maxSizeLabel })}
      </Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}
