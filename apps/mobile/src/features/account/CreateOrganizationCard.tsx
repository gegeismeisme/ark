import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { EditOrganizationCard } from './EditOrganizationCard';

type CreateOrganizationCardProps = {
  creating: boolean;
  onCreate: (payload: {
    name: string;
    description: string;
    displayName: string;
    visibility: 'public' | 'private';
  }) => Promise<boolean>;
  canCreate: boolean;
  disabledReason?: string | null;
};

export function CreateOrganizationCard({ creating, onCreate, canCreate, disabledReason }: CreateOrganizationCardProps) {
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    displayName: '',
    visibility: 'public' as 'public' | 'private',
  });
  const [error, setError] = useState<string | null>(null);

  const resetForm = () =>
    setFormValues({
      name: '',
      description: '',
      displayName: '',
      visibility: 'public',
    });

  const handleCreate = async (payload: {
    name: string;
    description: string;
    displayName: string;
    visibility: 'public' | 'private';
  }) => {
    if (!payload.name || !payload.displayName) {
      setError(t('account.organization.errorMissing'));
      return;
    }
    setError(null);
    const success = await onCreate(payload);
    if (success) {
      resetForm();
    }
  };

  const disabledMessage = useMemo(
    () => disabledReason ?? t('account.organization.upgradeHint', { limit: 1 }),
    [disabledReason],
  );

  if (!canCreate) {
    return (
      <View style={styles.accountOrgCard}>
        <Text style={styles.accountOrgCardTitle}>{t('account.organization.title')}</Text>
        <Text style={styles.accountOrgCardMeta}>{disabledMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <EditOrganizationCard
        initialName={formValues.name}
        initialDescription={formValues.description}
        initialDisplayName={formValues.displayName}
        initialVisibility={formValues.visibility}
        saving={creating}
        onSave={handleCreate}
        ctaLabel={t('account.organization.createButton')}
        errorMessage={error}
      />
    </View>
  );
}
