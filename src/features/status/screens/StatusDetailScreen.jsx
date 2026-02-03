/**
 * 状況確認詳細画面
 * 企画の日付を選択して発券状況を確認する
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { DateTabBar } from '../../../shared/components';
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
import {
  formatDateWithDay,
  formatTimeSlotDisplay,
  calculateEstimatedWaitTime,
  formatWaitTime,
} from '../../../shared/utils/dateTime';

/**
 * 状況確認詳細画面コンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.route - ルートオブジェクト
 * @param {Object} props.navigation - ナビゲーションオブジェクト
 * @returns {JSX.Element} 状況確認詳細画面
 */
const StatusDetailScreen = ({ route, navigation }) => {
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
  /** 呼び出し状態 */
  const [callStatus, setCallStatus] = useState(null);

  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** リフレッシュ中状態 */
  const [isRefreshing, setIsRefreshing] = useState(false);

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

      // 選択中の日付を更新
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

  /**
   * データを更新
   */
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await fetchEventData();

    if (selectedDate) {
      if (event.type === EVENT_TYPES.TIME_SLOT) {
        await fetchTimeSlots(selectedDate.id);
      } else {
        await fetchCallStatus(selectedDate.id);
      }
    }

    setIsRefreshing(false);
  }, [fetchEventData, fetchTimeSlots, fetchCallStatus, selectedDate, event.type]);

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

    if (event.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(dateItem.id);
      setCallStatus(null);
    } else {
      setTimeSlots([]);
      fetchCallStatus(dateItem.id);
    }
  };

  /**
   * 発券率を計算
   * @param {number} current - 現在の発券数
   * @param {number} capacity - 定員
   * @returns {number} 発券率（%）
   */
  const calculateRate = (current, capacity) => {
    if (!capacity || capacity === 0) return 0;
    return Math.round((current / capacity) * 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 日付タブ */}
      <DateTabBar
        dates={eventDates}
        selectedDateId={selectedDate?.id}
        onSelectDate={handleSelectDate}
      />

      {/* メインコンテンツ */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />
        }
      >
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

        {/* 時間枠定員制の状況表示 */}
        {event.type === EVENT_TYPES.TIME_SLOT && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>時間枠ごとの発券状況</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : timeSlots.length === 0 ? (
              <Text style={styles.noDataText}>時間枠がありません</Text>
            ) : (
              <View style={styles.timeSlotsGrid}>
                {/* 左列 */}
                <View style={styles.timeSlotsColumn}>
                  {timeSlots.slice(0, Math.ceil(timeSlots.length / 2)).map((slot) => {
                    const rate = calculateRate(slot.current_count, event.capacity_per_slot);
                    return (
                      <View key={slot.id} style={styles.slotCard}>
                        <View style={styles.slotHeader}>
                          <Text style={styles.slotTime}>
                            {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                          </Text>
                          <View
                            style={[
                              styles.slotStatusBadge,
                              { backgroundColor: STATUS_COLORS[slot.status] },
                            ]}
                          >
                            <Text style={styles.slotStatusBadgeText}>
                              {STATUS_LABELS[slot.status]}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.slotBody}>
                          <Text style={styles.countText}>
                            {slot.current_count} / {event.capacity_per_slot}
                          </Text>
                          <View style={styles.progressBarContainer}>
                            <View
                              style={[
                                styles.progressBar,
                                {
                                  width: `${Math.min(rate, 100)}%`,
                                  backgroundColor: rate >= 100 ? COLORS.ERROR : COLORS.PRIMARY,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.rateText}>{rate}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {/* 右列 */}
                <View style={styles.timeSlotsColumn}>
                  {timeSlots.slice(Math.ceil(timeSlots.length / 2)).map((slot) => {
                    const rate = calculateRate(slot.current_count, event.capacity_per_slot);
                    return (
                      <View key={slot.id} style={styles.slotCard}>
                        <View style={styles.slotHeader}>
                          <Text style={styles.slotTime}>
                            {formatTimeSlotDisplay(slot.start_time, slot.end_time)}
                          </Text>
                          <View
                            style={[
                              styles.slotStatusBadge,
                              { backgroundColor: STATUS_COLORS[slot.status] },
                            ]}
                          >
                            <Text style={styles.slotStatusBadgeText}>
                              {STATUS_LABELS[slot.status]}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.slotBody}>
                          <Text style={styles.countText}>
                            {slot.current_count} / {event.capacity_per_slot}
                          </Text>
                          <View style={styles.progressBarContainer}>
                            <View
                              style={[
                                styles.progressBar,
                                {
                                  width: `${Math.min(rate, 100)}%`,
                                  backgroundColor: rate >= 100 ? COLORS.ERROR : COLORS.PRIMARY,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.rateText}>{rate}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 順次案内制の状況表示 */}
        {event.type === EVENT_TYPES.SEQUENTIAL && selectedDate && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>発券・呼び出し状況</Text>
            <View style={styles.sequentialCard}>
              <View style={styles.sequentialRow}>
                <View style={styles.sequentialItem}>
                  <Text style={styles.sequentialLabel}>現在の発券番号</Text>
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
      </ScrollView>
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
  statusSection: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  timeSlotsColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.MD,
  },
  noDataText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    padding: SPACING.MD,
  },
  slotCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  slotTime: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  slotStatusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 4,
  },
  slotStatusBadgeText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  slotBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
    width: 70,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: 4,
    marginHorizontal: SPACING.SM,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  rateText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT,
    width: 50,
    textAlign: 'right',
  },
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
});

export default StatusDetailScreen;
