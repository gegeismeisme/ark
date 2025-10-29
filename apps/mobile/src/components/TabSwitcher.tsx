import type { Dispatch, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { TabKey } from '../types';
import { styles } from '../styles/appStyles';

type TabSwitcherProps = {
  activeTab: TabKey;
  setActiveTab: Dispatch<SetStateAction<TabKey>>;
};

export function TabSwitcher({ activeTab, setActiveTab }: TabSwitcherProps) {
  return (
    <View style={styles.tabRow}>
      <Pressable
        style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
        onPress={() => setActiveTab('tasks')}
      >
        <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>
          我的任务
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tabButton, activeTab === 'invites' && styles.tabButtonActive]}
        onPress={() => setActiveTab('invites')}
      >
        <Text style={[styles.tabLabel, activeTab === 'invites' && styles.tabLabelActive]}>
          邀请与申请
        </Text>
      </Pressable>
    </View>
  );
}
