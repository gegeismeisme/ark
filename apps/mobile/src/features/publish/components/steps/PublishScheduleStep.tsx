import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';

import { t } from '../../../../i18n';
import { styles } from '../../../../styles/appStyles';
import {
  WEEKDAY_OPTIONS,
  type WeekdayKey,
  formatDateInput,
  formatTimeInput,
  isSameCalendarDay,
  parseDateLocal,
} from '../../scheduleUtils';

type PickerState =
  | null
  | {
      visible: true;
      mode: 'date' | 'time';
      value: Date;
      minimumDate?: Date;
      maximumDate?: Date;
      onConfirm: (date: Date) => void;
    };

type PublishScheduleStepProps = {
  scheduleType: 'one-time' | 'daily' | 'weekly';
  onChangeScheduleType: (type: 'one-time' | 'daily' | 'weekly') => void;
  dueAt: string;
  onChangeDueAt: (value: string) => void;
  onceWindowStart: string;
  onChangeOnceWindowStart: (value: string) => void;
  onceWindowEnd: string;
  onChangeOnceWindowEnd: (value: string) => void;
  dailyStartDate: string;
  onChangeDailyStartDate: (value: string) => void;
  dailyEndDate: string;
  onChangeDailyEndDate: (value: string) => void;
  dailyWindowStart: string;
  onChangeDailyWindowStart: (value: string) => void;
  dailyWindowEnd: string;
  onChangeDailyWindowEnd: (value: string) => void;
  weeklyStartDate: string;
  onChangeWeeklyStartDate: (value: string) => void;
  weeklyEndDate: string;
  onChangeWeeklyEndDate: (value: string) => void;
  weeklyWindowStart: string;
  onChangeWeeklyWindowStart: (value: string) => void;
  weeklyWindowEnd: string;
  onChangeWeeklyWindowEnd: (value: string) => void;
  weeklyDays: WeekdayKey[];
  onToggleWeekday: (day: WeekdayKey) => void;
  scheduleValid: boolean;
  scheduleError: string | null;
  schedulePreviewCount: number;
  maxOccurrences: number;
};

const getToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const ensureMinDate = (candidate: Date, minimum: Date) => (candidate.getTime() < minimum.getTime() ? minimum : candidate);

const ensureMaxDate = (candidate: Date, maximum?: Date) =>
  maximum && candidate.getTime() > maximum.getTime() ? maximum : candidate;

const isFutureTimeRequired = (baseDate: Date | null) => {
  if (!baseDate) return false;
  return isSameCalendarDay(baseDate, new Date());
};

const guardPastTime = (selected: Date, baseDate: Date | null) => {
  if (!baseDate || !isFutureTimeRequired(baseDate)) {
    return true;
  }
  const now = new Date();
  if (selected.getHours() < now.getHours()) return false;
  if (selected.getHours() === now.getHours() && selected.getMinutes() < now.getMinutes()) {
    return false;
  }
  return true;
};

const getBaseDate = (value: string) => parseDateLocal(value) ?? getToday();

export function PublishScheduleStep({
  scheduleType,
  onChangeScheduleType,
  dueAt,
  onChangeDueAt,
  onceWindowStart,
  onChangeOnceWindowStart,
  onceWindowEnd,
  onChangeOnceWindowEnd,
  dailyStartDate,
  onChangeDailyStartDate,
  dailyEndDate,
  onChangeDailyEndDate,
  dailyWindowStart,
  onChangeDailyWindowStart,
  dailyWindowEnd,
  onChangeDailyWindowEnd,
  weeklyStartDate,
  onChangeWeeklyStartDate,
  weeklyEndDate,
  onChangeWeeklyEndDate,
  weeklyWindowStart,
  onChangeWeeklyWindowStart,
  weeklyWindowEnd,
  onChangeWeeklyWindowEnd,
  weeklyDays,
  onToggleWeekday,
  scheduleValid,
  scheduleError,
  schedulePreviewCount,
  maxOccurrences,
}: PublishScheduleStepProps) {
  const [pickerState, setPickerState] = useState<PickerState>(null);

  const openPicker = (
    mode: 'date' | 'time',
    initialValue: Date,
    onConfirm: (date: Date) => void,
    options?: { minimumDate?: Date; maximumDate?: Date },
  ) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode,
        value: initialValue,
        minimumDate: options?.minimumDate,
        maximumDate: options?.maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onConfirm(date);
          }
        },
      });
      return;
    }
    setPickerState({
      visible: true,
      mode,
      value: initialValue,
      minimumDate: options?.minimumDate,
      maximumDate: options?.maximumDate,
      onConfirm,
    });
  };

  const handlePickDate = (
    currentValue: string,
    onConfirmString: (value: string) => void,
    options?: { minimumDate?: Date; maximumDate?: Date },
  ) => {
    const today = getToday();
    const effectiveMin = options?.minimumDate ? ensureMinDate(options.minimumDate, today) : today;
    const parsed = parseDateLocal(currentValue) ?? effectiveMin;
    openPicker(
      'date',
      ensureMaxDate(ensureMinDate(parsed, effectiveMin), options?.maximumDate),
      (picked) => {
        const normalized = formatDateInput(picked);
        onConfirmString(normalized);
      },
      { minimumDate: effectiveMin, maximumDate: options?.maximumDate },
    );
  };

  const handlePickTime = (
    currentValue: string,
    baseDateValue: string,
    onConfirmString: (value: string) => void,
    requireBase: boolean,
  ) => {
    if (requireBase && !baseDateValue.trim()) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.schedule.errors.dateRequired'));
      return;
    }
    const baseDate = baseDateValue.trim() ? parseDateLocal(baseDateValue) ?? getToday() : null;
    const initial = getBaseDate(baseDateValue);
    const [hours, minutes] = currentValue && currentValue.includes(':') ? currentValue.split(':').map(Number) : [9, 0];
    initial.setHours(hours ?? 9, minutes ?? 0, 0, 0);
    openPicker('time', initial, (picked) => {
      if (!guardPastTime(picked, baseDate)) {
        Alert.alert(t('app.publish.alertTitle'), t('app.publish.schedule.errors.windowOrder'));
        return;
      }
      onConfirmString(formatTimeInput(picked));
    });
  };

  const renderPickerModal = () => {
    if (!pickerState?.visible) return null;
    const close = () => setPickerState(null);
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <DateTimePicker
              mode={pickerState.mode}
              value={pickerState.value}
              minimumDate={pickerState.minimumDate}
              maximumDate={pickerState.maximumDate}
              display={pickerState.mode === 'date' ? 'calendar' : 'spinner'}
              onChange={(_, date) => {
                if (date) {
                  pickerState.onConfirm(date);
                  close();
                }
              }}
            />
            <Pressable style={styles.modalCloseButton} onPress={close}>
              <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPickerField = (
    label: string,
    value: string,
    placeholder: string,
    onPress: () => void,
    disabled?: boolean,
  ) => (
    <View style={styles.publishScheduleInlineItem}>
      <Text style={styles.formLabel}>{label}</Text>
      <Pressable
        style={[styles.publishPickerField, disabled && styles.publishPickerFieldDisabled]}
        onPress={onPress}
        disabled={Boolean(disabled)}
      >
        <Text style={value ? styles.publishPickerValue : styles.publishPickerPlaceholder}>
          {value || placeholder}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.publishStepCard}>
      <View style={styles.publishScheduleTabs}>
        {['one-time', 'daily', 'weekly'].map((type) => (
          <Pressable
            key={type}
            style={[styles.publishSchedulePill, scheduleType === type && styles.publishSchedulePillActive]}
            onPress={() => onChangeScheduleType(type as typeof scheduleType)}
          >
            <Text
              style={[styles.publishSchedulePillText, scheduleType === type && styles.publishSchedulePillTextActive]}
            >
              {type === 'one-time'
                ? t('app.publish.schedule.type.once')
                : type === 'daily'
                ? t('app.publish.schedule.type.daily')
                : t('app.publish.schedule.type.weekly')}
            </Text>
          </Pressable>
        ))}
      </View>

      {scheduleType === 'one-time' ? (
        <View style={styles.publishScheduleSection}>
          <Text style={styles.publishScheduleSectionTitle}>{t('app.publish.schedule.onceTitle')}</Text>
          {renderPickerField(
            t('app.publish.schedule.onceDate'),
            dueAt,
            t('app.publish.schedule.datePlaceholder'),
            () => handlePickDate(dueAt, onChangeDueAt),
          )}
          <Text style={styles.helperText}>{t('app.publish.schedule.dateHint')}</Text>
          <View style={styles.publishScheduleInline}>
            {renderPickerField(
              t('app.publish.schedule.windowStart'),
              onceWindowStart,
              t('app.publish.schedule.timePlaceholder'),
              () => handlePickTime(onceWindowStart, dueAt, onChangeOnceWindowStart, true),
            )}
            {renderPickerField(
              t('app.publish.schedule.windowEnd'),
              onceWindowEnd,
              t('app.publish.schedule.timePlaceholder'),
              () => handlePickTime(onceWindowEnd, dueAt, onChangeOnceWindowEnd, true),
            )}
          </View>
          <Text style={styles.helperText}>{t('app.publish.schedule.windowHint')}</Text>
        </View>
      ) : null}

      {scheduleType === 'daily' ? (
        <View style={styles.publishScheduleSection}>
          <Text style={styles.publishScheduleSectionTitle}>{t('app.publish.schedule.dailyTitle')}</Text>
          <View style={styles.publishScheduleInline}>
            {renderPickerField(
              t('app.publish.schedule.range'),
              dailyStartDate,
              t('app.publish.schedule.datePlaceholder'),
              () => handlePickDate(dailyStartDate, onChangeDailyStartDate),
            )}
            {renderPickerField(
              t('app.publish.schedule.endDatePlaceholder'),
              dailyEndDate,
              t('app.publish.schedule.endDatePlaceholder'),
              () => {
                const min = dailyStartDate.trim() ? parseDateLocal(dailyStartDate) ?? getToday() : getToday();
                handlePickDate(dailyEndDate, onChangeDailyEndDate, { minimumDate: min });
              },
            )}
          </View>
          <Text style={styles.helperText}>{t('app.publish.schedule.rangeHint')}</Text>
          <View style={styles.publishScheduleInline}>
            {renderPickerField(
              t('app.publish.schedule.windowStart'),
              dailyWindowStart,
              t('app.publish.schedule.timePlaceholder'),
              () => handlePickTime(dailyWindowStart, dailyStartDate, onChangeDailyWindowStart, true),
            )}
            {renderPickerField(
              t('app.publish.schedule.windowEnd'),
              dailyWindowEnd,
              t('app.publish.schedule.timePlaceholder'),
              () => handlePickTime(dailyWindowEnd, dailyStartDate, onChangeDailyWindowEnd, true),
            )}
          </View>
          <Text style={styles.helperText}>{t('app.publish.schedule.windowHint')}</Text>
        </View>
      ) : null}

      {scheduleType === 'weekly' ? (
        <View style={styles.publishScheduleSection}>
          <Text style={styles.publishScheduleSectionTitle}>{t('app.publish.schedule.weeklyTitle')}</Text>
          <Text style={styles.formLabel}>{t('app.publish.schedule.weeklyDays')}</Text>
          <View style={styles.publishWeekdayRow}>
            {WEEKDAY_OPTIONS.map((day) => {
              const active = weeklyDays.includes(day);
              return (
                <Pressable
                  key={day}
                  style={[styles.publishWeekdayPill, active && styles.publishWeekdayPillActive]}
                  onPress={() => onToggleWeekday(day)}
                >
                  <Text style={[styles.publishWeekdayPillText, active && styles.publishWeekdayPillTextActive]}>
                    {t(`app.publish.schedule.weekday.${day}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>{t('app.publish.schedule.weeklyDaysHint')}</Text>
          <View style={styles.publishScheduleInline}>
            {renderPickerField(
              t('app.publish.schedule.range'),
              weeklyStartDate,
              t('app.publish.schedule.datePlaceholder'),
              () => handlePickDate(weeklyStartDate, onChangeWeeklyStartDate),
            )}
            {renderPickerField(
              t('app.publish.schedule.endDatePlaceholder'),
              weeklyEndDate,
              t('app.publish.schedule.endDatePlaceholder'),
              () => {
                const min = weeklyStartDate.trim() ? parseDateLocal(weeklyStartDate) ?? getToday() : getToday();
                handlePickDate(weeklyEndDate, onChangeWeeklyEndDate, { minimumDate: min });
              },
            )}
          </View>
          <Text style={styles.helperText}>{t('app.publish.schedule.weeklyRangeHint')}</Text>
          <View style={styles.publishScheduleInline}>
            {renderPickerField(
              t('app.publish.schedule.windowStart'),
              weeklyWindowStart,
              t('app.publish.schedule.timePlaceholder'),
              () => handlePickTime(weeklyWindowStart, weeklyStartDate, onChangeWeeklyWindowStart, true),
            )}
            {renderPickerField(
              t('app.publish.schedule.windowEnd'),
              weeklyWindowEnd,
              t('app.publish.schedule.timePlaceholder'),
              () => handlePickTime(weeklyWindowEnd, weeklyStartDate, onChangeWeeklyWindowEnd, true),
            )}
          </View>
          <Text style={styles.helperText}>{t('app.publish.schedule.weeklyWindowHint')}</Text>
        </View>
      ) : null}

      <View style={styles.publishScheduleSummary}>
        <Text style={scheduleValid ? styles.publishScheduleSummaryText : styles.publishScheduleError}>
          {scheduleValid
            ? t('app.publish.schedule.preview', { count: schedulePreviewCount, max: maxOccurrences })
            : scheduleError ?? ''}
        </Text>
        <Text style={styles.publishScheduleSummaryHint}>
          {t('app.publish.schedule.limits', { max: maxOccurrences })}
        </Text>
      </View>
      {renderPickerModal()}
    </View>
  );
}
