import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import type { Profile } from '../profile/useProfile';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { CreateOrganizationCard } from './CreateOrganizationCard';

const ACCOUNT_MENU_ITEMS = [
  { key: 'account', icon: '👤', labelKey: 'account.menu.account' },
  { key: 'notifications', icon: '🔔', labelKey: 'account.menu.notification' },
  { key: 'transactions', icon: '🧾', labelKey: 'account.menu.transaction' },
  { key: 'about', icon: 'ℹ️', labelKey: 'account.menu.about' },
];

type AccountScreenProps = {
  profile: Profile | null;
  session: Session;
  onUpdateName: (name: string) => Promise<boolean>;
  onSignOut: () => void;
  signOutLoading: boolean;
  organization: ActiveOrganization | null;
  onCreateOrganization: (payload: { name: string; description: string; displayName: string }) => Promise<boolean>;
  creatingOrganization: boolean;
};

export function AccountScreen({
  profile,
  session,
  onUpdateName,
  onSignOut,
  signOutLoading,
  organization,
  onCreateOrganization,
  creatingOrganization,
}: AccountScreenProps) {
  const displayName = profile?.fullName ?? session.user.email ?? session.user.id;
  const joined = profile?.createdAt ?? session.user.created_at ?? null;
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const tapRef = useRef(0);

  const handleNamePress = () => {
    const now = Date.now();
    if (now - tapRef.current < 300) {
      setEditing(true);
      setNameDraft(displayName);
    }
    tapRef.current = now;
  };

  const handleSaveName = async () => {
    if (!nameDraft.trim() || savingName) return;
    setSavingName(true);
    const success = await onUpdateName(nameDraft.trim());
    setSavingName(false);
    if (success) {
      setEditing(false);
    }
  };

  return (
    <View style={styles.accountScreen}>
      <View style={styles.accountHeader}>
        <Pressable style={styles.accountAvatar} onPress={handleNamePress}>
          <Text style={styles.accountAvatarInitial}>{displayName.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
        <View style={styles.accountHeaderText}>
          {editing ? (
            <View style={styles.accountNameEditRow}>
              <TextInput
                style={styles.accountNameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
              />
              <Pressable style={styles.accountSaveButton} onPress={handleSaveName} disabled={savingName}>
                {savingName ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.accountSaveButtonText}>{t('account.actions.save')}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleNamePress}>
              <Text style={styles.accountName}>{displayName}</Text>
              <Text style={styles.accountNameHint}>{t('account.actions.doubleTap')}</Text>
            </Pressable>
          )}
          {joined ? (
            <Text style={styles.accountJoined}>
              {t('account.joined', { time: new Date(joined).toLocaleDateString() })}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.accountMenu}>
        {ACCOUNT_MENU_ITEMS.map((item) => (
          <View key={item.key} style={styles.accountMenuItem}>
            <View style={styles.accountMenuIcon}>
              <Text>{item.icon}</Text>
            </View>
            <Text style={styles.accountMenuLabel}>{t(item.labelKey)}</Text>
            <Text style={styles.accountMenuChevron}>›</Text>
          </View>
        ))}
      </View>

      <CreateOrganizationCard
        organization={organization}
        onCreate={onCreateOrganization}
        creating={creatingOrganization}
      />

      <Pressable
        style={[styles.signOutButton, signOutLoading && styles.buttonDisabled]}
        onPress={onSignOut}
        disabled={signOutLoading}
      >
        {signOutLoading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.signOutButtonText}>{t('session.signOut')}</Text>
        )}
      </Pressable>
    </View>
  );
}
