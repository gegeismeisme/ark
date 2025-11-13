import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';

export type SummaryStat = {
  key: string;
  label: string;
  value: number;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

type HomeSummaryCardsProps = {
  stats: SummaryStat[];
};

export function HomeSummaryCards({ stats }: HomeSummaryCardsProps) {
  return (
    <View style={styles.homeSummaryGrid}>
      {stats.map((stat) => (
        <View key={stat.key} style={[styles.homeSummaryCard, { backgroundColor: stat.accent }]}>
          <View style={styles.homeSummaryRow}>
            <View style={styles.homeSummaryLabelRow}>
              <View style={styles.homeSummaryIconWrapper}>
                <Ionicons
                  name={stat.icon}
                  size={18}
                  color={stat.iconColor ?? '#0f172a'}
                />
              </View>
              <Text style={styles.homeSummaryLabel}>{stat.label}</Text>
            </View>
            <Text style={styles.homeSummaryValue}>{stat.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
