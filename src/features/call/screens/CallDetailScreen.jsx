/**
 * 呼び出し詳細画面
 * 企画の日付を選択して整理券の呼び出しを行う
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
import { supabase } from '../../../services/supabase/client';
import { Button, TextInput, DateTabBar } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../shared/constants';
import { formatDateWithDay, formatTimeSlotDisplay } from '../../../shared/utils/dateTime';
import { useResponsive } from '../../../shared/hooks/useResponsive';

/**
 * 呼び出し詳細画面コンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.route - ルートオブジェクト
 * @param {Object} props.navigation - ナビゲーションオブジェクト
 * @returns {JSX.Element} 呼び出し詳細画面
 */
const CallDetailScreen = ({ route, navigation }) => {
  const { isMobile } = useResponsive();
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
  /** 呼び出し状態 */
  const [callStatus, setCallStatus] = useState(null);
  /** 入力中の呼び出し番号 */
  const [inputCallNumber, setInputCallNumber] = useState('');

  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** 更新処理中状態 */
  const [isUpdating, setIsUpdating] = useState(false);
  /** 全画面表示フラグ */
  const [isFullScreen, setIsFullScreen] = useState(false);
  /** 呼び出し表示データ */
  const [callDisplayData, setCallDisplayData] = useState(null);

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

  /**
   * 呼び出し状態を取得
   * @param {string} eventDateId - 企画開催日ID
   */
  const fetchCallStatus = useCallback(async (eventDateId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('call_status')
        .select('*')
        .eq('event_id', event.id)
        .eq('event_date_id', eventDateId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setCallStatus(data || { current_call_number: 0 });
    } catch (err) {
      console.error('呼び出し状態取得エラー:', err);
      setCallStatus({ current_call_number: 0 });
    }
  }, [event.id]);

  // 初回レンダリング時に最初の日付を選択
  useEffect(() => {
    if (eventDates.length > 0 && !selectedDate) {
      const firstDate = eventDates[0];
      setSelectedDate(firstDate);

      if (event.type === EVENT_TYPES.TIME_SLOT) {
        fetchTimeSlots(firstDate.id);
      } else {
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
    setInputCallNumber('');

    if (event.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(dateItem.id);
      setCallStatus(null);
    } else {
      setTimeSlots([]);
      fetchCallStatus(dateItem.id);
    }
  };

  /**
   * 時間枠定員制の呼び出しボタン押下
   */
  const handleCallTimeSlot = () => {
    if (!selectedTimeSlot || !selectedDate) return;

    setCallDisplayData({
      type: EVENT_TYPES.TIME_SLOT,
      eventName: event.name,
      date: selectedDate.date,
      timeSlot: selectedTimeSlot,
    });
    setIsFullScreen(true);
  };

  /**
   * 順次案内制の呼び出し更新ボタン押下
   */
  const handleUpdateCall = async () => {
    const newNumber = parseInt(inputCallNumber, 10);
    if (isNaN(newNumber) || newNumber <= 0) {
      if (Platform.OS === 'web') {
        window.alert('有効な番号を入力してください');
      } else {
        Alert.alert('エラー', '有効な番号を入力してください');
      }
      return;
    }

    if (newNumber <= (callStatus?.current_call_number || 0)) {
      if (Platform.OS === 'web') {
        window.alert('現在の呼び出し番号より大きい番号を入力してください');
      } else {
        Alert.alert('エラー', '現在の呼び出し番号より大きい番号を入力してください');
      }
      return;
    }

    setIsUpdating(true);

    try {
      // 既存のcall_statusを確認
      const { data: existingStatus, error: fetchError } = await supabase
        .from('call_status')
        .select('*')
        .eq('event_id', event.id)
        .eq('event_date_id', selectedDate.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingStatus) {
        // 更新
        const { error: updateError } = await supabase
          .from('call_status')
          .update({ current_call_number: newNumber })
          .eq('id', existingStatus.id);

        if (updateError) throw updateError;
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from('call_status')
          .insert({
            event_id: event.id,
            event_date_id: selectedDate.id,
            current_call_number: newNumber,
          });

        if (insertError) throw insertError;
      }

      // 呼び出し状態を更新
      setCallStatus({ ...callStatus, current_call_number: newNumber });

      // 全画面表示
      setCallDisplayData({
        type: EVENT_TYPES.SEQUENTIAL,
        eventName: event.name,
        callNumber: newNumber,
      });
      setIsFullScreen(true);
      setInputCallNumber('');
    } catch (err) {
      console.error('呼び出し更新エラー:', err);
      if (Platform.OS === 'web') {
        window.alert('呼び出し番号の更新に失敗しました');
      } else {
        Alert.alert('エラー', '呼び出し番号の更新に失敗しました');
      }
    }

    setIsUpdating(false);
  };

  /**
   * 全画面表示を終了
   */
  const exitFullScreen = () => {
    setIsFullScreen(false);
    setCallDisplayData(null);
  };

  /** 選択中の日付のステータスがアクティブかどうか */
  const isDateActive = selectedDate?.status === STATUS.ACTIVE;

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
                  この日は現在{STATUS_LABELS[selectedDate.status]}のため呼び出しできません
                </Text>
              </View>
            )}

            {/* 操作パネル（時間枠定員制） */}
            {event.type === EVENT_TYPES.TIME_SLOT && isDateActive && (
              <View style={styles.operationPanel}>
                <Button
                  title="呼び出し"
                  onPress={handleCallTimeSlot}
                  disabled={!selectedTimeSlot}
                  style={styles.callButton}
                />
              </View>
            )}

            {/* 操作パネル（順次案内制） */}
            {event.type === EVENT_TYPES.SEQUENTIAL && isDateActive && selectedDate && (
              <View style={styles.operationPanel}>
                <TextInput
                  label="呼び出し先番号"
                  value={inputCallNumber}
                  onChangeText={setInputCallNumber}
                  placeholder="番号を入力"
                  keyboardType="numeric"
                />
                <Button
                  title="呼び出し"
                  onPress={handleUpdateCall}
                  disabled={!inputCallNumber}
                  isLoading={isUpdating}
                  style={styles.callButton}
                />
              </View>
            )}
          </View>

          {/* 右側：時間枠選択または順次案内制の情報 */}
          <View style={[styles.rightPanel, isMobile && styles.panelMobile]}>
            {/* 時間枠定員制の場合 */}
            {event.type === EVENT_TYPES.TIME_SLOT && isDateActive && (
              <View style={[styles.timeSlotsContainer, isMobile && styles.timeSlotsContainerMobile]}>
                <Text style={styles.sectionTitle}>時間枠を選択して呼び出し</Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                ) : timeSlots.length > 0 ? (
                  <View style={[styles.timeSlotsGrid, isMobile && styles.timeSlotsGridMobile]}>
                    {/* 左列 */}
                    <View style={[styles.timeSlotsColumn, isMobile && styles.timeSlotsColumnMobile]}>
                      {timeSlots.slice(0, Math.ceil(timeSlots.length / 2)).map(slot => {
                        const isSlotSelected = selectedTimeSlot?.id === slot.id;

                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              styles.timeSlotItem,
                              isSlotSelected && styles.timeSlotItemSelected,
                            ]}
                            onPress={() => setSelectedTimeSlot(slot)}
                          >
                            <Text style={styles.timeSlotTime}>
                              {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                            </Text>
                            <Text style={styles.timeSlotCount}>
                              {slot.current_count}/{event.capacity_per_slot}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {/* 右列 */}
                    <View style={[styles.timeSlotsColumn, isMobile && styles.timeSlotsColumnMobile]}>
                      {timeSlots.slice(Math.ceil(timeSlots.length / 2)).map(slot => {
                        const isSlotSelected = selectedTimeSlot?.id === slot.id;

                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              styles.timeSlotItem,
                              isSlotSelected && styles.timeSlotItemSelected,
                            ]}
                            onPress={() => setSelectedTimeSlot(slot)}
                          >
                            <Text style={styles.timeSlotTime}>
                              {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                            </Text>
                            <Text style={styles.timeSlotCount}>
                              {slot.current_count}/{event.capacity_per_slot}
                            </Text>
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
              <View style={styles.sequentialContainer}>
                <View style={styles.statusBox}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>現在の呼び出し番号</Text>
                    <Text style={styles.statusValue}>{callStatus?.current_call_number || 0}</Text>
                  </View>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>最後尾番号</Text>
                    <Text style={styles.statusValue}>{(selectedDate.next_ticket_number || 1) - 1}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 全画面呼び出し表示モーダル */}
      <Modal
        visible={isFullScreen}
        animationType="fade"
        onRequestClose={exitFullScreen}
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.fullScreenContent}
            onPress={exitFullScreen}
            activeOpacity={1}
          >
            {callDisplayData?.type === EVENT_TYPES.TIME_SLOT && (
              <>
                <Text style={styles.fullScreenEvent}>{callDisplayData.eventName}</Text>
                <Text style={styles.fullScreenDate}>
                  {formatDateWithDay(callDisplayData.date)}
                </Text>
                <Text style={styles.fullScreenTimeSlot}>
                  {formatTimeSlotDisplay(
                    callDisplayData.timeSlot.start_time,
                    callDisplayData.timeSlot.end_time
                  )}
                </Text>
                <Text style={styles.fullScreenMessage}>の回</Text>
              </>
            )}

            {callDisplayData?.type === EVENT_TYPES.SEQUENTIAL && (
              <>
                <Text style={styles.fullScreenEvent}>{callDisplayData.eventName}</Text>
                <Text style={styles.fullScreenNumber}>{callDisplayData.callNumber}</Text>
                <Text style={styles.fullScreenMessage}>番の方</Text>
              </>
            )}

            <Text style={styles.fullScreenHint}>タップで戻る</Text>
          </TouchableOpacity>
        </SafeAreaView>
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
  /** スマホ用: 縦並び */
  mainRowMobile: {
    flexDirection: 'column',
  },
  leftPanel: {
    flex: 1,
  },
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
  timeSlotsGrid: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  /** スマホ用: 時間枠1列 */
  timeSlotsGridMobile: {
    flexDirection: 'column',
  },
  timeSlotsColumn: {
    flex: 1,
  },
  /** スマホ用: 時間枠列（幅100%） */
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
  sequentialContainer: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  statusBox: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  statusValue: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  callButton: {
    marginTop: SPACING.MD,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  fullScreenEvent: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: '600',
    color: COLORS.CARD_BACKGROUND,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  fullScreenDate: {
    fontSize: FONT_SIZES.XL,
    color: COLORS.CARD_BACKGROUND,
    marginBottom: SPACING.MD,
    opacity: 0.9,
  },
  fullScreenTimeSlot: {
    fontSize: FONT_SIZES.CALL_DISPLAY,
    fontWeight: 'bold',
    color: COLORS.CARD_BACKGROUND,
    marginBottom: SPACING.SM,
  },
  fullScreenNumber: {
    fontSize: FONT_SIZES.CALL_DISPLAY + 24,
    fontWeight: 'bold',
    color: COLORS.CARD_BACKGROUND,
    marginBottom: SPACING.SM,
  },
  fullScreenMessage: {
    fontSize: FONT_SIZES.HEADING,
    color: COLORS.CARD_BACKGROUND,
    opacity: 0.9,
  },
  fullScreenHint: {
    position: 'absolute',
    bottom: SPACING.XL,
    fontSize: FONT_SIZES.MD,
    color: COLORS.CARD_BACKGROUND,
    opacity: 0.6,
  },
});

export default CallDetailScreen;
