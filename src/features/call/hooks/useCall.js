/**
 * 呼び出しカスタムフック
 * 呼び出し処理を管理する
 */

import { useState, useEffect, useCallback } from 'react';
import {
  selectEventsForCall,
  selectTimeSlotsForCall,
  selectCallStatus,
  updateCallNumber,
  subscribeCallStatus,
  unsubscribeCallStatus,
} from '../services/callService';
import { EVENT_TYPES } from '../../../shared/constants';

/**
 * 呼び出し機能を管理するフック
 * @returns {Object} 呼び出し関連のstate・関数
 */
export const useCall = () => {
  /** 企画一覧 */
  const [events, setEvents] = useState([]);
  /** 選択中の企画 */
  const [selectedEvent, setSelectedEvent] = useState(null);
  /** 選択中の開催日 */
  const [selectedEventDate, setSelectedEventDate] = useState(null);
  /** 時間枠一覧 */
  const [timeSlots, setTimeSlots] = useState([]);
  /** 選択中の時間枠 */
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  /** 呼び出し状態 */
  const [callStatus, setCallStatus] = useState(null);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** 更新中状態 */
  const [isUpdating, setIsUpdating] = useState(false);
  /** エラー情報 */
  const [error, setError] = useState(null);
  /** 全画面表示状態 */
  const [isFullScreen, setIsFullScreen] = useState(false);
  /** 呼び出し表示データ */
  const [callDisplayData, setCallDisplayData] = useState(null);
  /** Realtime購読 */
  const [subscription, setSubscription] = useState(null);

  /**
   * 企画一覧を取得
   */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectEventsForCall();
    if (fetchError) {
      setError(fetchError);
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  }, []);

  /**
   * 時間枠一覧を取得
   * @param {string} eventDateId - 企画開催日ID
   */
  const fetchTimeSlots = useCallback(async (eventDateId) => {
    if (!eventDateId) {
      setTimeSlots([]);
      return;
    }

    const { data, error: fetchError } = await selectTimeSlotsForCall(eventDateId);
    if (fetchError) {
      setError(fetchError);
    } else {
      setTimeSlots(data || []);
    }
  }, []);

  /**
   * 呼び出し状態を取得
   * @param {string} eventId - 企画ID
   * @param {string} eventDateId - 企画開催日ID
   */
  const fetchCallStatus = useCallback(async (eventId, eventDateId) => {
    const { data, error: fetchError } = await selectCallStatus(eventId, eventDateId);
    if (fetchError) {
      // 呼び出し状態がない場合は初期値を設定
      setCallStatus({ current_call_number: 0 });
    } else {
      setCallStatus(data);
    }
  }, []);

  /**
   * 企画を選択
   * @param {Object} event - 企画データ
   */
  const selectEvent = useCallback((event) => {
    // 既存の購読を解除
    if (subscription) {
      unsubscribeCallStatus(subscription);
      setSubscription(null);
    }

    setSelectedEvent(event);
    setSelectedEventDate(null);
    setSelectedTimeSlot(null);
    setTimeSlots([]);
    setCallStatus(null);
    setCallDisplayData(null);
  }, [subscription]);

  /**
   * 開催日を選択
   * @param {Object} eventDate - 企画開催日データ
   */
  const selectEventDate = useCallback((eventDate) => {
    // 既存の購読を解除
    if (subscription) {
      unsubscribeCallStatus(subscription);
      setSubscription(null);
    }

    setSelectedEventDate(eventDate);
    setSelectedTimeSlot(null);
    setCallDisplayData(null);

    if (selectedEvent?.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(eventDate.id);
    } else if (selectedEvent?.type === EVENT_TYPES.SEQUENTIAL) {
      fetchCallStatus(selectedEvent.id, eventDate.id);

      // Realtime購読を開始
      const newSubscription = subscribeCallStatus(
        selectedEvent.id,
        eventDate.id,
        (newCallStatus) => {
          setCallStatus(newCallStatus);
        }
      );
      setSubscription(newSubscription);
    }
  }, [selectedEvent, fetchTimeSlots, fetchCallStatus, subscription]);

  /**
   * 時間枠を選択
   * @param {Object} timeSlot - 時間枠データ
   */
  const selectTimeSlot = useCallback((timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setCallDisplayData(null);
  }, []);

  /**
   * 時間枠定員制の呼び出しを実行
   */
  const callTimeSlot = useCallback(() => {
    if (!selectedEvent || !selectedEventDate || !selectedTimeSlot) {
      return;
    }

    setCallDisplayData({
      type: EVENT_TYPES.TIME_SLOT,
      eventName: selectedEvent.name,
      eventLocation: selectedEvent.location,
      date: selectedEventDate.date,
      timeSlot: selectedTimeSlot,
    });
    setIsFullScreen(true);
  }, [selectedEvent, selectedEventDate, selectedTimeSlot]);

  /**
   * 順次案内制の呼び出し番号を更新
   * @param {number} newCallNumber - 新しい呼び出し番号
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const updateCall = useCallback(async (newCallNumber) => {
    if (!selectedEvent || !selectedEventDate) {
      return { success: false, error: new Error('企画と開催日を選択してください') };
    }

    // 現在の発券番号より大きい番号は設定できない
    if (newCallNumber >= selectedEventDate.next_ticket_number) {
      return {
        success: false,
        error: new Error(`呼び出し番号は発券番号（${selectedEventDate.next_ticket_number - 1}）以下にしてください`),
      };
    }

    setIsUpdating(true);
    const { error: updateError } = await updateCallNumber(
      selectedEvent.id,
      selectedEventDate.id,
      newCallNumber
    );
    setIsUpdating(false);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // ローカルの状態を更新
    setCallStatus(prev => ({ ...prev, current_call_number: newCallNumber }));

    return { success: true, error: null };
  }, [selectedEvent, selectedEventDate]);

  /**
   * 順次案内制の呼び出し表示
   * @param {number} callNumber - 呼び出し番号
   */
  const displayCall = useCallback((callNumber) => {
    if (!selectedEvent || !selectedEventDate) {
      return;
    }

    setCallDisplayData({
      type: EVENT_TYPES.SEQUENTIAL,
      eventName: selectedEvent.name,
      eventLocation: selectedEvent.location,
      date: selectedEventDate.date,
      callNumber,
    });
    setIsFullScreen(true);
  }, [selectedEvent, selectedEventDate]);

  /**
   * 全画面表示を終了
   */
  const exitFullScreen = useCallback(() => {
    setIsFullScreen(false);
    setCallDisplayData(null);
  }, []);

  /**
   * 全ての選択をリセット
   */
  const resetSelection = useCallback(() => {
    if (subscription) {
      unsubscribeCallStatus(subscription);
      setSubscription(null);
    }

    setSelectedEvent(null);
    setSelectedEventDate(null);
    setSelectedTimeSlot(null);
    setTimeSlots([]);
    setCallStatus(null);
    setCallDisplayData(null);
    setIsFullScreen(false);
  }, [subscription]);

  // 初回レンダリング時に企画一覧を取得
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // コンポーネントアンマウント時に購読を解除
  useEffect(() => {
    return () => {
      if (subscription) {
        unsubscribeCallStatus(subscription);
      }
    };
  }, [subscription]);

  return {
    events,
    selectedEvent,
    selectedEventDate,
    timeSlots,
    selectedTimeSlot,
    callStatus,
    isLoading,
    isUpdating,
    error,
    isFullScreen,
    callDisplayData,
    fetchEvents,
    selectEvent,
    selectEventDate,
    selectTimeSlot,
    callTimeSlot,
    updateCall,
    displayCall,
    exitFullScreen,
    resetSelection,
  };
};
