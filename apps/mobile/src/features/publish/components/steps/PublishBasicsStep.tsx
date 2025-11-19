import { Pressable, Text, TextInput, View } from 'react-native';

import { t } from '../../../../i18n';
import { styles } from '../../../../styles/appStyles';
import type { AttachmentDraft } from '../../types';
import type { AttachmentSource } from '../../../tasks/useAttachmentActions';
import type { PublishTemplate } from '../../templates';
import { TemplateList } from '../TemplateList';
import { AttachmentPicker } from '../AttachmentPicker';

type PublishBasicsStepProps = {
  showTemplates: boolean;
  onToggleTemplates: () => void;
  selectedTemplateId: string | null;
  onSelectTemplate: (template: PublishTemplate) => void;
  submitting: boolean;
  title: string;
  onChangeTitle: (value: string) => void;
  description: string;
  onChangeDescription: (value: string) => void;
  attachmentDrafts: AttachmentDraft[];
  requireAttachment: boolean;
  attachmentPicking: boolean;
  maxAttachmentSizeLabel: string;
  attachmentError: string | null;
  onAddAttachment: (source: AttachmentSource) => void;
  onRemoveAttachment: (draftId: string) => void;
};

export function PublishBasicsStep({
  showTemplates,
  onToggleTemplates,
  selectedTemplateId,
  onSelectTemplate,
  submitting,
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  attachmentDrafts,
  requireAttachment,
  attachmentPicking,
  maxAttachmentSizeLabel,
  attachmentError,
  onAddAttachment,
  onRemoveAttachment,
}: PublishBasicsStepProps) {
  return (
    <View style={styles.publishStepCard}>
      <View style={styles.formField}>
        <Pressable style={styles.publishTemplateToggle} onPress={onToggleTemplates}>
          <Text style={styles.publishTemplateToggleText}>
            {showTemplates ? t('app.publish.templates.hide') : t('app.publish.templates.show')}
          </Text>
        </Pressable>
        {showTemplates ? (
          <TemplateList selectedId={selectedTemplateId} onSelect={onSelectTemplate} disabled={submitting} />
        ) : null}
      </View>
      <View style={styles.formField}>
        <Text style={styles.formLabel}>{t('app.publish.form.field.title')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('app.publish.form.field.titlePlaceholder')}
          value={title}
          onChangeText={onChangeTitle}
          editable={!submitting}
        />
      </View>
      <View style={styles.formField}>
        <Text style={styles.formLabel}>{t('app.publish.form.field.description')}</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder={t('app.publish.form.field.descriptionPlaceholder')}
          value={description}
          onChangeText={onChangeDescription}
          multiline
          numberOfLines={4}
          editable={!submitting}
        />
      </View>
      <AttachmentPicker
        drafts={attachmentDrafts}
        requireAttachment={requireAttachment}
        picking={attachmentPicking}
        submitting={submitting}
        maxSizeLabel={maxAttachmentSizeLabel}
        error={attachmentError}
        onAdd={onAddAttachment}
        onRemove={onRemoveAttachment}
      />
    </View>
  );
}
