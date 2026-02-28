/**
 * 発券サービス
 * 整理券の発行・取得を行うAPI通信関数
 */

import { supabase } from '../../../services/supabase/client';
import { STATUS, MEDIUM_TYPES, EVENT_TYPES } from '../../../shared/constants';

/**
 * UUIDを生成
 * @returns {string} UUID文字列
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 整理券を発行（トランザクション処理）
 * @param {Object} params - 発券パラメータ
 * @param {string} params.eventId - 企画ID
 * @param {string} params.eventDateId - 企画開催日ID
 * @param {string} params.timeSlotId - 時間枠ID（時間枠定員制のみ）
 * @param {string} params.mediumType - 媒体タイプ（paper/digital）
 * @param {number} params.capacity - 定員（時間枠定員制のみ）
 * @returns {Promise<{data: Object|null, error: Error|null}>} 発行された整理券データ
 */
export const issueTicket = async ({ eventId, eventDateId, timeSlotId, mediumType, capacity }) => {
  try {
    // 楽観的ロックを使用してトランザクション的な処理を行う

    // 1. 企画開催日のステータスを確認
    const { data: eventDate, error: fetchError } = await supabase
      .from('event_dates')
      .select('next_ticket_number, status')
      .eq('id', eventDateId)
      .single();

    if (fetchError) throw fetchError;

    // ステータスチェック
    if (eventDate.status !== STATUS.ACTIVE) {
      throw new Error('この日の発券は受付中ではありません');
    }

    /** 現在の整理番号 */
    let ticketNumber;

    // 2. 時間枠定員制の場合は時間枠から整理番号を計算
    if (timeSlotId) {
      const { data: timeSlot, error: slotError } = await supabase
        .from('time_slots')
        .select('current_count, status, start_ticket_number')
        .eq('id', timeSlotId)
        .single();

      if (slotError) throw slotError;

      // 時間枠のステータスチェック
      if (timeSlot.status !== STATUS.ACTIVE) {
        throw new Error('この時間枠の発券は受付中ではありません');
      }

      // 定員チェック
      if (capacity && timeSlot.current_count >= capacity) {
        throw new Error('この時間枠は満員です');
      }

      // 整理券番号 = 開始番号 + 現在の発券数
      // 例: 開始番号51、発券数0 → 51
      //     開始番号51、発券数1 → 52
      ticketNumber = timeSlot.start_ticket_number + timeSlot.current_count;
    } else {
      // 順次案内制の場合は従来通り企画開催日の next_ticket_number を使用
      ticketNumber = eventDate.next_ticket_number;
    }

    // 3. 電子媒体の場合はQRトークンを生成
    /** QRコード用トークン */
    const qrToken = mediumType === MEDIUM_TYPES.DIGITAL ? generateUUID() : null;

    // 4. 整理券を登録
    const { data: ticket, error: insertError } = await supabase
      .from('tickets')
      .insert({
        event_id: eventId,
        event_date_id: eventDateId,
        time_slot_id: timeSlotId || null,
        ticket_number: ticketNumber,
        medium_type: mediumType,
        qr_token: qrToken,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. 順次案内制の場合のみ企画開催日の次の整理番号を更新
    // 時間枠定員制の場合は時間枠の start_ticket_number + current_count で計算するため更新不要
    if (!timeSlotId) {
      const { error: updateDateError } = await supabase
        .from('event_dates')
        .update({ next_ticket_number: ticketNumber + 1 })
        .eq('id', eventDateId)
        .eq('next_ticket_number', ticketNumber); // 楽観的ロック

      if (updateDateError) throw updateDateError;
    }

    // 6. 時間枠定員制の場合は時間枠の発券数を更新
    if (timeSlotId) {
      // 現在のカウントを取得
      const { data: currentSlot } = await supabase
        .from('time_slots')
        .select('current_count')
        .eq('id', timeSlotId)
        .single();

      // カウントを更新（+1）
      const newCount = (currentSlot?.current_count || 0) + 1;
      await supabase
        .from('time_slots')
        .update({ current_count: newCount })
        .eq('id', timeSlotId);

      // 満員チェック - 定員に達したらステータスを更新
      if (capacity && newCount >= capacity) {
        await supabase
          .from('time_slots')
          .update({ status: STATUS.FULL })
          .eq('id', timeSlotId);
      }
    }

    // 7. 発券ログを記録
    await supabase
      .from('ticket_logs')
      .insert({
        ticket_id: ticket.id,
        action: 'issued',
        details: {
          event_id: eventId,
          event_date_id: eventDateId,
          time_slot_id: timeSlotId,
          ticket_number: ticketNumber,
          medium_type: mediumType,
        },
      });

    return { data: { ...ticket, ticket_number: ticketNumber }, error: null };
  } catch (error) {
    console.error('発券エラー:', error);
    return { data: null, error };
  }
};

/**
 * 整理券を複数枚一括発行（バッチ処理）
 * @param {Object} params - 発券パラメータ
 * @param {string} params.eventId - 企画ID
 * @param {string} params.eventDateId - 企画開催日ID
 * @param {string} params.timeSlotId - 時間枠ID（時間枠定員制のみ）
 * @param {string} params.mediumType - 媒体タイプ（paper/digital）
 * @param {number} params.capacity - 定員（時間枠定員制のみ）
 * @param {number} params.quantity - 発券枚数
 * @returns {Promise<{data: Array|null, error: Error|null}>} 発行された整理券データの配列
 */
export const issueMultipleTickets = async ({ eventId, eventDateId, timeSlotId, mediumType, capacity, quantity }) => {
  try {
    // 1. 企画開催日のステータスを確認
    const { data: eventDate, error: fetchError } = await supabase
      .from('event_dates')
      .select('next_ticket_number, status')
      .eq('id', eventDateId)
      .single();

    if (fetchError) throw fetchError;

    if (eventDate.status !== STATUS.ACTIVE) {
      throw new Error('この日の発券は受付中ではありません');
    }

    /** 開始整理番号 */
    let startTicketNumber;

    // 2. 時間枠定員制の場合
    if (timeSlotId) {
      const { data: timeSlot, error: slotError } = await supabase
        .from('time_slots')
        .select('current_count, status, start_ticket_number')
        .eq('id', timeSlotId)
        .single();

      if (slotError) throw slotError;

      if (timeSlot.status !== STATUS.ACTIVE) {
        throw new Error('この時間枠の発券は受付中ではありません');
      }

      /** 残り枠数 */
      const remaining = capacity - timeSlot.current_count;
      if (remaining < quantity) {
        throw new Error(`残り${remaining}枚しか発券できません`);
      }

      startTicketNumber = timeSlot.start_ticket_number + timeSlot.current_count;
    } else {
      // 順次案内制の場合
      startTicketNumber = eventDate.next_ticket_number;
    }

    // 3. 整理券データを一括作成（デジタルの場合、全チケットで共通のQRトークンを使用）
    /** 共通QRコード用トークン（1グループ1つ） */
    const sharedQrToken = mediumType === MEDIUM_TYPES.DIGITAL ? generateUUID() : null;
    /** 一括挿入用のチケットデータ配列 */
    const ticketsToInsert = [];
    for (let i = 0; i < quantity; i++) {
      ticketsToInsert.push({
        event_id: eventId,
        event_date_id: eventDateId,
        time_slot_id: timeSlotId || null,
        ticket_number: startTicketNumber + i,
        medium_type: mediumType,
        qr_token: sharedQrToken,
      });
    }

    // 4. 一括挿入
    const { data: tickets, error: insertError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select();

    if (insertError) throw insertError;

    // 5. 順次案内制の場合は次の整理番号を更新
    if (!timeSlotId) {
      const { error: updateDateError } = await supabase
        .from('event_dates')
        .update({ next_ticket_number: startTicketNumber + quantity })
        .eq('id', eventDateId)
        .eq('next_ticket_number', startTicketNumber); // 楽観的ロック

      if (updateDateError) throw updateDateError;
    }

    // 6. 時間枠定員制の場合は発券数を更新
    if (timeSlotId) {
      // 現在のカウントを取得
      const { data: currentSlot } = await supabase
        .from('time_slots')
        .select('current_count')
        .eq('id', timeSlotId)
        .single();

      // カウントを更新
      const newCount = (currentSlot?.current_count || 0) + quantity;
      await supabase
        .from('time_slots')
        .update({ current_count: newCount })
        .eq('id', timeSlotId);

      // 満員チェック
      if (capacity && newCount >= capacity) {
        await supabase
          .from('time_slots')
          .update({ status: STATUS.FULL })
          .eq('id', timeSlotId);
      }
    }

    // 7. 発券ログを記録
    await supabase
      .from('ticket_logs')
      .insert({
        ticket_id: tickets[0].id,
        action: 'issued_batch',
        details: {
          event_id: eventId,
          event_date_id: eventDateId,
          time_slot_id: timeSlotId,
          ticket_numbers: `${startTicketNumber}~${startTicketNumber + quantity - 1}`,
          quantity,
          medium_type: mediumType,
        },
      });

    return { data: tickets, error: null };
  } catch (error) {
    console.error('一括発券エラー:', error);
    return { data: null, error };
  }
};

/**
 * 企画開催日の整理券一覧を取得
 * @param {string} eventDateId - 企画開催日ID
 * @returns {Promise<{data: Array|null, error: Error|null}>} 整理券一覧
 */
export const selectTicketsByEventDateId = async (eventDateId) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_date_id', eventDateId)
      .order('ticket_number', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('整理券取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * QRトークンから整理券を取得
 * @param {string} qrToken - QRトークン
 * @returns {Promise<{data: Object|null, error: Error|null}>} 整理券データ
 */
export const selectTicketByQrToken = async (qrToken) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events_numbered_ticket:event_id (
          name,
          location,
          type
        ),
        event_dates:event_date_id (
          date
        ),
        time_slots:time_slot_id (
          start_time,
          end_time
        )
      `)
      .eq('qr_token', qrToken)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('整理券取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 発券可能な企画一覧を取得（発券中のもののみ）
 * @returns {Promise<{data: Array|null, error: Error|null}>} 企画一覧
 */
export const selectActiveEvents = async () => {
  try {
    const { data, error } = await supabase
      .from('events_numbered_ticket')
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

    // 発券中の開催日を持つ企画のみをフィルタリング
    const activeEvents = data?.filter(event =>
      event.event_dates?.some(ed => ed.status === STATUS.ACTIVE)
    ) || [];

    return { data: activeEvents, error: null };
  } catch (error) {
    console.error('企画取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 発券可能な時間枠一覧を取得
 * @param {string} eventDateId - 企画開催日ID
 * @param {number} capacity - 定員
 * @returns {Promise<{data: Array|null, error: Error|null}>} 時間枠一覧
 */
export const selectActiveTimeSlots = async (eventDateId, capacity) => {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_date_id', eventDateId)
      .in('status', [STATUS.ACTIVE, STATUS.NOT_STARTED])
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('時間枠取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * 電子整理券の発券予約を作成（お客さんが取得ボタンを押すまで番号は確定しない）
 * @param {Object} params - 発券パラメータ
 * @param {string} params.eventId - 企画ID
 * @param {string} params.eventDateId - 企画開催日ID
 * @param {string} params.timeSlotId - 時間枠ID（時間枠定員制のみ）
 * @param {number} params.quantity - 発券枚数
 * @param {number} params.capacity - 定員（時間枠定員制のみ）
 * @returns {Promise<{data: Object|null, error: Error|null}>} 予約データ（qr_tokenを含む）
 */
export const createTicketReservation = async ({ eventId, eventDateId, timeSlotId, quantity, capacity }) => {
  try {
    /** QRコード用トークン */
    const qrToken = generateUUID();

    // ticket_logsに発券予約を記録
    const { data: reservation, error: insertError } = await supabase
      .from('ticket_logs')
      .insert({
        ticket_id: null, // まだチケットは存在しない
        action: 'pending',
        details: {
          qr_token: qrToken,
          event_id: eventId,
          event_date_id: eventDateId,
          time_slot_id: timeSlotId || null,
          quantity,
          capacity,
          medium_type: MEDIUM_TYPES.DIGITAL,
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      data: {
        qr_token: qrToken,
        reservation_id: reservation.id,
      },
      error: null,
    };
  } catch (error) {
    console.error('発券予約エラー:', error);
    return { data: null, error };
  }
};
