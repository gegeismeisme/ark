import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type EditOrganizationCardProps = {
  initialName: string;
  initialDescription: string;
  initialDisplayName: string;
  initialVisibility: 'public' | 'private';
  saving: boolean;
  onSave: (payload: {
    name: string;
    description: string;
    displayName: string;
    visibility: 'public' | 'private';
  }) => Promise<void>;
  ctaLabel?: string;
  errorMessage?: string | null;
};

export function EditOrganizationCard({
  initialName,
  initialDescription,
  initialDisplayName,
  initialVisibility,
  saving,
  onSave,
  ctaLabel,
  errorMessage,
}: EditOrganizationCardProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialVisibility);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);
  useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);
  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);
  useEffect(() => {
    setVisibility(initialVisibility);
  }, [initialVisibility]);

  const handleSave = () =>
    onSave({
      name: name.trim(),
      description: description.trim(),
      displayName: displayName.trim(),
      visibility,
    });

  return (
    <View style={{ gap: 16 }}>
      <TextInput
        style={styles.accountInput}
        value={name}
        onChangeText={setName}
        placeholder={t('account.organization.namePlaceholder')}
      />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('account.organization.descriptionPlaceholder')}</Text>
        <TextInput
          style={[styles.accountInput, { height: 90, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('account.organization.descriptionPlaceholder')}
          multiline
        />
      </View>
      <View style={styles.visibilityToggle}>
        <Text style={styles.label}>{t('account.organization.visibilityLabel')}</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, visibility === 'public' && styles.toggleButtonActive]}
            onPress={() => setVisibility('public')}
          >
            <Text style={visibility === 'public' ? styles.toggleLabelActive : styles.toggleLabel}>
              {t('account.organization.visibilityPublic')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, visibility === 'private' && styles.toggleButtonActive]}
            onPress={() => setVisibility('private')}
          >
            <Text style={visibility === 'private' ? styles.toggleLabelActive : styles.toggleLabel}>
              {t('account.organization.visibilityPrivate')}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.accountOrgHint}>{t('account.organization.visibilityHint')}</Text>
      </View>
      <TextInput
        style={styles.accountInput}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t('account.organization.displayNamePlaceholder')}
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Pressable
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>{ctaLabel ?? t('account.organization.saveChanges')}</Text>
      </Pressable>
    </View>
  );
}
