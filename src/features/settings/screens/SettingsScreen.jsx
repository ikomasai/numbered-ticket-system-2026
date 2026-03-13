/**
 * デフォルト設定画面
 * 企画年・日程・時間・閾値などのシステム設定を表示・編集する
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSettings } from '../../../shared/contexts/SettingsContext';
import { Button, TextInput, RadioGroup } from '../../../shared/components';
import { COLORS, FONT_SIZES, SPACING } from '../../../shared/constants';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { toHalfWidth } from '../../../shared/utils/validation';

/**
 * 半角数字のみを許可するフィルタ
 * @param {string} text - 入力テキスト
 * @returns {string} 半角数字のみのテキスト
 */
const filterNumeric = (text) => {
  /** 全角→半角変換してから数字以外を除去 */
  const halfWidth = toHalfWidth(text);
  return halfWidth.replace(/[^0-9]/g, '');
};

/**
 * デフォルト設定画面コンポーネント
 * @returns {JSX.Element} 設定画面
 */
const SettingsScreen = () => {
  const { rawSettings, isLoading, saveSettings, fetchSettings } = useSettings();
  const { isMobile } = useResponsive();

  /** 企画年モード（auto / manual） */
  const [yearMode, setYearMode] = useState('auto');
  /** 企画年（手動モード時） */
  const [year, setYear] = useState('');
  /** 企画開始月 */
  const [startMonth, setStartMonth] = useState('');
  /** 企画開始日 */
  const [startDay, setStartDay] = useState('');
  /** 企画終了月 */
  const [endMonth, setEndMonth] = useState('');
  /** 企画終了日 */
  const [endDay, setEndDay] = useState('');
  /** 開始時間（時） */
  const [startHour, setStartHour] = useState('');
  /** 開始時間（分） */
  const [startMinute, setStartMinute] = useState('');
  /** 終了時間（時） */
  const [endHour, setEndHour] = useState('');
  /** 終了時間（分） */
  const [endMinute, setEndMinute] = useState('');
  /** 閾値：低 */
  const [thresholdLow, setThresholdLow] = useState('');
  /** 閾値：中 */
  const [thresholdMedium, setThresholdMedium] = useState('');
  /** 閾値：高 */
  const [thresholdHigh, setThresholdHigh] = useState('');
  /** 閾値：非常に高 */
  const [thresholdVeryHigh, setThresholdVeryHigh] = useState('');
  /** 保存中フラグ */
  const [isSaving, setIsSaving] = useState(false);
  /** バリデーションエラー */
  const [errors, setErrors] = useState({});
  /** 保存成功メッセージ表示フラグ */
  const [showSuccess, setShowSuccess] = useState(false);

  /**
   * DB設定値をローカルstateに反映
   */
  useEffect(() => {
    if (rawSettings) {
      setYearMode(rawSettings.festival_year_mode || 'auto');
      setYear(rawSettings.festival_year || '');
      setStartMonth(rawSettings.festival_start_month || '');
      setStartDay(rawSettings.festival_start_day || '');
      setEndMonth(rawSettings.festival_end_month || '');
      setEndDay(rawSettings.festival_end_day || '');
      setStartHour(rawSettings.event_start_hour || '');
      /** 分は2桁表示（例: '0' → '00'） */
      setStartMinute(rawSettings.event_start_minute ? String(parseInt(rawSettings.event_start_minute, 10)).padStart(2, '0') : '');
      setEndHour(rawSettings.event_end_hour || '');
      setEndMinute(rawSettings.event_end_minute ? String(parseInt(rawSettings.event_end_minute, 10)).padStart(2, '0') : '');
      setThresholdLow(rawSettings.slot_threshold_low || '');
      setThresholdMedium(rawSettings.slot_threshold_medium || '');
      setThresholdHigh(rawSettings.slot_threshold_high || '');
      setThresholdVeryHigh(rawSettings.slot_threshold_very_high || '');
    }
  }, [rawSettings]);

  /**
   * 数値の範囲バリデーション（入力がある場合のみチェック）
   * @param {string} value - 入力値
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @returns {string|null} エラーメッセージ（問題なければnull）
   */
  const validateRange = (value, min, max) => {
    if (value === '') return null; // 空欄はスキップ（DB値を維持）
    const num = parseInt(value, 10);
    if (isNaN(num) || num < min || num > max) {
      return `${min}〜${max}の範囲で入力してください`;
    }
    return null;
  };

  /**
   * 入力がある項目のみバリデーション
   * 空欄の項目はDB上の現在値を維持するためスキップ
   * @returns {boolean} バリデーション成功ならtrue
   */
  const validate = () => {
    const newErrors = {};

    /** 企画年（手動モード時かつ入力がある場合のみ） */
    if (yearMode === 'manual' && year !== '') {
      const yearErr = validateRange(year, 2020, 2100);
      if (yearErr) newErrors.year = yearErr;
    }

    /** 日付項目（入力がある場合のみ） */
    const sMonthErr = validateRange(startMonth, 1, 12);
    if (sMonthErr) newErrors.startMonth = sMonthErr;
    const sDayErr = validateRange(startDay, 1, 31);
    if (sDayErr) newErrors.startDay = sDayErr;
    const eMonthErr = validateRange(endMonth, 1, 12);
    if (eMonthErr) newErrors.endMonth = eMonthErr;
    const eDayErr = validateRange(endDay, 1, 31);
    if (eDayErr) newErrors.endDay = eDayErr;

    /** 時間項目（入力がある場合のみ） */
    const sHourErr = validateRange(startHour, 0, 23);
    if (sHourErr) newErrors.startHour = sHourErr;
    const sMinErr = validateRange(startMinute, 0, 59);
    if (sMinErr) newErrors.startMinute = sMinErr;
    const eHourErr = validateRange(endHour, 0, 23);
    if (eHourErr) newErrors.endHour = eHourErr;
    const eMinErr = validateRange(endMinute, 0, 59);
    if (eMinErr) newErrors.endMinute = eMinErr;

    /** 閾値項目（入力がある場合のみ） */
    const tLowErr = validateRange(thresholdLow, 0, 100);
    if (tLowErr) newErrors.thresholdLow = tLowErr;
    const tMedErr = validateRange(thresholdMedium, 0, 100);
    if (tMedErr) newErrors.thresholdMedium = tMedErr;
    const tHighErr = validateRange(thresholdHigh, 0, 100);
    if (tHighErr) newErrors.thresholdHigh = tHighErr;
    const tVHighErr = validateRange(thresholdVeryHigh, 0, 100);
    if (tVHighErr) newErrors.thresholdVeryHigh = tVHighErr;

    /** 閾値の大小関係チェック（全ての閾値に入力がある場合のみ） */
    if (!tLowErr && !tMedErr && !tHighErr && !tVHighErr) {
      /** 空欄はDB値で補完して比較 */
      const tLow = parseInt(thresholdLow || rawSettings?.slot_threshold_low, 10);
      const tMedium = parseInt(thresholdMedium || rawSettings?.slot_threshold_medium, 10);
      const tHigh = parseInt(thresholdHigh || rawSettings?.slot_threshold_high, 10);
      const tVeryHigh = parseInt(thresholdVeryHigh || rawSettings?.slot_threshold_very_high, 10);
      if (tLow >= tMedium || tMedium >= tHigh || tHigh >= tVeryHigh) {
        newErrors.thresholdOrder = '閾値は 低 < 中 < 高 < 非常に高 の順にしてください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * DB値と比較して変更があった項目のみを抽出する
   * @returns {Object} 変更された設定のキー・バリューマップ
   */
  const getChangedSettings = () => {
    if (!rawSettings) return {};

    /** 全項目のローカル値とDBキーの対応 */
    const fieldMap = {
      festival_year_mode: yearMode,
      festival_year: year,
      festival_start_month: startMonth,
      festival_start_day: startDay,
      festival_end_month: endMonth,
      festival_end_day: endDay,
      event_start_hour: startHour,
      event_start_minute: startMinute,
      event_end_hour: endHour,
      event_end_minute: endMinute,
      slot_threshold_low: thresholdLow,
      slot_threshold_medium: thresholdMedium,
      slot_threshold_high: thresholdHigh,
      slot_threshold_very_high: thresholdVeryHigh,
    };

    /** DB値と異なる項目だけを収集 */
    const changed = {};
    Object.entries(fieldMap).forEach(([key, localValue]) => {
      if (localValue !== '' && localValue !== rawSettings[key]) {
        changed[key] = localValue;
      }
    });

    return changed;
  };

  /**
   * 設定を保存する（変更があった項目のみ）
   */
  const handleSave = async () => {
    if (!validate()) return;

    /** 変更された項目を取得 */
    const settingsMap = getChangedSettings();

    if (Object.keys(settingsMap).length === 0) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setIsSaving(true);
    setShowSuccess(false);

    const { success, error } = await saveSettings(settingsMap);

    if (success) {
      setShowSuccess(true);
      /** 3秒後に成功メッセージを非表示 */
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      if (Platform.OS === 'web') {
        window.alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
      }
    }

    setIsSaving(false);
  };

  /** 企画年モードの選択肢 */
  const yearModeOptions = [
    { label: '自動（現在の年）', value: 'auto' },
    { label: '手動入力', value: 'manual' },
  ];

  /** ローディング中 */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        !isMobile && styles.contentContainerDesktop,
      ]}
    >
      <Text style={styles.title}>デフォルト設定</Text>
      <Text style={styles.description}>
        整理券システム全体の基本設定を管理します。変更は保存後、全ユーザーに反映されます。
      </Text>

      {/* 企画年 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>企画年</Text>
        <RadioGroup
          options={yearModeOptions}
          value={yearMode}
          onValueChange={setYearMode}
        />
        {yearMode === 'auto' ? (
          <View style={styles.autoYearDisplay}>
            <Text style={styles.autoYearText}>
              現在の年: {new Date().getFullYear()}年
            </Text>
          </View>
        ) : (
          <TextInput
            label="企画年"
            value={year}
            onChangeText={(text) => setYear(filterNumeric(text))}
            placeholder="例: 2026"
            keyboardType="numeric"
            error={errors.year}
          />
        )}
      </View>

      {/* 企画日程範囲 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>企画日程範囲</Text>
        <Text style={styles.sectionDescription}>この範囲内で企画日程を選択できます。</Text>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>開始日</Text>
          <View style={styles.dateInputRow}>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={startMonth}
                onChangeText={(text) => setStartMonth(filterNumeric(text))}
                placeholder="11"
                keyboardType="numeric"
                error={errors.startMonth}
              />
            </View>
            <Text style={styles.dateSeparator}>月</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={startDay}
                onChangeText={(text) => setStartDay(filterNumeric(text))}
                placeholder="2"
                keyboardType="numeric"
                error={errors.startDay}
              />
            </View>
            <Text style={styles.dateSeparator}>日</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>終了日</Text>
          <View style={styles.dateInputRow}>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={endMonth}
                onChangeText={(text) => setEndMonth(filterNumeric(text))}
                placeholder="11"
                keyboardType="numeric"
                error={errors.endMonth}
              />
            </View>
            <Text style={styles.dateSeparator}>月</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={endDay}
                onChangeText={(text) => setEndDay(filterNumeric(text))}
                placeholder="4"
                keyboardType="numeric"
                error={errors.endDay}
              />
            </View>
            <Text style={styles.dateSeparator}>日</Text>
          </View>
        </View>
      </View>

      {/* 時間範囲共通設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>時間範囲共通設定</Text>
        <Text style={styles.sectionDescription}>新規登録から個別で設定できます。</Text>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>開始時間</Text>
          <View style={styles.dateInputRow}>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={startHour}
                onChangeText={(text) => setStartHour(filterNumeric(text))}
                placeholder="10"
                keyboardType="numeric"
                error={errors.startHour}
              />
            </View>
            <Text style={styles.dateSeparator}>：</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={startMinute}
                onChangeText={(text) => setStartMinute(filterNumeric(text))}
                placeholder="00"
                keyboardType="numeric"
                error={errors.startMinute}
              />
            </View>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>終了時間</Text>
          <View style={styles.dateInputRow}>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={endHour}
                onChangeText={(text) => setEndHour(filterNumeric(text))}
                placeholder="19"
                keyboardType="numeric"
                error={errors.endHour}
              />
            </View>
            <Text style={styles.dateSeparator}>：</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                value={endMinute}
                onChangeText={(text) => setEndMinute(filterNumeric(text))}
                placeholder="00"
                keyboardType="numeric"
                error={errors.endMinute}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 閾値設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>配布状況の閾値（%）</Text>
        <Text style={styles.thresholdDescription}>
          時間枠の配布率に応じた色分け表示の閾値を設定します。
        </Text>
        <View style={styles.thresholdRow}>
          <View style={[styles.thresholdColor, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.thresholdLabel}>0% 〜</Text>
          <View style={styles.thresholdInputWrapper}>
            <TextInput
              value={thresholdLow}
              onChangeText={(text) => setThresholdLow(filterNumeric(text))}
              placeholder="25"
              keyboardType="numeric"
              error={errors.thresholdLow}
            />
          </View>
          <Text style={styles.thresholdUnit}>%（低）</Text>
        </View>
        <View style={styles.thresholdRow}>
          <View style={[styles.thresholdColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.thresholdLabel}>〜</Text>
          <View style={styles.thresholdInputWrapper}>
            <TextInput
              value={thresholdMedium}
              onChangeText={(text) => setThresholdMedium(filterNumeric(text))}
              placeholder="50"
              keyboardType="numeric"
              error={errors.thresholdMedium}
            />
          </View>
          <Text style={styles.thresholdUnit}>%（中）</Text>
        </View>
        <View style={styles.thresholdRow}>
          <View style={[styles.thresholdColor, { backgroundColor: '#FFC107' }]} />
          <Text style={styles.thresholdLabel}>〜</Text>
          <View style={styles.thresholdInputWrapper}>
            <TextInput
              value={thresholdHigh}
              onChangeText={(text) => setThresholdHigh(filterNumeric(text))}
              placeholder="60"
              keyboardType="numeric"
              error={errors.thresholdHigh}
            />
          </View>
          <Text style={styles.thresholdUnit}>%（高）</Text>
        </View>
        <View style={styles.thresholdRow}>
          <View style={[styles.thresholdColor, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.thresholdLabel}>〜</Text>
          <View style={styles.thresholdInputWrapper}>
            <TextInput
              value={thresholdVeryHigh}
              onChangeText={(text) => setThresholdVeryHigh(filterNumeric(text))}
              placeholder="80"
              keyboardType="numeric"
              error={errors.thresholdVeryHigh}
            />
          </View>
          <Text style={styles.thresholdUnit}>%（非常に高）</Text>
        </View>
        <View style={styles.thresholdRow}>
          <View style={[styles.thresholdColor, { backgroundColor: '#F44336' }]} />
          <Text style={styles.thresholdLabel}>〜 100%</Text>
        </View>
        {errors.thresholdOrder && (
          <Text style={styles.errorText}>{errors.thresholdOrder}</Text>
        )}
      </View>

      {/* 保存ボタン */}
      <View style={styles.buttonSection}>
        {showSuccess && (
          <Text style={styles.successText}>設定を保存しました</Text>
        )}
        <Button
          title={isSaving ? '保存中...' : '設定を保存'}
          onPress={handleSave}
          disabled={isSaving}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  /** コンテナ */
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentContainer: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL * 2,
  },
  contentContainerDesktop: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  /** タイトル */
  title: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  description: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
  },
  /** セクション */
  section: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  /** 企画年（自動表示） */
  autoYearDisplay: {
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.SM,
    borderRadius: 8,
    marginTop: SPACING.SM,
  },
  autoYearText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
  },
  /** 日付入力行 */
  dateRow: {
    marginBottom: SPACING.SM,
  },
  dateLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
    fontWeight: '500',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputWrapper: {
    width: 80,
  },
  dateSeparator: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    marginHorizontal: SPACING.XS,
    fontWeight: '500',
  },
  /** 閾値設定 */
  thresholdDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  thresholdColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: SPACING.SM,
  },
  thresholdLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
    marginRight: SPACING.XS,
    minWidth: 40,
  },
  thresholdInputWrapper: {
    width: 80,
  },
  thresholdUnit: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  /** エラーテキスト */
  errorText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
  /** ボタンセクション */
  buttonSection: {
    marginTop: SPACING.SM,
    marginBottom: SPACING.XL,
  },
  successText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.SUCCESS,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  /** ローディング */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default SettingsScreen;
