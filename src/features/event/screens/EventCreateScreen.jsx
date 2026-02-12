/**
 * 企画登録画面
 * 新規企画の登録を行う
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEvents } from '../hooks/useEvents';
import { Button, TextInput, RadioGroup, Checkbox } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  FESTIVAL_DATES,
  EVENT_START_TIME,
  EVENT_END_TIME,
} from '../../../shared/constants';
import { formatDateWithDay } from '../../../shared/utils/dateTime';
import { toHalfWidth } from '../../../shared/utils/validation';

/**
 * 企画登録画面コンポーネント
 * @returns {JSX.Element} 企画登録画面
 */
const EventCreateScreen = () => {
  const navigation = useNavigation();
  const { addEvent } = useEvents();

  /** 企画名 */
  const [name, setName] = useState('');
  /** 企画場所 */
  const [location, setLocation] = useState('');
  /** 企画タイプ */
  const [type, setType] = useState(EVENT_TYPES.TIME_SLOT);
  /** 1枠あたりの定員 */
  const [capacityPerSlot, setCapacityPerSlot] = useState('');
  /** 1枠あたりの時間（分） */
  const [slotDurationMinutes, setSlotDurationMinutes] = useState('');
  /** 1番号あたりの推定待ち時間（分） */
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState('');
  /** 選択された開催日（日付・開始時刻・終了時刻を含むオブジェクト配列） */
  const [selectedDates, setSelectedDates] = useState([]);
  // selectedDates: [{ date: '2024-11-02', startTime: '10:00', endTime: '19:00' }, ...]
  /** 送信中状態 */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** バリデーションエラー */
  const [errors, setErrors] = useState({});
  /** 登録完了モーダル表示状態 */
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  /** 登録済みデータ（モーダル表示用） */
  const [registeredData, setRegisteredData] = useState(null);

  /** 企画タイプの選択肢 */
  const typeOptions = [
    {
      label: EVENT_TYPE_LABELS[EVENT_TYPES.TIME_SLOT],
      value: EVENT_TYPES.TIME_SLOT,
      description: '時間枠ごとに定員を設定',
    },
    {
      label: EVENT_TYPE_LABELS[EVENT_TYPES.SEQUENTIAL],
      value: EVENT_TYPES.SEQUENTIAL,
      description: '空きが出次第、順番に案内',
    },
  ];

  /**
   * 開催日のチェック状態をトグル
   * @param {string} date - 日付文字列（YYYY-MM-DD形式）
   * @param {boolean} isChecked - チェック状態
   */
  const handleDateToggle = (date, isChecked) => {
    if (isChecked) {
      setSelectedDates([...selectedDates, {
        date,
        startTime: EVENT_START_TIME,
        endTime: EVENT_END_TIME,
      }]);
    } else {
      setSelectedDates(selectedDates.filter(d => d.date !== date));
    }
  };

  /**
   * 開催日の開始時刻を変更
   * @param {string} date - 日付文字列
   * @param {string} newStartTime - 新しい開始時刻
   */
  const handleStartTimeChange = (date, newStartTime) => {
    setSelectedDates(selectedDates.map(d =>
      d.date === date ? { ...d, startTime: newStartTime } : d
    ));
  };

  /**
   * 開催日の終了時刻を変更
   * @param {string} date - 日付文字列
   * @param {string} newEndTime - 新しい終了時刻
   */
  const handleEndTimeChange = (date, newEndTime) => {
    setSelectedDates(selectedDates.map(d =>
      d.date === date ? { ...d, endTime: newEndTime } : d
    ));
  };

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

    if (selectedDates.length === 0) {
      newErrors.dates = '開催日を1つ以上選択してください';
    }

    if (type === EVENT_TYPES.TIME_SLOT) {
      if (!capacityPerSlot || parseInt(capacityPerSlot, 10) <= 0) {
        newErrors.capacityPerSlot = '1以上の定員を入力してください';
      }
      if (!slotDurationMinutes || parseInt(slotDurationMinutes, 10) <= 0) {
        newErrors.slotDurationMinutes = '1以上の時間を入力してください';
      }
    }

    if (type === EVENT_TYPES.SEQUENTIAL) {
      if (!estimatedWaitMinutes || parseInt(estimatedWaitMinutes, 10) <= 0) {
        newErrors.estimatedWaitMinutes = '1以上の時間を入力してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 企画を登録
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

    const eventData = {
      name: name.trim(),
      location: location.trim(),
      type,
      capacityPerSlot: type === EVENT_TYPES.TIME_SLOT ? parseInt(capacityPerSlot, 10) : null,
      slotDurationMinutes: type === EVENT_TYPES.TIME_SLOT ? parseInt(slotDurationMinutes, 10) : null,
      estimatedWaitMinutes: type === EVENT_TYPES.SEQUENTIAL ? parseInt(estimatedWaitMinutes, 10) : null,
      dates: selectedDates, // [{ date, startTime, endTime }, ...]
    };

    const { success, error } = await addEvent(eventData);

    setIsSubmitting(false);

    if (success) {
      // 登録完了モーダルを表示
      setRegisteredData(eventData);
      setShowSuccessModal(true);
    } else {
      if (Platform.OS === 'web') {
        window.alert('企画の登録に失敗しました');
      } else {
        Alert.alert('エラー', '企画の登録に失敗しました');
      }
    }
  };

  /**
   * モーダルを閉じて一覧画面に戻る
   */
  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setRegisteredData(null);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <Text style={styles.title}>企画登録</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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

          <RadioGroup
            label="企画タイプ"
            options={typeOptions}
            value={type}
            onValueChange={setType}
          />

          {type === EVENT_TYPES.TIME_SLOT && (
            <>
              <TextInput
                label="1枠あたりの定員"
                value={capacityPerSlot}
                onChangeText={(val) => setCapacityPerSlot(toHalfWidth(val))}
                placeholder="例：20"
                keyboardType="numeric"
                error={errors.capacityPerSlot}
              />

              <TextInput
                label="1枠あたりの時間（分）"
                value={slotDurationMinutes}
                onChangeText={(val) => setSlotDurationMinutes(toHalfWidth(val))}
                placeholder="例：30"
                keyboardType="numeric"
                error={errors.slotDurationMinutes}
              />
            </>
          )}

          {type === EVENT_TYPES.SEQUENTIAL && (
            <TextInput
              label="1番号あたりの推定待ち時間（分）"
              value={estimatedWaitMinutes}
              onChangeText={(val) => setEstimatedWaitMinutes(toHalfWidth(val))}
              placeholder="例：5"
              keyboardType="numeric"
              error={errors.estimatedWaitMinutes}
            />
          )}

          <View style={styles.datesSection}>
            <Text style={styles.datesSectionTitle}>開催日</Text>
            {FESTIVAL_DATES.map((date) => {
              /** この日付が選択されているか */
              const isSelected = selectedDates.some(d => d.date === date);
              /** 選択されている場合の日付データ */
              const dateData = selectedDates.find(d => d.date === date);
              return (
                <View key={date} style={styles.dateRow}>
                  <Checkbox
                    label={formatDateWithDay(date)}
                    checked={isSelected}
                    onToggle={(checked) => handleDateToggle(date, checked)}
                  />
                  {isSelected && (
                    <View style={styles.timeInputRow}>
                      <TextInput
                        label="開始"
                        value={dateData.startTime}
                        onChangeText={(val) => handleStartTimeChange(date, toHalfWidth(val))}
                        placeholder="10:00"
                        style={styles.timeInput}
                      />
                      <Text style={styles.timeSeparator}>〜</Text>
                      <TextInput
                        label="終了"
                        value={dateData.endTime}
                        onChangeText={(val) => handleEndTimeChange(date, toHalfWidth(val))}
                        placeholder="19:00"
                        style={styles.timeInput}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          {errors.dates && <Text style={styles.errorText}>{errors.dates}</Text>}

          <View style={styles.buttonContainer}>
            <Button
              title="キャンセル"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              disabled={isSubmitting}
            />
            <Button
              title="登録"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 登録完了モーダル */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>登録完了</Text>
            <Text style={styles.modalSubtitle}>企画を登録しました</Text>

            {registeredData && (
              <View style={styles.registeredInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>企画名</Text>
                  <Text style={styles.infoValue}>{registeredData.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>場所</Text>
                  <Text style={styles.infoValue}>{registeredData.location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>タイプ</Text>
                  <Text style={styles.infoValue}>{EVENT_TYPE_LABELS[registeredData.type]}</Text>
                </View>
                {registeredData.type === EVENT_TYPES.TIME_SLOT && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>定員</Text>
                      <Text style={styles.infoValue}>{registeredData.capacityPerSlot}名/枠</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>時間</Text>
                      <Text style={styles.infoValue}>{registeredData.slotDurationMinutes}分/枠</Text>
                    </View>
                  </>
                )}
                {registeredData.type === EVENT_TYPES.SEQUENTIAL && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>推定待ち時間</Text>
                    <Text style={styles.infoValue}>{registeredData.estimatedWaitMinutes}分/番号</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>開催日</Text>
                  <Text style={styles.infoValue}>
                    {registeredData.dates.map(d =>
                      `${formatDateWithDay(d.date)} ${d.startTime}〜${d.endTime}`
                    ).join('\n')}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalButton} onPress={handleCloseModal}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
  },
  datesSection: {
    marginBottom: SPACING.MD,
  },
  datesSectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.SM,
  },
  dateRow: {
    marginBottom: SPACING.SM,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    marginLeft: SPACING.LG + SPACING.SM,
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
  },
  timeSeparator: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    marginHorizontal: SPACING.SM,
  },
  errorText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.ERROR,
    marginTop: -SPACING.SM,
    marginBottom: SPACING.MD,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 16,
    padding: SPACING.LG,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.SUCCESS,
    marginBottom: SPACING.XS,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
  },
  registeredInfo: {
    width: '100%',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  infoLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  infoValue: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.SM,
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM + 4,
    paddingHorizontal: SPACING.XL,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.CARD_BACKGROUND,
  },
});

export default EventCreateScreen;
