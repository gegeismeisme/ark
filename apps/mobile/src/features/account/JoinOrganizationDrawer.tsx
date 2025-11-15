import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type JoinOrganizationDrawerProps = {
  visible: boolean;
  code: string;
  onChangeCode: (value: string) => void;
  loading: boolean;
  message: string | null;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
};

export function JoinOrganizationDrawer({
  visible,
  code,
  onChangeCode,
  loading,
  message,
  error,
  onSubmit,
  onClose,
}: JoinOrganizationDrawerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.orgCreateOverlay}>
        <View style={styles.orgCreateSheet}>
          <View style={styles.orgCreateHeader}>
            <Text style={styles.orgCreateTitle}>{t('account.join.drawerTitle')}</Text>
            <Pressable style={styles.orgCreateClose} onPress={onClose}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>
          <Text style={styles.orgImmutableHint}>{t('account.join.drawerSubtitle')}</Text>
          <TextInput
            style={styles.accountInput}
            value={code}
            onChangeText={onChangeCode}
            placeholder={t('account.join.codePlaceholder')}
            autoCapitalize="characters"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{t('account.join.submit')}</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.accountOrgHint}>{t('account.join.drawerHint')}</Text>
        </View>
      </View>
    </Modal>
  );
}
