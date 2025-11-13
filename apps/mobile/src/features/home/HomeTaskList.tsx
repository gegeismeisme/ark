import { FlatList, Text, View } from 'react-native';

import { formatDateTime } from '../../utils/formatters';
import type { Assignment } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type HomeTaskListProps = {
  assignments: Assignment[];
};

export function HomeTaskList({ assignments }: HomeTaskListProps) {
  const sorted = [...assignments].sort((a, b) => {
    const dueA = a.task?.dueAt ? Date.parse(a.task.dueAt) : Infinity;
    const dueB = b.task?.dueAt ? Date.parse(b.task.dueAt) : Infinity;
    if (dueA !== dueB) return dueA - dueB;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });

  const todayTasks = sorted.filter((assignment) => {
    const dueAt = assignment.task?.dueAt;
    if (!dueAt) return false;
    const dueDate = new Date(dueAt);
    const now = new Date();
    return (
      dueDate.getFullYear() === now.getFullYear() &&
      dueDate.getMonth() === now.getMonth() &&
      dueDate.getDate() === now.getDate()
    );
  });

  const list = todayTasks.length > 0 ? todayTasks : sorted.slice(0, 5);

  if (!list.length) {
    return <Text style={styles.homeEmptyTasks}>{t('home.tasks.empty')}</Text>;
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.homeTaskList}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.homeTaskCard}>
          <View style={styles.homeTaskMeta}>
            <Text style={styles.homeTaskMetaText}>{formatDateTime(item.task?.dueAt ?? null)}</Text>
            <Text style={styles.homeTaskStatus}>{t(`status.${item.status}`)}</Text>
          </View>
          <Text style={styles.homeTaskTitle}>{item.task?.title ?? t('task.list.placeholderTitle')}</Text>
          {item.task?.description ? (
            <Text style={styles.homeTaskDescription} numberOfLines={2}>
              {item.task.description}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}
