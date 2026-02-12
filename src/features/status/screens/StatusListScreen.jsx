/**
 * 状況確認企画一覧画面
 * 企画を選択して詳細画面に遷移する
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { TextInput, EventListItem } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from '../../../shared/constants';
import { useResponsive } from '../../../shared/hooks/useResponsive';

/**
 * 状況確認企画一覧画面コンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.navigation - ナビゲーションオブジェクト
 * @returns {JSX.Element} 状況確認企画一覧画面
 */
const StatusListScreen = ({ navigation }) => {
  const { isMobile } = useResponsive();
  /** 企画一覧 */
  const [events, setEvents] = useState([]);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** リフレッシュ中状態 */
  const [isRefreshing, setIsRefreshing] = useState(false);
  /** エラー情報 */
  const [error, setError] = useState(null);
  /** フィルター: 企画名 */
  const [filterName, setFilterName] = useState('');

  /**
   * 企画一覧を取得
   */
  const fetchEvents = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          location,
          type,
          capacity_per_slot,
          slot_duration_minutes,
          estimated_wait_minutes,
          event_dates (
            id,
            date,
            status,
            next_ticket_number
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // 各企画の開催日を日付順でソート
      data?.forEach(event => {
        if (event.event_dates) {
          event.event_dates.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
      });

      // 開催日がある企画のみをフィルタ
      const eventsWithDates = data?.filter(event =>
        event.event_dates && event.event_dates.length > 0
      ) || [];

      setEvents(eventsWithDates);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('企画取得エラー:', err);
    }
  }, []);

  /**
   * データを更新
   */
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  }, [fetchEvents]);

  // 初回レンダリング時にデータを取得
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchEvents();
      setIsLoading(false);
    };
    loadData();
  }, [fetchEvents]);

  // 画面フォーカス時にデータを再取得
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
    });
    return unsubscribe;
  }, [navigation, fetchEvents]);

  /** フィルタリングされた企画一覧 */
  const filteredEvents = useMemo(() => {
    if (!filterName) return events;
    return events.filter(event =>
      event.name.toLowerCase().includes(filterName.toLowerCase())
    );
  }, [events, filterName]);

  /** 時間枠定員制の企画 */
  const timeSlotEvents = useMemo(() => {
    return filteredEvents.filter(event => event.type === EVENT_TYPES.TIME_SLOT);
  }, [filteredEvents]);

  /** 順次案内制の企画 */
  const sequentialEvents = useMemo(() => {
    return filteredEvents.filter(event => event.type === EVENT_TYPES.SEQUENTIAL);
  }, [filteredEvents]);

  /**
   * 企画を選択して詳細画面に遷移
   * @param {Object} event - 選択された企画
   */
  const handleSelectEvent = (event) => {
    navigation.navigate('StatusDetail', { event });
  };

  // ローディング中
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // エラー時
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>データの取得に失敗しました</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>状況確認</Text>
      </View>

      {/* フィルター */}
      <View style={styles.filterContainer}>
        <TextInput
          placeholder="企画名で検索"
          value={filterName}
          onChangeText={setFilterName}
          style={styles.filterInput}
        />
      </View>

      {/* 企画一覧（タイプ別2列） */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />
        }
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filterName ? '該当する企画がありません' : '企画が登録されていません'}
            </Text>
          </View>
        ) : (
          <View style={[styles.columnsContainer, isMobile && styles.columnsContainerMobile]}>
            {/* 時間枠定員制 */}
            <View style={[styles.column, isMobile && styles.columnMobile]}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>{EVENT_TYPE_LABELS[EVENT_TYPES.TIME_SLOT]}</Text>
                <Text style={styles.columnCount}>{timeSlotEvents.length}件</Text>
              </View>
              {timeSlotEvents.length === 0 ? (
                <Text style={styles.columnEmptyText}>該当する企画がありません</Text>
              ) : (
                timeSlotEvents.map(event => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    onPress={handleSelectEvent}
                  />
                ))
              )}
            </View>

            {/* 順次案内制 */}
            <View style={[styles.column, isMobile && styles.columnMobile]}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>{EVENT_TYPE_LABELS[EVENT_TYPES.SEQUENTIAL]}</Text>
                <Text style={styles.columnCount}>{sequentialEvents.length}件</Text>
              </View>
              {sequentialEvents.length === 0 ? (
                <Text style={styles.columnEmptyText}>該当する企画がありません</Text>
              ) : (
                sequentialEvents.map(event => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    onPress={handleSelectEvent}
                  />
                ))
              )}
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
  header: {
    padding: SPACING.MD,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  filterContainer: {
    padding: SPACING.MD,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterInput: {
    marginBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.MD,
  },
  /** PC用: 2列横並び */
  columnsContainer: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  /** スマホ用: 1列縦並び */
  columnsContainerMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  /** PC用: 各列 */
  column: {
    flex: 1,
  },
  /** スマホ用: 各列（幅100%、縦並び） */
  columnMobile: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    marginBottom: SPACING.LG,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.SM,
  },
  columnTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  columnCount: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  columnEmptyText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    padding: SPACING.MD,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.ERROR,
    marginBottom: SPACING.SM,
  },
  errorDetail: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    padding: SPACING.XL,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default StatusListScreen;
