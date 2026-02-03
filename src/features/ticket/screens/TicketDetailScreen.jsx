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
import { issueTicket } from '../services/ticketService';
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
  SLOT_THRESHOLDS,
  SLOT_STATUS_COLORS,
} from '../../../shared/constants';
import { formatDateWithDay, formatTimeSlotDisplay } from '../../../shared/utils/dateTime';

/**
 * 配布状況の割合に応じた色を取得
 * @param {number} currentCount - 現在のカウント
 * @param {number} capacity - 定員
 * @returns {string} ステータスカラー
 */
const getSlotStatusColor = (currentCount, capacity) => {
  const rate = (currentCount / capacity) * 100;
  if (rate <= SLOT_THRESHOLDS.LOW) return SLOT_STATUS_COLORS.VERY_LOW;
  if (rate <= SLOT_THRESHOLDS.MEDIUM) return SLOT_STATUS_COLORS.LOW;
  if (rate <= SLOT_THRESHOLDS.HIGH) return SLOT_STATUS_COLORS.MEDIUM;
  if (rate <= SLOT_THRESHOLDS.VERY_HIGH) return SLOT_STATUS_COLORS.HIGH;
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

  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** 発券処理中状態 */
  const [isIssuing, setIsIssuing] = useState(false);
  /** 発券結果 */
  const [issuedTicket, setIssuedTicket] = useState(null);
  /** 結果モーダル表示状態 */
  const [showResultModal, setShowResultModal] = useState(false);

  /**
   * 企画の最新情報を取得
   */
  const fetchEventData = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
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
        .eq('id', event.id)
        .single();

      if (fetchError) throw fetchError;

      // 開催日を日付順でソート
      if (data.event_dates) {
        data.event_dates.sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      setEvent(data);
      setEventDates(data.event_dates || []);
    } catch (err) {
      console.error('企画取得エラー:', err);
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
      }
    }
  }, [eventDates, selectedDate, event.type, fetchTimeSlots]);

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
  };

  /** 媒体タイプの選択肢 */
  const mediumTypeOptions = [
    { label: MEDIUM_TYPE_LABELS[MEDIUM_TYPES.PAPER], value: MEDIUM_TYPES.PAPER },
    { label: MEDIUM_TYPE_LABELS[MEDIUM_TYPES.DIGITAL], value: MEDIUM_TYPES.DIGITAL },
  ];

  /**
   * 発券ボタン押下ハンドラ
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

    setIsIssuing(true);

    const { data, error: issueError } = await issueTicket({
      eventId: event.id,
      eventDateId: selectedDate.id,
      timeSlotId: selectedTimeSlot?.id || null,
      mediumType,
      capacity: event.capacity_per_slot,
    });

    setIsIssuing(false);

    if (issueError) {
      if (Platform.OS === 'web') {
        window.alert(issueError.message || '発券に失敗しました');
      } else {
        Alert.alert('発券エラー', issueError.message || '発券に失敗しました');
      }
      return;
    }

    // 発券結果を保存
    setIssuedTicket({
      ...data,
      eventName: event.name,
      eventLocation: event.location,
      eventType: event.type,
      eventDate: selectedDate.date,
      timeSlot: selectedTimeSlot,
    });
    setShowResultModal(true);

    // データを再取得
    fetchEventData();
    if (event.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(selectedDate.id);
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleCloseModal = () => {
    setShowResultModal(false);
    setIssuedTicket(null);
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
        <View style={styles.mainRow}>
          {/* 左側：企画情報・日付・操作パネル */}
          <View style={styles.leftPanel}>
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
                <Button
                  title="発券する"
                  onPress={handleIssue}
                  isLoading={isIssuing}
                  disabled={isIssueDisabled}
                  style={styles.issueButton}
                />
              </View>
            )}
          </View>

          {/* 右側：時間枠選択または順次案内制の情報 */}
          <View style={styles.rightPanel}>
            {/* 時間枠定員制の場合 */}
            {event.type === EVENT_TYPES.TIME_SLOT && isDateActive && (
              <View style={styles.timeSlotsContainer}>
                <Text style={styles.sectionTitle}>時間枠を選択</Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                ) : timeSlots.length > 0 ? (
                  <View style={styles.timeSlotsGrid}>
                    {/* 左列 */}
                    <View style={styles.timeSlotsColumn}>
                      {timeSlots.slice(0, Math.ceil(timeSlots.length / 2)).map(slot => {
                        const isSlotSelected = selectedTimeSlot?.id === slot.id;
                        const isSlotActive = slot.status === STATUS.ACTIVE;
                        const isFull = slot.current_count >= event.capacity_per_slot;
                        const statusColor = getSlotStatusColor(slot.current_count, event.capacity_per_slot);

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
                    <View style={styles.timeSlotsColumn}>
                      {timeSlots.slice(Math.ceil(timeSlots.length / 2)).map(slot => {
                        const isSlotSelected = selectedTimeSlot?.id === slot.id;
                        const isSlotActive = slot.status === STATUS.ACTIVE;
                        const isFull = slot.current_count >= event.capacity_per_slot;
                        const statusColor = getSlotStatusColor(slot.current_count, event.capacity_per_slot);

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

            {/* 順次案内制の場合 */}
            {event.type === EVENT_TYPES.SEQUENTIAL && isDateActive && selectedDate && (
              <View style={styles.nextNumberContainer}>
                <Text style={styles.nextNumberLabel}>次の整理番号</Text>
                <Text style={styles.nextNumber}>{selectedDate.next_ticket_number}</Text>
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
            <Text style={styles.modalTitle}>発券完了</Text>

            <View style={styles.ticketInfo}>
              <Text style={styles.ticketNumber}>No. {issuedTicket?.ticket_number}</Text>
              <Text style={styles.ticketEvent}>{issuedTicket?.eventName}</Text>
              <Text style={styles.ticketLocation}>{issuedTicket?.eventLocation}</Text>
              <Text style={styles.ticketDate}>
                {issuedTicket?.eventDate && formatDateWithDay(issuedTicket.eventDate)}
              </Text>
              {issuedTicket?.timeSlot && (
                <Text style={styles.ticketTimeSlot}>
                  {formatTimeSlotDisplay(
                    issuedTicket.timeSlot.start_time,
                    issuedTicket.timeSlot.end_time
                  )}
                </Text>
              )}
            </View>

            {issuedTicket?.medium_type === MEDIUM_TYPES.DIGITAL && issuedTicket?.qr_token && (
              <View style={styles.qrContainer}>
                <Text style={styles.qrLabel}>このQRコードを読み取ってください</Text>
                <View style={styles.qrCode}>
                  <QRCodeSVG
                    value={`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/digital_tickets/${issuedTicket.qr_token}`}
                    size={200}
                  />
                </View>
              </View>
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
  mainRow: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  leftPanel: {
    flex: 1,
  },
  rightPanel: {
    flex: 2,
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
  operationPanel: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  timeSlotsColumn: {
    flex: 1,
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
    backgroundColor: '#E5E5E5',
    opacity: 0.6,
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
  nextNumberContainer: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    alignItems: 'center',
  },
  nextNumberLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  nextNumber: {
    fontSize: FONT_SIZES.TITLE + 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
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
