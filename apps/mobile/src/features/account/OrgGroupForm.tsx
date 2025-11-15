import { useState, useEffect } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type OrgGroupFormProps = {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string }) => Promise<void>;
};

export function OrgGroupForm({ visible, saving, onClose, onSubmit }: OrgGroupFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName('');
      setDescription('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('account.organization.groupNameRequired'));
      return;
    }
    if (name.trim().length > 24) {
      setError(t('account.organization.groupNameTooLong'));
      return;
    }
    setError(null);
    await onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.orgCreateOverlay}>
        <View style={styles.orgCreateSheet}>
          <View style={styles.orgCreateHeader}>
            <Text style={styles.orgCreateTitle}>{t('account.organization.groupFormTitle')}</Text>
            <Pressable style={styles.orgCreateClose} onPress={onClose}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>
          <Text style={styles.orgImmutableHint}>{t('account.organization.groupFormHint')}</Text>
          <TextInput
            style={styles.accountInput}
            value={name}
            onChangeText={setName}
            placeholder={t('account.organization.groupNamePlaceholder')}
            maxLength={32}
          />
          <TextInput
            style={[styles.accountInput, { height: 100, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('account.organization.groupDescriptionPlaceholder')}
            multiline
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryButtonText}>{t('account.organization.groupFormSubmit')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
