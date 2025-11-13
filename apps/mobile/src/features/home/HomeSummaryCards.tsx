import { Text, View } from 'react-native';

import { styles } from '../../styles/appStyles';

export type SummaryStat = {
  key: string;
  label: string;
  value: number;
  accent: string;
  icon: string;
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
              <Text style={styles.homeSummaryIcon}>{stat.icon}</Text>
              <Text style={styles.homeSummaryLabel}>{stat.label}</Text>
            </View>
            <Text style={styles.homeSummaryValue}>{stat.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
