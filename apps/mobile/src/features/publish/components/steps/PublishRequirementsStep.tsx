import { Switch, Text, View } from 'react-native';

import { t } from '../../../../i18n';
import { styles } from '../../../../styles/appStyles';

type PublishRequirementsStepProps = {
  requireAttachment: boolean;
  onChangeRequireAttachment: (value: boolean) => void;
  requireNote: boolean;
  onChangeRequireNote: (value: boolean) => void;
  cameraOnly: boolean;
  onChangeCameraOnly: (value: boolean) => void;
  enforceWindow: boolean;
  onChangeEnforceWindow: (value: boolean) => void;
  enforceWindowDisabled: boolean;
  enforceWindowHelper: string;
  autoAccept: boolean;
  onChangeAutoAccept: (value: boolean) => void;
  autoArchive: boolean;
  onChangeAutoArchive: (value: boolean) => void;
  submitting: boolean;
};

export function PublishRequirementsStep({
  requireAttachment,
  onChangeRequireAttachment,
  requireNote,
  onChangeRequireNote,
  cameraOnly,
  onChangeCameraOnly,
  enforceWindow,
  onChangeEnforceWindow,
  enforceWindowDisabled,
  enforceWindowHelper,
  autoAccept,
  onChangeAutoAccept,
  autoArchive,
  onChangeAutoArchive,
  submitting,
}: PublishRequirementsStepProps) {
  return (
    <View style={styles.publishStepCard}>
      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.requireAttachment')}</Text>
          <Text style={styles.helperText}>{t('app.publish.form.field.requireAttachmentHint')}</Text>
        </View>
        <Switch value={requireAttachment} onValueChange={onChangeRequireAttachment} disabled={submitting} />
      </View>
      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.requireNote')}</Text>
          <Text style={styles.helperText}>{t('app.publish.form.field.requireNoteHint')}</Text>
        </View>
        <Switch value={requireNote} onValueChange={onChangeRequireNote} disabled={submitting} />
      </View>
      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.cameraOnly')}</Text>
          <Text style={styles.helperText}>{t('app.publish.form.field.cameraOnlyHint')}</Text>
        </View>
        <Switch value={cameraOnly} onValueChange={onChangeCameraOnly} disabled={submitting} />
      </View>
      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.enforceWindow')}</Text>
          <Text style={styles.helperText}>{enforceWindowHelper}</Text>
        </View>
        <Switch
          value={enforceWindow}
          onValueChange={onChangeEnforceWindow}
          disabled={submitting || enforceWindowDisabled}
        />
      </View>
      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.autoAccept')}</Text>
          <Text style={styles.helperText}>{t('app.publish.form.field.autoAcceptHint')}</Text>
        </View>
        <Switch value={autoAccept} onValueChange={onChangeAutoAccept} disabled={submitting} />
      </View>
      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.autoArchive')}</Text>
          <Text style={styles.helperText}>{t('app.publish.form.field.autoArchiveHint')}</Text>
        </View>
        <Switch value={autoArchive} onValueChange={onChangeAutoArchive} disabled={submitting} />
      </View>
    </View>
  );
}
