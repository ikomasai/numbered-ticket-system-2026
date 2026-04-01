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
  ActivityIndicator,
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
} from '../../../shared/constants';
import { useSettings } from '../../../shared/contexts/SettingsContext';
import { formatDateWithDay } from '../../../shared/utils/dateTime';
import { toHalfWidth } from '../../../shared/utils/validation';

/**
 * 企画登録画面コンポーネント
 * @returns {JSX.Element} 企画登録画面
 */
const EventCreateScreen = () => {
  const navigation = useNavigation();
  const { addEvent } = useEvents();
  const { festivalDates, eventStartTime, eventEndTime, isLoading: isSettingsLoading } = useSettings();

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
  /** 1グループあたりの推定待ち時間（分） */
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
        startTime: eventStartTime,
        endTime: eventEndTime,
      }]);
    } else {
      setSelectedDates(selectedDates.filter(d => d.date !== date));
    }
  };

  /**
   * HH:MM文字列から時・分を取得
   * @param {string} timeStr - HH:MM形式の時刻文字列
   * @returns {{ hour: string, minute: string }} 時と分
   */
  const parseTimeParts = (timeStr) => {
    const parts = (timeStr || '').split(':');
    return {
      hour: parts[0] || '',
      /** 分はそのまま返す（編集中にパディングすると削除できなくなるため） */
      minute: parts[1] !== undefined ? parts[1] : '',
    };
  };

  /**
   * HH:MM文字列を正規化する（送信前に使用）
   * 空欄の項目はデフォルト時刻の対応する値で補完する
   * @param {string} timeStr - 編集中のHH:MM形式（例："9:"）
   * @param {string} defaultTime - 空欄時のフォールバック（例："10:00"）
   * @returns {string} 正規化後（例："09:00"）
   */
  const normalizeTime = (timeStr, defaultTime) => {
    const parts = (timeStr || '').split(':');
    const defaultParts = (defaultTime || '10:00').split(':');
    /** 時：空欄ならデフォルトの時を使用 */
    const hour = (parts[0] || '').trim() !== '' ? parts[0] : defaultParts[0];
    /** 分：空欄ならデフォルトの分を使用 */
    const minuteRaw = parts[1] !== undefined ? parts[1] : '';
    const minute = minuteRaw.trim() !== '' ? minuteRaw : (defaultParts[1] || '0');
    return `${hour}:${String(parseInt(minute, 10)).padStart(2, '0')}`;
  };

  /**
   * 開催日の時刻（時・分）を変更し、HH:MM形式で保存
   * @param {string} date - 日付文字列
   * @param {'start'|'end'} field - 開始・終了の区別
   * @param {'hour'|'minute'} part - 時・分の区別
   * @param {string} value - 入力値（数字のみ）
   */
  const handleTimePartChange = (date, field, part, value) => {
    /** 数字のみ抽出 */
    const numericValue = toHalfWidth(value).replace(/[^0-9]/g, '');
    setSelectedDates(selectedDates.map(d => {
      if (d.date !== date) return d;
      const currentTime = field === 'start' ? d.startTime : d.endTime;
      const parts = parseTimeParts(currentTime);
      if (part === 'hour') {
        parts.hour = numericValue;
      } else {
        parts.minute = numericValue;
      }
      const newTime = `${parts.hour}:${parts.minute}`;
      return field === 'start' ? { ...d, startTime: newTime } : { ...d, endTime: newTime };
    }));
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
      /** 送信前に正規化：空欄はデフォルト設定の時刻で補完 */
      dates: selectedDates.map(d => ({
        ...d,
        startTime: normalizeTime(d.startTime, eventStartTime),
        endTime: normalizeTime(d.endTime, eventEndTime),
      })),
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
                onChangeText={(val) => setCapacityPerSlot(toHalfWidth(val).replace(/[^0-9]/g, ''))}
                placeholder="例：20"
                keyboardType="numeric"
                error={errors.capacityPerSlot}
              />

              <TextInput
                label="1枠あたりの時間（分）"
                value={slotDurationMinutes}
                onChangeText={(val) => setSlotDurationMinutes(toHalfWidth(val).replace(/[^0-9]/g, ''))}
                placeholder="例：30"
                keyboardType="numeric"
                error={errors.slotDurationMinutes}
              />
            </>
          )}

          {type === EVENT_TYPES.SEQUENTIAL && (
            <TextInput
              label="1グループあたりの推定待ち時間（分）"
              value={estimatedWaitMinutes}
              onChangeText={(val) => setEstimatedWaitMinutes(toHalfWidth(val).replace(/[^0-9]/g, ''))}
              placeholder="例：5"
              keyboardType="numeric"
              error={errors.estimatedWaitMinutes}
            />
          )}

          <View style={styles.datesSection}>
            <Text style={styles.datesSectionTitle}>開催日</Text>
            {isSettingsLoading ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginVertical: SPACING.SM }} />
            ) : (
              festivalDates.map((date) => {
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
                        <Text style={styles.timeLabel}>開始</Text>
                        <TextInput
                          value={parseTimeParts(dateData.startTime).hour}
                          onChangeText={(val) => handleTimePartChange(date, 'start', 'hour', val)}
                          placeholder="10"
                          keyboardType="numeric"
                          style={styles.timePartInput}
                        />
                        <Text style={styles.timeColon}>：</Text>
                        <TextInput
                          value={parseTimeParts(dateData.startTime).minute}
                          onChangeText={(val) => handleTimePartChange(date, 'start', 'minute', val)}
                          placeholder="00"
                          keyboardType="numeric"
                          style={styles.timePartInput}
                        />
                        <Text style={styles.timeSeparator}>〜</Text>
                        <Text style={styles.timeLabel}>終了</Text>
                        <TextInput
                          value={parseTimeParts(dateData.endTime).hour}
                          onChangeText={(val) => handleTimePartChange(date, 'end', 'hour', val)}
                          placeholder="19"
                          keyboardType="numeric"
                          style={styles.timePartInput}
                        />
                        <Text style={styles.timeColon}>：</Text>
                        <TextInput
                          value={parseTimeParts(dateData.endTime).minute}
                          onChangeText={(val) => handleTimePartChange(date, 'end', 'minute', val)}
                          placeholder="00"
                          keyboardType="numeric"
                          style={styles.timePartInput}
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}
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
    flexWrap: 'wrap',
  },
  timeLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.XS,
  },
  timePartInput: {
    width: 56,
    marginBottom: 0,
  },
  timeColon: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    marginHorizontal: 2,
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
