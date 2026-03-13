/**
 * 発券詳細画面
 * 企画の日付を選択して整理券を発行する
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../../services/supabase/client';
import { issueTicket, issueMultipleTickets, createTicketReservation } from '../services/ticketService';
import { Button, RadioGroup, DateTabBar } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  MEDIUM_TYPES,
  MEDIUM_TYPE_LABELS,
  STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  SLOT_STATUS_COLORS,
} from '../../../shared/constants';
import { useSettings } from '../../../shared/contexts/SettingsContext';
import { formatDateWithDay, formatTimeSlotDisplay, calculateEstimatedWaitTime, formatWaitTime } from '../../../shared/utils/dateTime';
import { useResponsive } from '../../../shared/hooks/useResponsive';

/**
 * 配布状況の割合に応じた色を取得
 * @param {number} currentCount - 現在のカウント
 * @param {number} capacity - 定員
 * @param {Object} thresholds - 閾値オブジェクト（LOW, MEDIUM, HIGH, VERY_HIGH）
 * @returns {string} ステータスカラー
 */
const getSlotStatusColor = (currentCount, capacity, thresholds) => {
  const rate = (currentCount / capacity) * 100;
  if (rate <= thresholds.LOW) return SLOT_STATUS_COLORS.VERY_LOW;
  if (rate <= thresholds.MEDIUM) return SLOT_STATUS_COLORS.LOW;
  if (rate <= thresholds.HIGH) return SLOT_STATUS_COLORS.MEDIUM;
  if (rate <= thresholds.VERY_HIGH) return SLOT_STATUS_COLORS.HIGH;
  return SLOT_STATUS_COLORS.VERY_HIGH;
};

/**
 * 発券詳細画面コンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.route - ルートオブジェクト
 * @param {Object} props.navigation - ナビゲーションオブジェクト
 * @returns {JSX.Element} 発券詳細画面
 */
const TicketDetailScreen = ({ route, navigation }) => {
  const { isMobile } = useResponsive();
  const { slotThresholds } = useSettings();

  /** ルートパラメータから企画情報を取得 */
  const { event: initialEvent } = route.params;

  /** 初期開催日をソートして取得 */
  const sortedInitialDates = (initialEvent.event_dates || [])
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  /** 企画情報（最新） */
  const [event, setEvent] = useState(initialEvent);
  /** 開催日一覧 */
  const [eventDates, setEventDates] = useState(sortedInitialDates);
  /** 選択中の開催日 */
  const [selectedDate, setSelectedDate] = useState(null);
  /** 時間枠一覧 */
  const [timeSlots, setTimeSlots] = useState([]);
  /** 選択中の時間枠 */
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  /** 選択中の媒体タイプ */
  const [mediumType, setMediumType] = useState(MEDIUM_TYPES.PAPER);
  /** 発券枚数 */
  const [quantity, setQuantity] = useState(1);
  /** 呼び出し状態（順次案内制用） */
  const [callStatus, setCallStatus] = useState(null);

  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** 発券処理中状態 */
  const [isIssuing, setIsIssuing] = useState(false);
  /** 発券結果（複数枚対応） */
  const [issuedTickets, setIssuedTickets] = useState([]);
  /** 結果モーダル表示状態 */
  const [showResultModal, setShowResultModal] = useState(false);

  /**
   * 企画の最新情報を取得
   */
  const fetchEventData = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
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
        .eq('id', event.id)
        .single();

      if (fetchError) throw fetchError;

      // 開催日を日付順でソート
      if (data.event_dates) {
        data.event_dates.sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      setEvent(data);
      setEventDates(data.event_dates || []);

      // 選択中の日付を最新データで更新
      if (selectedDate) {
        const updatedDate = data.event_dates.find(d => d.id === selectedDate.id);
        if (updatedDate) {
          setSelectedDate(updatedDate);
        }
      }
    } catch (err) {
      console.error('企画取得エラー:', err);
    }
  }, [event.id, selectedDate]);

  /**
   * 呼び出し状態を取得（順次案内制用）
   * @param {string} eventDateId - 企画開催日ID
   */
  const fetchCallStatus = useCallback(async (eventDateId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('call_status')
        .select('current_call_number')
        .eq('event_id', event.id)
        .eq('event_date_id', eventDateId)
        .single();

      if (fetchError) {
        // 呼び出し状態がない場合は初期値
        setCallStatus({ current_call_number: 0 });
      } else {
        setCallStatus(data);
      }
    } catch (err) {
      console.error('呼び出し状態取得エラー:', err);
      setCallStatus({ current_call_number: 0 });
    }
  }, [event.id]);

  /**
   * 時間枠一覧を取得
   * @param {string} eventDateId - 企画開催日ID
   */
  const fetchTimeSlots = useCallback(async (eventDateId) => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_date_id', eventDateId)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setTimeSlots(data || []);
    } catch (err) {
      console.error('時間枠取得エラー:', err);
    }
    setIsLoading(false);
  }, []);

  // 初回レンダリング時に最初の日付を選択
  useEffect(() => {
    if (eventDates.length > 0 && !selectedDate) {
      const firstDate = eventDates[0];
      setSelectedDate(firstDate);

      if (event.type === EVENT_TYPES.TIME_SLOT) {
        fetchTimeSlots(firstDate.id);
      } else if (event.type === EVENT_TYPES.SEQUENTIAL) {
        fetchCallStatus(firstDate.id);
      }
    }
  }, [eventDates, selectedDate, event.type, fetchTimeSlots, fetchCallStatus]);

  // ヘッダータイトルを設定
  useEffect(() => {
    navigation.setOptions({
      headerTitle: event.name,
    });
  }, [navigation, event.name]);

  /**
   * 日付を選択
   * @param {Object} dateItem - 選択された日付
   */
  const handleSelectDate = (dateItem) => {
    setSelectedDate(dateItem);
    setSelectedTimeSlot(null);

    if (event.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(dateItem.id);
    } else {
      setTimeSlots([]);
    }

    // 順次案内制の場合は呼び出し状態を取得
    if (event.type === EVENT_TYPES.SEQUENTIAL) {
      fetchCallStatus(dateItem.id);
    }
  };

  /** 媒体タイプの選択肢 */
  const mediumTypeOptions = [
    { label: MEDIUM_TYPE_LABELS[MEDIUM_TYPES.PAPER], value: MEDIUM_TYPES.PAPER },
    { label: MEDIUM_TYPE_LABELS[MEDIUM_TYPES.DIGITAL], value: MEDIUM_TYPES.DIGITAL },
  ];

  /**
   * 発券ボタン押下ハンドラ（複数枚対応・電子媒体は予約方式）
   */
  const handleIssue = async () => {
    if (!selectedDate) return;

    // 時間枠定員制で時間枠が未選択の場合
    if (event.type === EVENT_TYPES.TIME_SLOT && !selectedTimeSlot) {
      if (Platform.OS === 'web') {
        window.alert('時間枠を選択してください');
      } else {
        Alert.alert('エラー', '時間枠を選択してください');
      }
      return;
    }

    /** バリデーション済み発券枚数 */
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));

    setIsIssuing(true);

    /** 発券パラメータ */
    const params = {
      eventId: event.id,
      eventDateId: selectedDate.id,
      timeSlotId: selectedTimeSlot?.id || null,
      mediumType,
      capacity: event.capacity_per_slot,
    };

    let result;

    // 電子媒体の場合は予約を作成（お客さんが取得ボタンを押すまで番号は確定しない）
    if (mediumType === MEDIUM_TYPES.DIGITAL) {
      result = await createTicketReservation({
        eventId: params.eventId,
        eventDateId: params.eventDateId,
        timeSlotId: params.timeSlotId,
        quantity: qty,
        capacity: params.capacity,
      });

      // 予約データを表示用に整形
      if (result.data) {
        result.data = [{
          qr_token: result.data.qr_token,
          medium_type: MEDIUM_TYPES.DIGITAL,
          quantity: qty,
          // 予約であることを示すフラグ
          is_reservation: true,
        }];
      }
    } else {
      // 紙媒体の場合は従来通り即座に発券
      if (qty === 1) {
        const { data, error } = await issueTicket(params);
        result = { data: data ? [data] : null, error };
      } else {
        result = await issueMultipleTickets({ ...params, quantity: qty });
      }
    }

    setIsIssuing(false);

    if (result.error) {
      if (Platform.OS === 'web') {
        window.alert(result.error.message || '発券に失敗しました');
      } else {
        Alert.alert('発券エラー', result.error.message || '発券に失敗しました');
      }
      return;
    }

    // 発券/予約結果を保存（共通情報を付与）
    const ticketsWithInfo = result.data.map((ticket) => ({
      ...ticket,
      eventName: event.name,
      eventLocation: event.location,
      eventType: event.type,
      eventDate: selectedDate.date,
      timeSlot: selectedTimeSlot,
    }));
    setIssuedTickets(ticketsWithInfo);
    setShowResultModal(true);

    // データを再取得（発券後に表示を即時更新）
    fetchEventData();
    if (event.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(selectedDate.id);
    } else if (event.type === EVENT_TYPES.SEQUENTIAL) {
      fetchCallStatus(selectedDate.id);
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleCloseModal = () => {
    setShowResultModal(false);
    setIssuedTickets([]);
    setQuantity(1);
  };

  /** 選択中の日付のステータスがアクティブかどうか */
  const isDateActive = selectedDate?.status === STATUS.ACTIVE;

  /** 発券ボタンを無効にするかどうか */
  const isIssueDisabled =
    !isDateActive ||
    (event.type === EVENT_TYPES.TIME_SLOT && !selectedTimeSlot);

  return (
    <SafeAreaView style={styles.container}>
      {/* 日付タブ */}
      <DateTabBar
        dates={eventDates}
        selectedDateId={selectedDate?.id}
        onSelectDate={handleSelectDate}
      />

      {/* メインコンテンツ */}
      <ScrollView style={styles.content}>
        <View style={[styles.mainRow, isMobile && styles.mainRowMobile]}>
          {/* 左側：企画情報・日付・操作パネル */}
          <View style={[styles.leftPanel, isMobile && styles.panelMobile]}>
            {/* 企画情報 */}
            <View style={styles.eventInfo}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventName}>{event.name}</Text>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: event.type === EVENT_TYPES.TIME_SLOT ? COLORS.PRIMARY : COLORS.SECONDARY },
                  ]}
                >
                  <Text style={styles.typeBadgeText}>{EVENT_TYPE_LABELS[event.type]}</Text>
                </View>
              </View>
              <Text style={styles.eventLocation}>{event.location}</Text>
            </View>

            {/* 選択中の日付の情報 */}
            {selectedDate && (
              <View style={styles.dateInfo}>
                <Text style={styles.dateText}>{formatDateWithDay(selectedDate.date)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedDate.status] }]}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABELS[selectedDate.status]}</Text>
                </View>
              </View>
            )}

            {/* ステータスが発券中でない場合の警告 */}
            {selectedDate && !isDateActive && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  この日は現在{STATUS_LABELS[selectedDate.status]}のため発券できません
                </Text>
              </View>
            )}

            {/* 操作パネル */}
            {isDateActive && (
              <View style={styles.operationPanel}>
                <RadioGroup
                  label="発行媒体"
                  options={mediumTypeOptions}
                  value={mediumType}
                  onValueChange={setMediumType}
                />

                {/* 人数入力 */}
                <View style={styles.quantitySection}>
                  <Text style={styles.quantityLabel}>発券枚数</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                    >
                      <Text style={[styles.quantityButtonText, quantity <= 1 && styles.quantityButtonTextDisabled]}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity((prev) => prev + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Button
                  title={quantity > 1 ? `${quantity}枚 発券する` : '発券する'}
                  onPress={handleIssue}
                  isLoading={isIssuing}
                  disabled={isIssueDisabled}
                  style={styles.issueButton}
                />
              </View>
            )}
          </View>

          {/* 右側：時間枠選択または順次案内制の情報 */}
          <View style={[styles.rightPanel, isMobile && styles.panelMobile]}>
            {/* 時間枠定員制の場合 */}
            {event.type === EVENT_TYPES.TIME_SLOT && isDateActive && (
              <View style={[styles.timeSlotsContainer, isMobile && styles.timeSlotsContainerMobile]}>
                <Text style={styles.sectionTitle}>時間枠を選択</Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                ) : timeSlots.length > 0 ? (
                  <View style={[styles.timeSlotsGrid, isMobile && styles.timeSlotsGridMobile]}>
                    {/* 左列 */}
                    <View style={[styles.timeSlotsColumn, isMobile && styles.timeSlotsColumnMobile]}>
                      {timeSlots.slice(0, Math.ceil(timeSlots.length / 2)).map(slot => {
                        const isSlotSelected = selectedTimeSlot?.id === slot.id;
                        const isSlotActive = slot.status === STATUS.ACTIVE;
                        const isFull = slot.current_count >= event.capacity_per_slot;
                        const statusColor = getSlotStatusColor(slot.current_count, event.capacity_per_slot, slotThresholds);

                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              styles.timeSlotItem,
                              isSlotSelected && styles.timeSlotItemSelected,
                              (!isSlotActive || isFull) && styles.timeSlotItemDisabled,
                            ]}
                            onPress={() => isSlotActive && !isFull && setSelectedTimeSlot(slot)}
                            disabled={!isSlotActive || isFull}
                          >
                            <Text style={styles.timeSlotTime}>
                              {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                              <Text style={[
                                styles.timeSlotCount,
                                isSlotActive && !isFull && { color: statusColor, fontWeight: 'bold' },
                              ]}>
                                {slot.current_count}
                              </Text>
                              <Text style={styles.timeSlotCount}>
                                /{event.capacity_per_slot}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {/* 右列 */}
                    <View style={[styles.timeSlotsColumn, isMobile && styles.timeSlotsColumnMobile]}>
                      {timeSlots.slice(Math.ceil(timeSlots.length / 2)).map(slot => {
                        const isSlotSelected = selectedTimeSlot?.id === slot.id;
                        const isSlotActive = slot.status === STATUS.ACTIVE;
                        const isFull = slot.current_count >= event.capacity_per_slot;
                        const statusColor = getSlotStatusColor(slot.current_count, event.capacity_per_slot, slotThresholds);

                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              styles.timeSlotItem,
                              isSlotSelected && styles.timeSlotItemSelected,
                              (!isSlotActive || isFull) && styles.timeSlotItemDisabled,
                            ]}
                            onPress={() => isSlotActive && !isFull && setSelectedTimeSlot(slot)}
                            disabled={!isSlotActive || isFull}
                          >
                            <Text style={styles.timeSlotTime}>
                              {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                              <Text style={[
                                styles.timeSlotCount,
                                isSlotActive && !isFull && { color: statusColor, fontWeight: 'bold' },
                              ]}>
                                {slot.current_count}
                              </Text>
                              <Text style={styles.timeSlotCount}>
                                /{event.capacity_per_slot}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noSlotsText}>時間枠が設定されていません</Text>
                )}
              </View>
            )}

            {/* 順次案内制の状況表示（状況確認画面と同じ） */}
            {event.type === EVENT_TYPES.SEQUENTIAL && isDateActive && selectedDate && (
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>発券・呼び出し状況</Text>
                <View style={styles.sequentialCard}>
                  <View style={styles.sequentialRow}>
                    <View style={styles.sequentialItem}>
                      <Text style={styles.sequentialLabel}>最後尾番号</Text>
                      <Text style={styles.sequentialValue}>
                        {(selectedDate.next_ticket_number || 1) - 1}
                      </Text>
                    </View>
                    <View style={styles.sequentialItem}>
                      <Text style={styles.sequentialLabel}>現在の呼び出し番号</Text>
                      <Text style={styles.sequentialValue}>
                        {callStatus?.current_call_number || 0}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.waitTimeContainer}>
                    <Text style={styles.waitTimeLabel}>推定待ち時間</Text>
                    <Text style={styles.waitTimeValue}>
                      {formatWaitTime(
                        calculateEstimatedWaitTime(
                          selectedDate.next_ticket_number || 1,
                          callStatus?.current_call_number || 0,
                          event.estimated_wait_minutes || 5
                        )
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 発券結果モーダル */}
      <Modal
        visible={showResultModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 予約の場合 */}
            {issuedTickets.length > 0 && issuedTickets[0]?.is_reservation ? (
              <>
                <Text style={styles.modalTitle}>
                  QRコード発行完了{issuedTickets[0]?.quantity > 1 ? `（${issuedTickets[0].quantity}人分）` : ''}
                </Text>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketEvent}>{issuedTickets[0]?.eventName}</Text>
                  <Text style={styles.ticketLocation}>{issuedTickets[0]?.eventLocation}</Text>
                  <Text style={styles.ticketDate}>
                    {issuedTickets[0]?.eventDate && formatDateWithDay(issuedTickets[0].eventDate)}
                  </Text>
                  {issuedTickets[0]?.timeSlot && (
                    <Text style={styles.ticketTimeSlot}>
                      {formatTimeSlotDisplay(
                        issuedTickets[0].timeSlot.start_time,
                        issuedTickets[0].timeSlot.end_time
                      )}
                    </Text>
                  )}
                  <View style={styles.reservationNotice}>
                    <Text style={styles.reservationNoticeText}>
                      ※ お客様がこのQRコードを読み取り、取得ボタンを押すと整理番号が確定します
                    </Text>
                  </View>
                </View>
                <View style={styles.qrContainer}>
                  <Text style={styles.qrLabel}>このQRコードを読み取ってください</Text>
                  <View style={styles.qrCode}>
                    <QRCodeSVG
                      value={`${process.env.EXPO_PUBLIC_TICKET_PAGE_URL}/?token=${issuedTickets[0].qr_token}`}
                      size={200}
                    />
                  </View>
                </View>
              </>
            ) : (
              /* 通常の発券の場合 */
              <>
                <Text style={styles.modalTitle}>
                  発券完了{issuedTickets.length > 1 ? `（${issuedTickets.length}枚）` : ''}
                </Text>
                {issuedTickets.length > 0 && (
                  <View style={styles.ticketInfo}>
                    {issuedTickets.length === 1 ? (
                      <Text style={styles.ticketNumber}>No. {issuedTickets[0]?.ticket_number}</Text>
                    ) : (
                      <Text style={styles.ticketNumber}>
                        No. {issuedTickets[0]?.ticket_number} ~ {issuedTickets[issuedTickets.length - 1]?.ticket_number}
                      </Text>
                    )}
                    <Text style={styles.ticketEvent}>{issuedTickets[0]?.eventName}</Text>
                    <Text style={styles.ticketLocation}>{issuedTickets[0]?.eventLocation}</Text>
                    <Text style={styles.ticketDate}>
                      {issuedTickets[0]?.eventDate && formatDateWithDay(issuedTickets[0].eventDate)}
                    </Text>
                    {issuedTickets[0]?.timeSlot && (
                      <Text style={styles.ticketTimeSlot}>
                        {formatTimeSlotDisplay(
                          issuedTickets[0].timeSlot.start_time,
                          issuedTickets[0].timeSlot.end_time
                        )}
                      </Text>
                    )}
                  </View>
                )}
                {/* デジタル媒体のQRコード表示（1グループ1つ） */}
                {issuedTickets.length > 0 && issuedTickets[0]?.medium_type === MEDIUM_TYPES.DIGITAL && issuedTickets[0]?.qr_token && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>このQRコードを読み取ってください</Text>
                    <View style={styles.qrCode}>
                      <QRCodeSVG
                        value={`${process.env.EXPO_PUBLIC_TICKET_PAGE_URL}/?token=${issuedTickets[0].qr_token}`}
                        size={200}
                      />
                    </View>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
              <Text style={styles.closeButtonText}>閉じる</Text>
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
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  /** PC用: 横並び */
  mainRow: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  /** スマホ用: 縦並び */
  mainRowMobile: {
    flexDirection: 'column',
  },
  /** PC用: 左パネル */
  leftPanel: {
    flex: 1,
  },
  /** PC用: 右パネル */
  rightPanel: {
    flex: 2,
  },
  /** スマホ用: パネル（幅100%） */
  panelMobile: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    marginBottom: SPACING.MD,
  },
  eventInfo: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  eventName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: SPACING.SM,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  eventLocation: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  dateText: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: COLORS.WARNING + '20',
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.MD,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.WARNING,
  },
  warningText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.WARNING,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.SM,
  },
  timeSlotsContainer: {
    flex: 1,
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
  },
  /** スマホ用: 時間枠コンテナ（コンテンツに合わせてサイズ） */
  timeSlotsContainerMobile: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  operationPanel: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
  },
  /** PC用: 時間枠グリッド（2列） */
  timeSlotsGrid: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  /** スマホ用: 時間枠グリッド（1列） */
  timeSlotsGridMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  /** PC用: 時間枠カラム */
  timeSlotsColumn: {
    flex: 1,
  },
  /** スマホ用: 時間枠カラム（幅100%） */
  timeSlotsColumnMobile: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.SM + 4,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 8,
    marginBottom: SPACING.XS,
    borderWidth: 1,
    borderColor: '#666666',
  },
  timeSlotItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  timeSlotItemDisabled: {
    backgroundColor: COLORS.DISABLED,
    borderColor: 'transparent',
  },
  timeSlotTime: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  timeSlotCount: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  noSlotsText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: SPACING.MD,
  },
  /** 状況表示セクション */
  statusSection: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  /** 順次案内制カード */
  sequentialCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.LG,
  },
  sequentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.LG,
  },
  sequentialItem: {
    alignItems: 'center',
  },
  sequentialLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  sequentialValue: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  waitTimeContainer: {
    alignItems: 'center',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  waitTimeLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  waitTimeValue: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  quantitySection: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  quantityLabel: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.MD,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.CARD_BACKGROUND,
  },
  quantityButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  quantityValue: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    minWidth: 40,
    textAlign: 'center',
  },
  issueButton: {
    marginTop: SPACING.SM,
    marginBottom: SPACING.LG,
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
    marginBottom: SPACING.LG,
  },
  ticketInfo: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  ticketNumber: {
    fontSize: FONT_SIZES.TITLE + 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: SPACING.SM,
  },
  ticketEvent: {
    fontSize: FONT_SIZES.XL,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  ticketLocation: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  ticketDate: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  ticketTimeSlot: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  reservationNotice: {
    backgroundColor: COLORS.WARNING + '20',
    padding: SPACING.SM,
    borderRadius: 8,
    marginTop: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.WARNING,
  },
  reservationNoticeText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  qrLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  qrCode: {
    padding: SPACING.MD,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 8,
  },
  closeButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM + 4,
    paddingHorizontal: SPACING.XL,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.CARD_BACKGROUND,
  },
});

export default TicketDetailScreen;
