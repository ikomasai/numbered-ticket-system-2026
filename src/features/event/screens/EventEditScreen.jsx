/**
 * 企画編集画面
 * 既存企画の編集を行う
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEvent, useEvents } from '../hooks/useEvents';
import { Button, TextInput, Select } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../shared/constants';
import { formatDateWithDay, formatTimeSlotDisplay } from '../../../shared/utils/dateTime';

/**
 * 企画編集画面コンポーネント
 * @returns {JSX.Element} 企画編集画面
 */
const EventEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params;

  const { event, isLoading, error, fetchEvent } = useEvent(eventId);
  const { editEvent, changeEventDateStatus, changeTimeSlotStatus } = useEvents();

  /** 企画名 */
  const [name, setName] = useState('');
  /** 企画場所 */
  const [location, setLocation] = useState('');
  /** 1番号あたりの推定待ち時間（分） */
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState('');
  /** 送信中状態 */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** ステータス更新中状態 */
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  /** バリデーションエラー */
  const [errors, setErrors] = useState({});

  /** ステータス選択肢 */
  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  // 企画データが読み込まれたらフォームに反映
  useEffect(() => {
    if (event) {
      setName(event.name);
      setLocation(event.location);
      if (event.estimated_wait_minutes) {
        setEstimatedWaitMinutes(String(event.estimated_wait_minutes));
      }
    }
  }, [event]);

  /**
   * バリデーション
   * @returns {boolean} バリデーション結果
   */
  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = '企画名を入力してください';
    }

    if (!location.trim()) {
      newErrors.location = '企画場所を入力してください';
    }

    if (event?.type === EVENT_TYPES.SEQUENTIAL) {
      if (!estimatedWaitMinutes || parseInt(estimatedWaitMinutes, 10) <= 0) {
        newErrors.estimatedWaitMinutes = '1以上の時間を入力してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 企画を更新
   */
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    // 二重送信防止
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const updateData = {
      name: name.trim(),
      location: location.trim(),
    };

    if (event?.type === EVENT_TYPES.SEQUENTIAL) {
      updateData.estimatedWaitMinutes = parseInt(estimatedWaitMinutes, 10);
    }

    const { success } = await editEvent(eventId, updateData);

    setIsSubmitting(false);

    if (success) {
      if (Platform.OS === 'web') {
        window.alert('企画を更新しました');
        navigation.goBack();
      } else {
        Alert.alert('更新完了', '企画を更新しました', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert('企画の更新に失敗しました');
      } else {
        Alert.alert('エラー', '企画の更新に失敗しました');
      }
    }
  };

  /**
   * 開催日のステータスを変更
   * 時間枠定員制の場合、満員・発券停止中以外の時間枠も一括で変更
   * @param {string} eventDateId - 企画開催日ID
   * @param {string} newStatus - 新しいステータス
   */
  const handleDateStatusChange = async (eventDateId, newStatus) => {
    setIsUpdatingStatus(true);

    try {
      const { success } = await changeEventDateStatus(eventDateId, newStatus);
      if (!success) {
        if (Platform.OS === 'web') {
          window.alert('ステータスの更新に失敗しました');
        } else {
          Alert.alert('エラー', 'ステータスの更新に失敗しました');
        }
        return;
      }

      // 時間枠定員制の場合、該当日の時間枠ステータスも一括更新
      if (event?.type === EVENT_TYPES.TIME_SLOT) {
        const targetDate = event.event_dates?.find(d => d.id === eventDateId);
        if (targetDate?.time_slots) {
          // 満員・発券停止中以外の時間枠を更新
          const updatePromises = targetDate.time_slots
            .filter(slot => slot.status !== STATUS.FULL && slot.status !== STATUS.PAUSED)
            .map(slot => changeTimeSlotStatus(slot.id, newStatus));

          await Promise.all(updatePromises);
        }
      }

      await fetchEvent();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  /**
   * 時間枠のステータスを変更
   * @param {string} timeSlotId - 時間枠ID
   * @param {string} newStatus - 新しいステータス
   */
  const handleTimeSlotStatusChange = async (timeSlotId, newStatus) => {
    setIsUpdatingStatus(true);

    try {
      const { success } = await changeTimeSlotStatus(timeSlotId, newStatus);
      if (success) {
        await fetchEvent();
      } else {
        if (Platform.OS === 'web') {
          window.alert('ステータスの更新に失敗しました');
        } else {
          Alert.alert('エラー', 'ステータスの更新に失敗しました');
        }
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ローディング中
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // エラー時
  if (error || !event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>データの取得に失敗しました</Text>
        <Button title="戻る" onPress={() => navigation.goBack()} style={styles.backButton} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <Text style={styles.title}>企画編集</Text>
          <Text style={styles.subtitle}>{EVENT_TYPE_LABELS[event.type]}</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* 上部：企画情報と開催日ステータスを横並び */}
          <View style={styles.topRow}>
            {/* 左側：企画情報入力 */}
            <View style={styles.leftColumn}>
              <TextInput
                label="企画名"
                value={name}
                onChangeText={setName}
                placeholder="例：お化け屋敷"
                error={errors.name}
              />

              <TextInput
                label="企画場所"
                value={location}
                onChangeText={setLocation}
                placeholder="例：1号館3階 301教室"
                error={errors.location}
              />

              {event.type === EVENT_TYPES.SEQUENTIAL && (
                <TextInput
                  label="1番号あたりの推定待ち時間（分）"
                  value={estimatedWaitMinutes}
                  onChangeText={setEstimatedWaitMinutes}
                  placeholder="例：5"
                  keyboardType="numeric"
                  error={errors.estimatedWaitMinutes}
                />
              )}
            </View>

            {/* 右側：開催日ステータス */}
            <View style={styles.rightColumn}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>開催日ステータス</Text>
                {event.event_dates?.map((dateItem) => (
                  <View key={dateItem.id} style={styles.dateStatusItem}>
                    <View style={styles.dateLabelContainer}>
                      <Text style={styles.dateLabel}>{formatDateWithDay(dateItem.date)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[dateItem.status] }]}>
                        <Text style={styles.statusBadgeText}>{STATUS_LABELS[dateItem.status]}</Text>
                      </View>
                    </View>
                    <Select
                      value={dateItem.status}
                      onValueChange={(newStatus) => handleDateStatusChange(dateItem.id, newStatus)}
                      options={statusOptions}
                      style={styles.dateStatusSelect}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 時間枠定員制の場合は時間枠ごとのステータス管理 */}
          {event.type === EVENT_TYPES.TIME_SLOT && event.event_dates?.map((dateItem) => (
            <View key={`slots-${dateItem.id}`} style={styles.timeSlotsSection}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>
                  {formatDateWithDay(dateItem.date)} - 時間枠ステータス
                </Text>
                <View style={[styles.statusBadgeSmall, { backgroundColor: STATUS_COLORS[dateItem.status] }]}>
                  <Text style={styles.statusBadgeTextSmall}>{STATUS_LABELS[dateItem.status]}</Text>
                </View>
              </View>
              <View style={styles.timeSlotsGrid}>
                {/* 左列 */}
                <View style={styles.timeSlotsColumn}>
                  {dateItem.time_slots?.slice(0, Math.ceil(dateItem.time_slots.length / 2)).map((slot) => (
                    <View key={slot.id} style={styles.slotCard}>
                      <View style={styles.slotLeft}>
                        <View style={styles.slotHeader}>
                          <Text style={styles.slotTime}>
                            {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                          </Text>
                          <View style={[styles.slotStatusBadge, { backgroundColor: STATUS_COLORS[slot.status] }]}>
                            <Text style={styles.slotStatusBadgeText}>{STATUS_LABELS[slot.status]}</Text>
                          </View>
                        </View>
                        <Text style={styles.slotCount}>
                          {slot.current_count}/{event.capacity_per_slot}名
                        </Text>
                      </View>
                      <View style={styles.slotRight}>
                        <Select
                          label="ステータス変更"
                          value={slot.status}
                          onValueChange={(newStatus) => handleTimeSlotStatusChange(slot.id, newStatus)}
                          options={statusOptions}
                          style={styles.statusSelect}
                        />
                      </View>
                    </View>
                  ))}
                </View>
                {/* 右列 */}
                <View style={styles.timeSlotsColumn}>
                  {dateItem.time_slots?.slice(Math.ceil(dateItem.time_slots.length / 2)).map((slot) => (
                    <View key={slot.id} style={styles.slotCard}>
                      <View style={styles.slotLeft}>
                        <View style={styles.slotHeader}>
                          <Text style={styles.slotTime}>
                            {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                          </Text>
                          <View style={[styles.slotStatusBadge, { backgroundColor: STATUS_COLORS[slot.status] }]}>
                            <Text style={styles.slotStatusBadgeText}>{STATUS_LABELS[slot.status]}</Text>
                          </View>
                        </View>
                        <Text style={styles.slotCount}>
                          {slot.current_count}/{event.capacity_per_slot}名
                        </Text>
                      </View>
                      <View style={styles.slotRight}>
                        <Select
                          label="ステータス変更"
                          value={slot.status}
                          onValueChange={(newStatus) => handleTimeSlotStatusChange(slot.id, newStatus)}
                          options={statusOptions}
                          style={styles.statusSelect}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}

          <View style={styles.buttonContainer}>
            <Button
              title="キャンセル"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            />
            <Button
              title="更新"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ステータス更新中のオーバーレイ */}
      {isUpdatingStatus && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingOverlayText}>ステータスを更新中...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    padding: SPACING.MD,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
  },
  topRow: {
    flexDirection: 'row',
    gap: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  rightColumn: {
    flex: 1,
  },
  section: {
    marginTop: 0,
    marginBottom: 0,
    padding: SPACING.MD,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 8,
  },
  timeSlotsSection: {
    marginTop: SPACING.MD,
    marginBottom: 0,
    padding: SPACING.MD,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.MD,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  dateStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  dateLabelContainer: {
    flexShrink: 0,
  },
  dateStatusSelect: {
    width: 160,
    marginBottom: 0,
  },
  dateLabel: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeTextSmall: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    gap: 28,
    width: '95%',
    alignSelf: 'center',
  },
  timeSlotsColumn: {
    flex: 1,
  },
  slotCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.MD,
  },
  slotLeft: {
    flexShrink: 0,
  },
  slotRight: {
    width: 180,
    flexShrink: 0,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  slotTime: {
    fontSize: FONT_SIZES.XL,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  slotCount: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
  },
  slotStatusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 4,
  },
  slotStatusBadgeText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  statusSelect: {
    marginBottom: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.LG,
    marginBottom: SPACING.XL,
  },
  cancelButton: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  submitButton: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.MD,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.ERROR,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  backButton: {
    minWidth: 150,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.LG,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingOverlayText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
  },
});

export default EventEditScreen;
