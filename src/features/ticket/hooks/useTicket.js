/**
 * 発券カスタムフック
 * 発券処理を管理する
 */

import { useState, useEffect, useCallback } from 'react';
import {
  issueTicket,
  selectActiveEvents,
  selectActiveTimeSlots,
} from '../services/ticketService';
import { selectTimeSlotsByEventDateId } from '../../event/services/eventService';
import { EVENT_TYPES, STATUS } from '../../../shared/constants';

/**
 * 発券機能を管理するフック
 * @returns {Object} 発券関連のstate・関数
 */
export const useTicket = () => {
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
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** 発券処理中状態 */
  const [isIssuing, setIsIssuing] = useState(false);
  /** エラー情報 */
  const [error, setError] = useState(null);
  /** 発券結果 */
  const [issuedTicket, setIssuedTicket] = useState(null);

  /**
   * 発券可能な企画一覧を取得
   */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectActiveEvents();
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

    const { data, error: fetchError } = await selectTimeSlotsByEventDateId(eventDateId);
    if (fetchError) {
      setError(fetchError);
    } else {
      // 発券可能なステータスの時間枠のみフィルタリング
      const activeSlots = data?.filter(slot =>
        slot.status === STATUS.ACTIVE || slot.status === STATUS.NOT_STARTED
      ) || [];
      setTimeSlots(activeSlots);
    }
  }, []);

  /**
   * 企画を選択
   * @param {Object} event - 企画データ
   */
  const selectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setSelectedEventDate(null);
    setSelectedTimeSlot(null);
    setTimeSlots([]);
    setIssuedTicket(null);
  }, []);

  /**
   * 開催日を選択
   * @param {Object} eventDate - 企画開催日データ
   */
  const selectEventDate = useCallback((eventDate) => {
    setSelectedEventDate(eventDate);
    setSelectedTimeSlot(null);
    setIssuedTicket(null);

    // 時間枠定員制の場合は時間枠一覧を取得
    if (selectedEvent?.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(eventDate.id);
    }
  }, [selectedEvent, fetchTimeSlots]);

  /**
   * 時間枠を選択
   * @param {Object} timeSlot - 時間枠データ
   */
  const selectTimeSlot = useCallback((timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setIssuedTicket(null);
  }, []);

  /**
   * 整理券を発行
   * @param {string} mediumType - 媒体タイプ（paper/digital）
   * @returns {Promise<{success: boolean, data: Object|null, error: Error|null}>}
   */
  const issue = useCallback(async (mediumType) => {
    if (!selectedEvent || !selectedEventDate) {
      return { success: false, data: null, error: new Error('企画と開催日を選択してください') };
    }

    // 時間枠定員制の場合は時間枠も必要
    if (selectedEvent.type === EVENT_TYPES.TIME_SLOT && !selectedTimeSlot) {
      return { success: false, data: null, error: new Error('時間枠を選択してください') };
    }

    setIsIssuing(true);
    setError(null);

    const { data, error: issueError } = await issueTicket({
      eventId: selectedEvent.id,
      eventDateId: selectedEventDate.id,
      timeSlotId: selectedTimeSlot?.id || null,
      mediumType,
      capacity: selectedEvent.capacity_per_slot,
    });

    setIsIssuing(false);

    if (issueError) {
      setError(issueError);
      return { success: false, data: null, error: issueError };
    }

    // 発券結果を保存
    setIssuedTicket({
      ...data,
      eventName: selectedEvent.name,
      eventLocation: selectedEvent.location,
      eventType: selectedEvent.type,
      eventDate: selectedEventDate.date,
      timeSlot: selectedTimeSlot,
    });

    // 時間枠一覧を再取得（発券数を更新）
    if (selectedEvent.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(selectedEventDate.id);
    }

    return { success: true, data, error: null };
  }, [selectedEvent, selectedEventDate, selectedTimeSlot, fetchTimeSlots]);

  /**
   * 発券結果をクリア
   */
  const clearIssuedTicket = useCallback(() => {
    setIssuedTicket(null);
  }, []);

  /**
   * 全ての選択をリセット
   */
  const resetSelection = useCallback(() => {
    setSelectedEvent(null);
    setSelectedEventDate(null);
    setSelectedTimeSlot(null);
    setTimeSlots([]);
    setIssuedTicket(null);
  }, []);

  // 初回レンダリング時に企画一覧を取得
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    selectedEvent,
    selectedEventDate,
    timeSlots,
    selectedTimeSlot,
    isLoading,
    isIssuing,
    error,
    issuedTicket,
    fetchEvents,
    selectEvent,
    selectEventDate,
    selectTimeSlot,
    issue,
    clearIssuedTicket,
    resetSelection,
  };
};
