/**
 * 呼び出し詳細画面
 * 企画の日付を選択して整理券の呼び出しを行う
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { selectTicketGroupsForCall } from '../services/callService';
import { Button, DateTabBar } from '../../../shared/components';
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
 * グループリストの1アイテムの高さ（スクロール位置計算用）
 * groupItem: padding(12)*2 + lineHeight(~20) + marginBottom(4) = 48
 */
const GROUP_ITEM_HEIGHT = 48;

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
  /** 発券グループ一覧 */
  const [ticketGroups, setTicketGroups] = useState([]);
  /** 選択中のグループ */
  const [selectedGroup, setSelectedGroup] = useState(null);
  /** スマホ用グループリストのFlatList参照 */
  const mobileGroupListRef = useRef(null);
  /** PC用グループリストのScrollView参照 */
  const desktopGroupListRef = useRef(null);

  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** 更新処理中状態 */
  const [isUpdating, setIsUpdating] = useState(false);
  /** 全画面表示フラグ */
  const [isFullScreen, setIsFullScreen] = useState(false);
  /** 呼び出し表示データ */
  const [callDisplayData, setCallDisplayData] = useState(null);

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
   * 発券グループ一覧を取得（順次案内制用）
   * @param {string} eventDateId - 企画開催日ID
   */
  const fetchTicketGroups = useCallback(async (eventDateId) => {
    setIsLoading(true);
    const { data } = await selectTicketGroupsForCall(eventDateId);
    setTicketGroups(data || []);
    setIsLoading(false);
  }, []);

  // 初回レンダリング時に最初の日付を選択
  useEffect(() => {
    if (eventDates.length > 0 && !selectedDate) {
      const firstDate = eventDates[0];
      setSelectedDate(firstDate);

      if (event.type === EVENT_TYPES.TIME_SLOT) {
        fetchTimeSlots(firstDate.id);
      } else {
        fetchCallStatus(firstDate.id);
        fetchTicketGroups(firstDate.id);
      }
    }
  }, [eventDates, selectedDate, event.type, fetchTimeSlots, fetchCallStatus, fetchTicketGroups]);

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
    setSelectedGroup(null);

    if (event.type === EVENT_TYPES.TIME_SLOT) {
      fetchTimeSlots(dateItem.id);
      setCallStatus(null);
    } else {
      setTimeSlots([]);
      fetchCallStatus(dateItem.id);
      fetchTicketGroups(dateItem.id);
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
   * グループを選択
   * @param {Object} group - グループデータ
   */
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
  };

  /**
   * 選択グループが既に呼び出し済みかどうか
   * @param {Object} group - グループデータ
   * @returns {boolean} 呼び出し済みかどうか
   */
  const isGroupCalled = (group) => {
    const currentCallNumber = callStatus?.current_call_number || 0;
    return group.max_ticket <= currentCallNumber;
  };

  /**
   * 選択中グループが訂正モードかどうか（呼び出し済みを再選択）
   */
  const isCorrectingCall = selectedGroup && isGroupCalled(selectedGroup);

  /**
   * 選択グループを呼び出す際の新規呼び出し合計人数を計算
   * 現在の呼び出し番号の次から選択グループの最後まで
   * @returns {number} 新規呼び出し人数
   */
  const calcNewCallCount = () => {
    if (!selectedGroup) return 0;
    const currentCallNumber = callStatus?.current_call_number || 0;
    return Math.max(0, selectedGroup.max_ticket - currentCallNumber);
  };

  /**
   * 順次案内制の呼び出し実行
   */
  const handleUpdateCall = async () => {
    if (!selectedGroup) return;

    /** 呼び出し先番号（選択グループの最大チケット番号） */
    const newNumber = selectedGroup.max_ticket;

    // 訂正モードの場合は警告を表示
    if (isCorrectingCall) {
      const confirmed = Platform.OS === 'web'
        ? window.confirm(`${newNumber}番まで戻して呼び出しますか？`)
        : await new Promise(resolve =>
            Alert.alert(
              '呼び出し訂正',
              `${newNumber}番まで戻して呼び出しますか？`,
              [
                { text: 'キャンセル', onPress: () => resolve(false), style: 'cancel' },
                { text: '呼び出す', onPress: () => resolve(true) },
              ]
            )
          );
      if (!confirmed) return;
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

      // 呼び出し状態をローカルで更新
      setCallStatus(prev => ({ ...prev, current_call_number: newNumber }));
      setSelectedGroup(null);

      // 全画面表示
      setCallDisplayData({
        type: EVENT_TYPES.SEQUENTIAL,
        eventName: event.name,
        callNumber: newNumber,
      });
      setIsFullScreen(true);
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

  /**
   * グループリストの初期スクロール位置を設定（スマホ・PC共通）
   * 呼び出し済みの最後から2件目が見えるようにスクロールする
   */
  useEffect(() => {
    if (event.type !== EVENT_TYPES.SEQUENTIAL) return;
    if (ticketGroups.length === 0) return;

    const currentCallNumber = callStatus?.current_call_number || 0;
    /** 最初の未呼び出しグループのインデックス */
    const firstUncalledIndex = ticketGroups.findIndex(
      (g) => g.min_ticket > currentCallNumber
    );

    /** 呼び出し済みが2件以上見えるように2つ前にスクロール */
    const scrollToIndex = Math.max(0, firstUncalledIndex - 2);
    if (scrollToIndex === 0) return;

    /** レンダリング完了後にスクロール */
    const timer = setTimeout(() => {
      if (isMobile) {
        mobileGroupListRef.current?.scrollToIndex({
          index: scrollToIndex,
          animated: false,
        });
      } else {
        desktopGroupListRef.current?.scrollTo({
          y: scrollToIndex * GROUP_ITEM_HEIGHT,
          animated: false,
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [ticketGroups, callStatus, isMobile, event.type]);

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

      {/* スマホ×順次案内制：専用レイアウト（グループリスト中央固定＋下部ボタン） */}
      {isMobile && event.type === EVENT_TYPES.SEQUENTIAL ? (
        <View style={styles.mobileSeqContainer}>
          {/* 企画情報（企画名＋順次案内制バッジ＋場所） */}
          <View style={[styles.eventInfo, styles.mobileSeqEventInfo]}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventName}>{event.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: COLORS.SECONDARY }]}>
                <Text style={styles.typeBadgeText}>{EVENT_TYPE_LABELS[event.type]}</Text>
              </View>
            </View>
            <Text style={styles.eventLocation}>{event.location}</Text>
          </View>

          {/* 非アクティブ警告 */}
          {selectedDate && !isDateActive && (
            <View style={[styles.warningContainer, styles.mobileSeqWarning]}>
              <Text style={styles.warningText}>
                この日は現在{STATUS_LABELS[selectedDate.status]}のため呼び出しできません
              </Text>
            </View>
          )}

          {/* グループリスト（flex:1でスクロール可能な中央エリア） */}
          <View style={styles.mobileGroupArea}>
            {isDateActive && selectedDate && (
              <Text style={styles.sectionTitle}>グループを選択して呼び出し</Text>
            )}
            {isDateActive && selectedDate && (
              isLoading ? (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              ) : ticketGroups.length > 0 ? (
                <FlatList
                  ref={mobileGroupListRef}
                  data={ticketGroups}
                  keyExtractor={(group) => String(group.group_number)}
                  style={styles.mobileGroupScroll}
                  contentContainerStyle={styles.mobileGroupScrollContent}
                  /** scrollToIndexに必要な固定レイアウト情報 */
                  getItemLayout={(_, index) => ({
                    length: GROUP_ITEM_HEIGHT,
                    offset: GROUP_ITEM_HEIGHT * index,
                    index,
                  })}
                  onScrollToIndexFailed={(info) => {
                    /** フォールバック：近似オフセットでスクロール */
                    mobileGroupListRef.current?.scrollToOffset({
                      offset: info.averageItemLength * info.index,
                      animated: false,
                    });
                  }}
                  renderItem={({ item: group }) => {
                    /** このグループが呼び出し済みかどうか */
                    const called = isGroupCalled(group);
                    /** このグループが選択中かどうか */
                    const isSelected = selectedGroup?.group_number === group.group_number;
                    /** チケット番号の表示文字列 */
                    const ticketLabel = group.min_ticket === group.max_ticket
                      ? `No. ${group.min_ticket}`
                      : `No. ${group.min_ticket} 〜 ${group.max_ticket}`;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.groupItem,
                          called && styles.groupItemCalled,
                          isSelected && styles.groupItemSelected,
                          isSelected && called && styles.groupItemSelectedCorrection,
                        ]}
                        onPress={() => handleSelectGroup(group)}
                      >
                        <View style={styles.groupItemLeft}>
                          {called && (
                            <Text style={[styles.calledBadge, isSelected && styles.calledBadgeSelected]}>呼び出し済み</Text>
                          )}
                          {called && (
                            <Text style={[styles.groupCheckmark, isSelected && styles.groupCheckmarkSelected]}>✓</Text>
                          )}
                          <Text style={[
                            styles.groupTicketLabel,
                            called && styles.groupTicketLabelCalled,
                            isSelected && styles.groupTicketLabelSelected,
                          ]}>
                            {ticketLabel}
                          </Text>
                        </View>
                        {called && (
                          <Text style={[styles.calledHint, isSelected && styles.calledHintSelected]}>
                            タップで訂正
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : (
                <Text style={styles.noSlotsText}>まだ発券されていません</Text>
              )
            )}
          </View>

          {/* 下部固定バー：現在の呼び出し番号＋選択グループプレビュー＋ボタン */}
          {isDateActive && selectedDate && (
            <View style={styles.mobileBottomBar}>
              {/* 現在の呼び出し番号（PC版のcurrentCallBoxと同スタイル） */}
              <View style={styles.currentCallBox}>
                <Text style={styles.currentCallLabel}>現在の呼び出し番号</Text>
                <Text style={styles.currentCallValue}>
                  {callStatus?.current_call_number || 0}
                </Text>
              </View>

              {/* 選択グループのプレビュー */}
              {selectedGroup && (
                <View style={[
                  styles.selectedGroupPreview,
                  isCorrectingCall && styles.selectedGroupPreviewCorrection,
                ]}>
                  {isCorrectingCall ? (
                    <Text style={styles.correctionLabel}>呼び出し訂正中</Text>
                  ) : (
                    <>
                      <Text style={styles.newCallCountLabel}>呼び出し合計人数</Text>
                      <Text style={styles.newCallCountValue}>{calcNewCallCount()}</Text>
                    </>
                  )}
                </View>
              )}

              <Button
                title="呼び出し"
                onPress={handleUpdateCall}
                disabled={!selectedGroup}
                isLoading={isUpdating}
                style={styles.callButton}
              />
            </View>
          )}
        </View>
      ) : (
        /* デスクトップ／時間枠定員制：既存の左右パネルレイアウト */
        <View style={styles.content}>
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

              {/* 操作パネル（順次案内制・デスクトップ） */}
              {event.type === EVENT_TYPES.SEQUENTIAL && isDateActive && selectedDate && (
                <View style={styles.operationPanel}>
                  {/* 現在の呼び出し番号 */}
                  <View style={styles.currentCallBox}>
                    <Text style={styles.currentCallLabel}>現在の呼び出し番号</Text>
                    <Text style={styles.currentCallValue}>
                      {callStatus?.current_call_number || 0}
                    </Text>
                  </View>

                  {/* 選択グループのプレビュー */}
                  {selectedGroup && (
                    <View style={[
                      styles.selectedGroupPreview,
                      isCorrectingCall && styles.selectedGroupPreviewCorrection,
                    ]}>
                      {isCorrectingCall ? (
                        <Text style={styles.correctionLabel}>呼び出し訂正中</Text>
                      ) : (
                        <>
                          <Text style={styles.newCallCountLabel}>呼び出し合計人数</Text>
                          <Text style={styles.newCallCountValue}>{calcNewCallCount()}</Text>
                        </>
                      )}
                    </View>
                  )}

                  <Button
                    title="呼び出し"
                    onPress={handleUpdateCall}
                    disabled={!selectedGroup}
                    isLoading={isUpdating}
                    style={styles.callButton}
                  />
                </View>
              )}
            </View>

            {/* 右側：時間枠選択または順次案内制のグループリスト */}
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

              {/* 順次案内制の場合：グループリスト（デスクトップ） */}
              {event.type === EVENT_TYPES.SEQUENTIAL && isDateActive && selectedDate && (
                <View style={styles.groupListContainer}>
                  <Text style={styles.sectionTitle}>グループを選択して呼び出し</Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                  ) : ticketGroups.length > 0 ? (
                    <ScrollView ref={desktopGroupListRef} style={styles.groupListScroll} nestedScrollEnabled>
                      {ticketGroups.map((group) => {
                        /** このグループが呼び出し済みかどうか */
                        const called = isGroupCalled(group);
                        /** このグループが選択中かどうか */
                        const isSelected = selectedGroup?.group_number === group.group_number;
                        /** チケット番号の表示文字列 */
                        const ticketLabel = group.min_ticket === group.max_ticket
                          ? `No. ${group.min_ticket}`
                          : `No. ${group.min_ticket} 〜 ${group.max_ticket}`;

                        return (
                          <TouchableOpacity
                            key={group.group_number}
                            style={[
                              styles.groupItem,
                              called && styles.groupItemCalled,
                              isSelected && styles.groupItemSelected,
                              isSelected && called && styles.groupItemSelectedCorrection,
                            ]}
                            onPress={() => handleSelectGroup(group)}
                          >
                            <View style={styles.groupItemLeft}>
                              {called && (
                                <Text style={[styles.calledBadge, isSelected && styles.calledBadgeSelected]}>呼び出し済み</Text>
                              )}
                              {called && (
                                <Text style={[styles.groupCheckmark, isSelected && styles.groupCheckmarkSelected]}>✓</Text>
                              )}
                              <Text style={[
                                styles.groupTicketLabel,
                                called && styles.groupTicketLabelCalled,
                                isSelected && styles.groupTicketLabelSelected,
                              ]}>
                                {ticketLabel}
                              </Text>
                            </View>
                            {called && (
                              <Text style={[styles.calledHint, isSelected && styles.calledHintSelected]}>
                                タップで訂正
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noSlotsText}>まだ発券されていません</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

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
                <Text style={styles.fullScreenMessage}>番まで呼び出し中</Text>
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
    flex: 1,
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
    /** グループリストが高さを使えるようにflexコンテナとして設定 */
    flexDirection: 'column',
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
  /** スマホ用: 時間枠コンテナ */
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
  /** 現在の呼び出し番号表示ボックス */
  currentCallBox: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  currentCallLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  currentCallValue: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  /** 選択グループのプレビュー（通常） */
  selectedGroupPreview: {
    backgroundColor: COLORS.PRIMARY + '15',
    borderRadius: 8,
    padding: SPACING.SM,
    alignItems: 'center',
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  /** 選択グループのプレビュー（訂正中） */
  selectedGroupPreviewCorrection: {
    backgroundColor: COLORS.WARNING + '15',
    borderColor: COLORS.WARNING,
  },
  newCallCountLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    marginBottom: 2,
  },
  newCallCountValue: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  correctionLabel: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.WARNING,
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
  /** 順次案内制グループリスト */
  groupListContainer: {
    flex: 1,
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 12,
  },
  /** グループリストのスクロールエリア */
  groupListScroll: {
    flex: 1,
  },
  /** グループ行（通常） */
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.SM + 4,
    borderRadius: 8,
    marginBottom: SPACING.XS,
    borderWidth: 1,
    borderColor: '#666666',
    backgroundColor: COLORS.CARD_BACKGROUND,
  },
  /** グループ行（呼び出し済み）：緑系で「完了」感を出す */
  groupItemCalled: {
    backgroundColor: COLORS.SUCCESS + '12',
    borderColor: COLORS.SUCCESS + '60',
  },
  /** グループ行（選択中・通常） */
  groupItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  /** グループ行（選択中・訂正） */
  groupItemSelectedCorrection: {
    borderColor: COLORS.WARNING,
    backgroundColor: COLORS.WARNING + '10',
  },
  /** グループ行の左側（チェックマーク＋ラベル） */
  groupItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  /** 「呼び出し済み」ラベル */
  calledBadge: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.SUCCESS,
    fontWeight: '600',
    marginRight: 2,
  },
  calledBadgeSelected: {
    color: COLORS.WARNING,
  },
  /** 呼び出し済みチェックマーク */
  groupCheckmark: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.SUCCESS,
    fontWeight: 'bold',
  },
  groupCheckmarkSelected: {
    color: COLORS.WARNING,
  },
  groupTicketLabel: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  groupTicketLabelCalled: {
    color: COLORS.SUCCESS,
  },
  groupTicketLabelSelected: {
    color: COLORS.PRIMARY,
  },
  /** 「タップで訂正」ヒント */
  calledHint: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.SUCCESS,
    opacity: 0.7,
  },
  calledHintSelected: {
    color: COLORS.WARNING,
    opacity: 1,
  },
  callButton: {
    marginTop: SPACING.MD,
  },
  /** スマホ×順次案内制：専用コンテナ（flex:1で高さを埋める） */
  mobileSeqContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  /** スマホ×順次案内制：企画情報の余白調整 */
  mobileSeqEventInfo: {
    margin: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  /** スマホ×順次案内制：非アクティブ警告の余白 */
  mobileSeqWarning: {
    margin: SPACING.MD,
    marginTop: 0,
    marginBottom: 0,
  },
  /** スマホ×順次案内制：グループリストエリア（flex:1でスクロール可能） */
  mobileGroupArea: {
    flex: 1,
    padding: SPACING.MD,
    paddingBottom: SPACING.SM,
  },
  /** スマホ×順次案内制：グループリストScrollView */
  mobileGroupScroll: {
    flex: 1,
  },
  mobileGroupScrollContent: {
    paddingBottom: SPACING.SM,
  },
  /** スマホ×順次案内制：下部固定バー */
  mobileBottomBar: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER || '#E0E0E0',
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
