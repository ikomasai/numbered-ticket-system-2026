/**
 * 発券企画一覧画面
 * 企画を選択して詳細画面に遷移する
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { TextInput, EventListItem } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
} from '../../../shared/constants';

/**
 * 発券企画一覧画面コンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.navigation - ナビゲーションオブジェクト
 * @returns {JSX.Element} 発券企画一覧画面
 */
const TicketListScreen = ({ navigation }) => {
  /** 企画一覧 */
  const [events, setEvents] = useState([]);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** エラー情報 */
  const [error, setError] = useState(null);
  /** フィルター: 企画名 */
  const [filterName, setFilterName] = useState('');

  /**
   * 企画一覧を取得
   */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err);
      console.error('企画取得エラー:', err);
    }
    setIsLoading(false);
  }, []);

  // 初回レンダリング時にデータを取得
  useEffect(() => {
    fetchEvents();
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

  /**
   * 企画を選択して詳細画面に遷移
   * @param {Object} event - 選択された企画
   */
  const handleSelectEvent = (event) => {
    navigation.navigate('TicketDetail', { event });
  };

  /**
   * 企画アイテムをレンダリング
   * @param {Object} param0 - アイテム情報
   * @returns {JSX.Element} 企画アイテム
   */
  const renderItem = ({ item }) => (
    <EventListItem
      event={item}
      onPress={handleSelectEvent}
    />
  );

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
        <Text style={styles.title}>発券</Text>
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

      {/* 企画一覧 */}
      <FlatList
        data={filteredEvents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filterName ? '該当する企画がありません' : '企画が登録されていません'}
            </Text>
          </View>
        }
      />
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
  listContent: {
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

export default TicketListScreen;
