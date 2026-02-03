/**
 * 日付・時間関連ユーティリティ関数
 * 時間枠の生成や日付フォーマットに使用
 */

import { EVENT_START_TIME, EVENT_END_TIME } from '../constants';

/**
 * 時刻文字列を分に変換
 * @param {string} timeStr - 時刻文字列（HH:MM形式）
 * @returns {number} 0時からの分数
 */
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 分を時刻文字列に変換
 * @param {number} minutes - 0時からの分数
 * @returns {string} 時刻文字列（HH:MM形式）
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * 時間枠を生成
 * @param {number} slotDurationMinutes - 1枠あたりの時間（分）
 * @returns {Array<{startTime: string, endTime: string}>} 時間枠の配列
 */
export const generateTimeSlots = (slotDurationMinutes) => {
  const slots = [];
  const startMinutes = timeToMinutes(EVENT_START_TIME);
  const endMinutes = timeToMinutes(EVENT_END_TIME);

  let currentMinutes = startMinutes;
  while (currentMinutes + slotDurationMinutes <= endMinutes) {
    const slotEndMinutes = currentMinutes + slotDurationMinutes;
    slots.push({
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(slotEndMinutes),
    });
    currentMinutes = slotEndMinutes;
  }

  return slots;
};

/**
 * 日付を表示用フォーマットに変換
 * @param {string} dateStr - 日付文字列（YYYY-MM-DD形式）
 * @returns {string} 表示用日付文字列（M月D日形式）
 */
export const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

/**
 * 日付を曜日付きで表示用フォーマットに変換
 * @param {string} dateStr - 日付文字列（YYYY-MM-DD形式）
 * @returns {string} 表示用日付文字列（M月D日(曜日)形式）
 */
export const formatDateWithDay = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = dayNames[date.getDay()];
  return `${month}月${day}日(${dayOfWeek})`;
};

/**
 * 時刻を表示用フォーマットに変換
 * @param {string} timeStr - 時刻文字列（HH:MM:SS形式またはHH:MM形式）
 * @returns {string} 表示用時刻文字列（HH:MM形式）
 */
export const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

/**
 * 時間枠を表示用フォーマットに変換
 * @param {string} startTime - 開始時刻（HH:MM形式）
 * @param {string} endTime - 終了時刻（HH:MM形式）
 * @returns {string} 表示用時間枠文字列（HH:MM〜HH:MM形式）
 */
export const formatTimeSlotDisplay = (startTime, endTime) => {
  return `${formatTimeDisplay(startTime)}〜${formatTimeDisplay(endTime)}`;
};

/**
 * 現在時刻が指定の時間枠の開始時刻を過ぎているかチェック
 * @param {string} startTime - 開始時刻（HH:MM形式）
 * @returns {boolean} 開始時刻を過ぎている場合true
 */
export const isTimeSlotStarted = (startTime) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(formatTimeDisplay(startTime));
  return currentMinutes >= startMinutes;
};

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 * @returns {string} 今日の日付文字列
 */
export const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 日付文字列が今日かどうかをチェック
 * @param {string} dateStr - 日付文字列（YYYY-MM-DD形式）
 * @returns {boolean} 今日の場合true
 */
export const isToday = (dateStr) => {
  return dateStr === getTodayString();
};

/**
 * 推定待ち時間を計算
 * @param {number} nextTicketNumber - 次の整理番号
 * @param {number} currentCallNumber - 現在の呼び出し番号
 * @param {number} estimatedWaitMinutes - 1番号あたりの推定待ち時間（分）
 * @returns {number} 推定待ち時間（分）
 */
export const calculateEstimatedWaitTime = (nextTicketNumber, currentCallNumber, estimatedWaitMinutes) => {
  const waitingCount = nextTicketNumber - currentCallNumber - 1;
  if (waitingCount <= 0) return 0;
  return waitingCount * estimatedWaitMinutes;
};

/**
 * 待ち時間を表示用フォーマットに変換
 * @param {number} minutes - 待ち時間（分）
 * @returns {string} 表示用待ち時間文字列
 */
export const formatWaitTime = (minutes) => {
  if (minutes < 60) {
    return `約${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `約${hours}時間`;
  }
  return `約${hours}時間${mins}分`;
};
