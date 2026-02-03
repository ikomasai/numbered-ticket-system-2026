/**
 * 呼び出しサービス
 * 整理券の呼び出し処理を行うAPI通信関数
 */

import { supabase } from '../../../services/supabase/client';

/**
 * 呼び出し状態を取得
 * @param {string} eventId - 企画ID
 * @param {string} eventDateId - 企画開催日ID
 * @returns {Promise<{data: Object|null, error: Error|null}>} 呼び出し状態
 */
export const selectCallStatus = async (eventId, eventDateId) => {
  try {
    const { data, error } = await supabase
      .from('call_status')
      .select('*')
      .eq('event_id', eventId)
      .eq('event_date_id', eventDateId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('呼び出し状態取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 呼び出し番号を更新
 * @param {string} eventId - 企画ID
 * @param {string} eventDateId - 企画開催日ID
 * @param {number} callNumber - 新しい呼び出し番号
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新された呼び出し状態
 */
export const updateCallNumber = async (eventId, eventDateId, callNumber) => {
  try {
    const { data, error } = await supabase
      .from('call_status')
      .update({ current_call_number: callNumber })
      .eq('event_id', eventId)
      .eq('event_date_id', eventDateId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('呼び出し番号更新エラー:', error);
    return { data: null, error };
  }
};

/**
 * 呼び出し状態のリアルタイム購読を開始
 * @param {string} eventId - 企画ID
 * @param {string} eventDateId - 企画開催日ID
 * @param {Function} callback - 更新時のコールバック関数
 * @returns {Object} 購読オブジェクト（unsubscribeに使用）
 */
export const subscribeCallStatus = (eventId, eventDateId, callback) => {
  const subscription = supabase
    .channel(`call_status_${eventId}_${eventDateId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_status',
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        if (payload.new.event_date_id === eventDateId) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return subscription;
};

/**
 * 呼び出し状態の購読を解除
 * @param {Object} subscription - 購読オブジェクト
 */
export const unsubscribeCallStatus = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};

/**
 * 全企画一覧を取得（呼び出し用）
 * @returns {Promise<{data: Array|null, error: Error|null}>} 企画一覧
 */
export const selectEventsForCall = async () => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_dates (
          id,
          date,
          status,
          next_ticket_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('企画取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 時間枠一覧を取得（呼び出し用）
 * @param {string} eventDateId - 企画開催日ID
 * @returns {Promise<{data: Array|null, error: Error|null}>} 時間枠一覧
 */
export const selectTimeSlotsForCall = async (eventDateId) => {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_date_id', eventDateId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('時間枠取得エラー:', error);
    return { data: null, error };
  }
};
