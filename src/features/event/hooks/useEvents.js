/**
 * 企画管理カスタムフック
 * 企画データの取得・管理を行う
 */

import { useState, useEffect, useCallback } from 'react';
import {
  selectEvents,
  selectEventById,
  insertEvent,
  updateEvent,
  deleteEvent,
  updateEventDateStatus,
  updateTimeSlotStatus,
} from '../services/eventService';

/**
 * 企画一覧を管理するフック
 * @returns {Object} 企画一覧と操作関数
 */
export const useEvents = () => {
  /** 企画一覧 */
  const [events, setEvents] = useState([]);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** エラー情報 */
  const [error, setError] = useState(null);

  /**
   * 企画一覧を取得
   */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectEvents();
    if (fetchError) {
      setError(fetchError);
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  }, []);

  /**
   * 企画を追加
   * @param {Object} eventData - 企画データ
   * @returns {Promise<{success: boolean, data: Object|null, error: Error|null}>}
   */
  const addEvent = useCallback(async (eventData) => {
    const { data, error: addError } = await insertEvent(eventData);
    if (addError) {
      return { success: false, data: null, error: addError };
    }
    await fetchEvents();
    return { success: true, data, error: null };
  }, [fetchEvents]);

  /**
   * 企画を更新
   * @param {string} id - 企画ID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const editEvent = useCallback(async (id, updateData) => {
    const { error: editError } = await updateEvent(id, updateData);
    if (editError) {
      return { success: false, error: editError };
    }
    await fetchEvents();
    return { success: true, error: null };
  }, [fetchEvents]);

  /**
   * 企画を削除
   * @param {string} id - 企画ID
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const removeEvent = useCallback(async (id) => {
    const { error: removeError } = await deleteEvent(id);
    if (removeError) {
      return { success: false, error: removeError };
    }
    await fetchEvents();
    return { success: true, error: null };
  }, [fetchEvents]);

  /**
   * 開催日のステータスを変更
   * @param {string} eventDateId - 企画開催日ID
   * @param {string} status - 新しいステータス
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const changeEventDateStatus = useCallback(async (eventDateId, status) => {
    const { error: changeError } = await updateEventDateStatus(eventDateId, status);
    if (changeError) {
      return { success: false, error: changeError };
    }
    await fetchEvents();
    return { success: true, error: null };
  }, [fetchEvents]);

  /**
   * 時間枠のステータスを変更
   * @param {string} timeSlotId - 時間枠ID
   * @param {string} status - 新しいステータス
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const changeTimeSlotStatus = useCallback(async (timeSlotId, status) => {
    const { error: changeError } = await updateTimeSlotStatus(timeSlotId, status);
    if (changeError) {
      return { success: false, error: changeError };
    }
    await fetchEvents();
    return { success: true, error: null };
  }, [fetchEvents]);

  // 初回レンダリング時に企画一覧を取得
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    addEvent,
    editEvent,
    removeEvent,
    changeEventDateStatus,
    changeTimeSlotStatus,
  };
};

/**
 * 単一の企画を管理するフック
 * @param {string} eventId - 企画ID
 * @returns {Object} 企画データと操作関数
 */
export const useEvent = (eventId) => {
  /** 企画データ */
  const [event, setEvent] = useState(null);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** エラー情報 */
  const [error, setError] = useState(null);

  /**
   * 企画を取得
   */
  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectEventById(eventId);
    if (fetchError) {
      setError(fetchError);
    } else {
      setEvent(data);
    }
    setIsLoading(false);
  }, [eventId]);

  // eventIdが変更されたら企画を取得
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return {
    event,
    isLoading,
    error,
    fetchEvent,
  };
};
