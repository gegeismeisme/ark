import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type CreateOrganizationCardProps = {
  creating: boolean;
  onCreate: (payload: { name: string; description: string; displayName: string }) => Promise<boolean>;
  canCreate: boolean;
  disabledReason?: string | null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export function CreateOrganizationCard({
  creating,
  onCreate,
  canCreate,
  disabledReason,
}: CreateOrganizationCardProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slug = useMemo(() => slugify(name), [name]);

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
    });
    if (success) {
      setName('');
      setDescription('');
      setDisplayName('');
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
          <Text style={styles.accountOrgHint}>{t('account.organization.nameImmutableHint')}</Text>
          {slug ? <Text style={styles.accountOrgSlug}>{t('account.organization.slugPreview', { slug })}</Text> : null}
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
