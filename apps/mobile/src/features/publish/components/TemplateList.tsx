import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../../../styles/appStyles';
import { PUBLISH_TEMPLATES, type PublishTemplate } from '../templates';
import { t } from '../../../i18n';

type TemplateListProps = {
  selectedId: string | null;
  onSelect: (template: PublishTemplate) => void;
  disabled?: boolean;
};

export function TemplateList({ selectedId, onSelect, disabled }: TemplateListProps) {
  const selectedTemplate = PUBLISH_TEMPLATES.find((tpl) => tpl.id === selectedId);

  return (
    <View style={styles.publishTemplateSection}>
      <View style={styles.chipRow}>
        {PUBLISH_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.chip,
              selectedId === template.id && styles.chipActive,
              styles.publishTemplatePill,
            ]}
            onPress={() => onSelect(template)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.chipLabel,
                selectedId === template.id && styles.chipLabelActive,
              ]}
              numberOfLines={1}
            >
              {template.icon} {t(template.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedTemplate ? (
        <View style={styles.publishTemplateCard}>
          <Text style={styles.publishTemplateTitle}>
            {selectedTemplate.icon} {t(selectedTemplate.labelKey)}
          </Text>
          <Text style={styles.publishTemplateDescription}>
            {t(selectedTemplate.descriptionKey)}
          </Text>
          {selectedTemplate.dueInHours ? (
            <Text style={styles.helperText}>
              {t('app.publish.templates.dueHint', { hours: selectedTemplate.dueInHours })}
            </Text>
          ) : null}
          {selectedTemplate.defaultChecklistKeys?.length ? (
            <View style={styles.publishTemplateChecklist}>
              {selectedTemplate.defaultChecklistKeys.map((key) => (
                <View key={key} style={styles.publishTemplateChecklistItem}>
                  <Text style={styles.publishTemplateChecklistIcon}>☑️</Text>
                  <Text style={styles.publishTemplateChecklistLabel}>{t(key)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.helperText}>{t('app.publish.templates.placeholder')}</Text>
      )}
    </View>
  );
}
