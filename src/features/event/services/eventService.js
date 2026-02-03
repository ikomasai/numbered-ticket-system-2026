/**
 * 企画管理サービス
 * 企画のCRUD操作を行うAPI通信関数
 */

import { supabase } from '../../../services/supabase/client';
import { generateTimeSlots } from '../../../shared/utils/dateTime';
import { EVENT_TYPES, STATUS } from '../../../shared/constants';

/**
 * 全企画を取得
 * @returns {Promise<{data: Array|null, error: Error|null}>} 企画一覧
 */
export const selectEvents = async () => {
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

    // 各企画の開催日を日付順でソート
    if (data) {
      data.forEach(event => {
        if (event.event_dates) {
          event.event_dates.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
      });
    }

    return { data, error: null };
  } catch (error) {
    console.error('企画取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 企画をIDで取得
 * @param {string} id - 企画ID
 * @returns {Promise<{data: Object|null, error: Error|null}>} 企画データ
 */
export const selectEventById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_dates (
          id,
          date,
          status,
          next_ticket_number,
          time_slots (
            id,
            start_time,
            end_time,
            status,
            current_count
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // 日付を昇順でソート
    if (data && data.event_dates) {
      data.event_dates.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 各日付の時間枠も開始時刻で昇順ソート
      data.event_dates.forEach(eventDate => {
        if (eventDate.time_slots) {
          eventDate.time_slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
      });
    }

    return { data, error: null };
  } catch (error) {
    console.error('企画取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 企画を登録
 * @param {Object} eventData - 企画データ
 * @param {string} eventData.name - 企画名
 * @param {string} eventData.location - 企画場所
 * @param {string} eventData.type - 企画タイプ
 * @param {number} eventData.capacityPerSlot - 1枠あたりの定員（時間枠定員制のみ）
 * @param {number} eventData.slotDurationMinutes - 1枠あたりの時間（時間枠定員制のみ）
 * @param {number} eventData.estimatedWaitMinutes - 推定待ち時間（順次案内制のみ）
 * @param {Array<string>} eventData.dates - 開催日の配列
 * @returns {Promise<{data: Object|null, error: Error|null}>} 登録された企画データ
 */
export const insertEvent = async (eventData) => {
  try {
    const { name, location, type, capacityPerSlot, slotDurationMinutes, estimatedWaitMinutes, dates } = eventData;

    // 企画を登録
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name,
        location,
        type,
        capacity_per_slot: type === EVENT_TYPES.TIME_SLOT ? capacityPerSlot : null,
        slot_duration_minutes: type === EVENT_TYPES.TIME_SLOT ? slotDurationMinutes : null,
        estimated_wait_minutes: type === EVENT_TYPES.SEQUENTIAL ? estimatedWaitMinutes : null,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // 開催日を登録
    const eventDatesData = dates.map(date => ({
      event_id: event.id,
      date,
      status: STATUS.NOT_STARTED,
    }));

    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .insert(eventDatesData)
      .select();

    if (datesError) throw datesError;

    // 時間枠定員制の場合は時間枠を生成
    if (type === EVENT_TYPES.TIME_SLOT) {
      const timeSlots = generateTimeSlots(slotDurationMinutes);
      const timeSlotsData = [];

      for (const eventDate of eventDates) {
        // 各開催日の時間枠に対して開始番号を計算
        for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
          const slot = timeSlots[slotIndex];
          // 開始番号 = 定員 × インデックス + 1
          // 例: 定員50、インデックス0 → 1, インデックス1 → 51, インデックス2 → 101
          const startTicketNumber = (capacityPerSlot * slotIndex) + 1;

          timeSlotsData.push({
            event_id: event.id,
            event_date_id: eventDate.id,
            start_time: slot.startTime,
            end_time: slot.endTime,
            status: STATUS.NOT_STARTED,
            start_ticket_number: startTicketNumber,
          });
        }
      }

      const { error: slotsError } = await supabase
        .from('time_slots')
        .insert(timeSlotsData);

      if (slotsError) throw slotsError;
    }

    // 順次案内制の場合は呼び出し状態を初期化
    if (type === EVENT_TYPES.SEQUENTIAL) {
      const callStatusData = eventDates.map(eventDate => ({
        event_id: event.id,
        event_date_id: eventDate.id,
        current_call_number: 0,
      }));

      const { error: callStatusError } = await supabase
        .from('call_status')
        .insert(callStatusData);

      if (callStatusError) throw callStatusError;
    }

    return { data: event, error: null };
  } catch (error) {
    console.error('企画登録エラー:', error);
    return { data: null, error };
  }
};

/**
 * 企画を更新
 * @param {string} id - 企画ID
 * @param {Object} updateData - 更新データ
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新された企画データ
 */
export const updateEvent = async (id, updateData) => {
  try {
    const { name, location, estimatedWaitMinutes } = updateData;

    const updateObj = { name, location };

    // 順次案内制の場合のみ推定待ち時間を更新可能
    if (estimatedWaitMinutes !== undefined) {
      updateObj.estimated_wait_minutes = estimatedWaitMinutes;
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('企画更新エラー:', error);
    return { data: null, error };
  }
};

/**
 * 企画を削除
 * @param {string} id - 企画ID
 * @returns {Promise<{error: Error|null}>} エラー情報
 */
export const deleteEvent = async (id) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('企画削除エラー:', error);
    return { error };
  }
};

/**
 * 企画開催日のステータスを更新
 * @param {string} id - 企画開催日ID
 * @param {string} status - 新しいステータス
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新された開催日データ
 */
export const updateEventDateStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from('event_dates')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('開催日ステータス更新エラー:', error);
    return { data: null, error };
  }
};

/**
 * 時間枠のステータスを更新
 * @param {string} id - 時間枠ID
 * @param {string} status - 新しいステータス
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新された時間枠データ
 */
export const updateTimeSlotStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('時間枠ステータス更新エラー:', error);
    return { data: null, error };
  }
};

/**
 * 企画開催日の時間枠一覧を取得
 * @param {string} eventDateId - 企画開催日ID
 * @returns {Promise<{data: Array|null, error: Error|null}>} 時間枠一覧
 */
export const selectTimeSlotsByEventDateId = async (eventDateId) => {
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
