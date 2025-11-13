import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type CreateOrganizationCardProps = {
  organization: ActiveOrganization | null;
  creating: boolean;
  onCreate: (payload: { name: string; description: string; displayName: string }) => Promise<boolean>;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export function CreateOrganizationCard({
  organization,
  creating,
  onCreate,
}: CreateOrganizationCardProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slug = useMemo(() => slugify(name), [name]);

  if (organization) {
    return (
      <View style={styles.accountOrgCard}>
        <Text style={styles.accountOrgCardTitle}>{t('account.organization.current')}</Text>
        <Text style={styles.accountOrgCardName}>{organization.name}</Text>
        {organization.role ? (
          <Text style={styles.accountOrgCardMeta}>{t('account.organization.role', { role: organization.role })}</Text>
        ) : null}
      </View>
    );
  }

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
      {slug ? <Text style={styles.accountOrgSlug}>{t('account.organization.slugPreview', { slug })}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        style={[styles.primaryButton, creating && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('account.organization.createButton')}</Text>
        )}
      </Pressable>
    </View>
  );
}
