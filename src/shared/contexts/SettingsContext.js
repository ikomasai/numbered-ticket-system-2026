/**
 * デフォルト設定Context
 * numbered_ticket_settingsテーブルの値をアプリ全体で共有する
 * 設定値はアプリ起動時に1回取得し、更新時に再取得する
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { selectAllSettings, updateSettings } from '../../features/settings/services/settingsService';

/** 設定Context */
const SettingsContext = createContext(null);

/**
 * DBの設定値から開催日一覧を導出する
 * @param {Object} raw - DB設定値のキー・バリューオブジェクト
 * @returns {string[]} YYYY-MM-DD形式の日付配列
 */
const deriveFestivalDates = (raw) => {
  /** 企画年：autoモードなら現在の年を使用 */
  const year = raw.festival_year_mode === 'auto'
    ? new Date().getFullYear()
    : parseInt(raw.festival_year, 10);

  const startMonth = parseInt(raw.festival_start_month, 10);
  const startDay = parseInt(raw.festival_start_day, 10);
  const endMonth = parseInt(raw.festival_end_month, 10);
  const endDay = parseInt(raw.festival_end_day, 10);

  /** 開始日と終了日のDateオブジェクトを生成 */
  const startDate = new Date(year, startMonth - 1, startDay);
  const endDate = new Date(year, endMonth - 1, endDay);

  /** 開始日から終了日まで1日ずつ追加 */
  const dates = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * DBの設定値から開始・終了時刻文字列を導出する
 * @param {Object} raw - DB設定値のキー・バリューオブジェクト
 * @returns {{ startTime: string, endTime: string }} HH:MM形式の時刻
 */
const deriveEventTimes = (raw) => {
  const startHour = String(parseInt(raw.event_start_hour, 10)).padStart(2, '0');
  const startMinute = String(parseInt(raw.event_start_minute, 10)).padStart(2, '0');
  const endHour = String(parseInt(raw.event_end_hour, 10)).padStart(2, '0');
  const endMinute = String(parseInt(raw.event_end_minute, 10)).padStart(2, '0');

  return {
    startTime: `${startHour}:${startMinute}`,
    endTime: `${endHour}:${endMinute}`,
  };
};

/**
 * DBの設定値から閾値オブジェクトを導出する
 * @param {Object} raw - DB設定値のキー・バリューオブジェクト
 * @returns {Object} SLOT_THRESHOLDS互換の閾値オブジェクト
 */
const deriveSlotThresholds = (raw) => ({
  LOW: parseInt(raw.slot_threshold_low, 10),
  MEDIUM: parseInt(raw.slot_threshold_medium, 10),
  HIGH: parseInt(raw.slot_threshold_high, 10),
  VERY_HIGH: parseInt(raw.slot_threshold_very_high, 10),
});

/**
 * 設定プロバイダーコンポーネント
 * @param {Object} props - プロパティ
 * @param {React.ReactNode} props.children - 子コンポーネント
 * @returns {JSX.Element} プロバイダー
 */
export const SettingsProvider = ({ children }) => {
  /** DB上の生設定値（キー・バリュー） */
  const [rawSettings, setRawSettings] = useState(null);
  /** 設定読み込み中フラグ */
  const [isLoading, setIsLoading] = useState(true);
  /** エラー */
  const [error, setError] = useState(null);

  /**
   * 設定をDBから取得する
   */
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectAllSettings();
    if (fetchError) {
      setError(fetchError);
    } else {
      setRawSettings(data);
    }
    setIsLoading(false);
  }, []);

  /** 初回マウント時に設定を取得 */
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /**
   * 設定を更新してDBに保存し、ローカルstateも更新する
   * @param {Object} settingsMap - { key: value } 形式の更新内容
   * @returns {Promise<{success: boolean, error: Error|null}>} 更新結果
   */
  const saveSettings = useCallback(async (settingsMap) => {
    const result = await updateSettings(settingsMap);
    if (result.success) {
      /** ローカルstateを即時反映 */
      setRawSettings((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(settingsMap).map(([k, v]) => [k, String(v)])
        ),
      }));
    }
    return result;
  }, []);

  /** 導出された設定値（rawSettingsが取得済みの場合のみ計算） */
  const festivalDates = rawSettings ? deriveFestivalDates(rawSettings) : [];
  const eventTimes = rawSettings ? deriveEventTimes(rawSettings) : { startTime: '10:00', endTime: '19:00' };
  const slotThresholds = rawSettings ? deriveSlotThresholds(rawSettings) : { LOW: 25, MEDIUM: 50, HIGH: 60, VERY_HIGH: 80 };

  /** Context値 */
  const value = {
    /** DB上の生設定値 */
    rawSettings,
    /** 導出済みの開催日一覧 */
    festivalDates,
    /** 導出済みの開始時刻 (HH:MM) */
    eventStartTime: eventTimes.startTime,
    /** 導出済みの終了時刻 (HH:MM) */
    eventEndTime: eventTimes.endTime,
    /** 導出済みの閾値オブジェクト */
    slotThresholds,
    /** 設定読み込み中フラグ */
    isLoading,
    /** エラー */
    error,
    /** 設定を再取得する */
    fetchSettings,
    /** 設定を保存する */
    saveSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * 設定Contextを使用するカスタムフック
 * @returns {Object} 設定Contextの値
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsはSettingsProvider内で使用してください');
  }
  return context;
};
