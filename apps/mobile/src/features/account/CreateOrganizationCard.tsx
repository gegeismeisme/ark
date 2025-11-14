import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type CreateOrganizationCardProps = {
  creating: boolean;
  onCreate: (payload: { name: string; description: string; displayName: string; visibility: 'public' | 'private' }) => Promise<boolean>;
  canCreate: boolean;
  disabledReason?: string | null;
};

export function CreateOrganizationCard({
  creating,
  onCreate,
  canCreate,
  disabledReason,
}: CreateOrganizationCardProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const trimmedDisplayName = displayName.trim();
    if (!trimmedName || !trimmedDisplayName) {
      setError(t('account.organization.errorMissing'));
      return;
    }
    setError(null);
    const success = await onCreate({
      name: trimmedName,
      description: description.trim(),
      displayName: trimmedDisplayName,
      visibility,
    });
    if (success) {
      setName('');
      setDescription('');
      setDisplayName('');
      setVisibility('public');
    }
  };

  return (
    <View style={styles.accountOrgCard}>
      <Text style={styles.accountOrgCardTitle}>{t('account.organization.title')}</Text>
      {!canCreate ? (
        <Text style={styles.accountOrgCardMeta}>{disabledReason ?? t('account.organization.upgradeHint', { limit: 1 })}</Text>
      ) : (
        <>
          <TextInput
            style={styles.accountInput}
            value={name}
            onChangeText={setName}
            placeholder={t('account.organization.namePlaceholder')}
          />
          <TextInput
            style={styles.accountInput}
            value={description}
            onChangeText={setDescription}
            placeholder={t('account.organization.descriptionPlaceholder')}
          />
          <TextInput
            style={styles.accountInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('account.organization.displayNamePlaceholder')}
          />
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
          <Text style={styles.accountOrgHint}>{t('account.organization.nameImmutableHint')}</Text>
          <Text style={styles.accountOrgHint}>{t('account.organization.slugAuto')}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            style={[styles.primaryButton, (creating || !canCreate) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={creating || !canCreate}
          >
            {creating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('account.organization.createButton')}</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}
