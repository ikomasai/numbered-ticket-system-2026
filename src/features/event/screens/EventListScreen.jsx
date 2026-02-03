/**
 * 企画一覧画面
 * 登録済み企画の一覧表示・編集・削除を行う
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useEvents } from '../hooks/useEvents';
import { Button } from '../../../shared/components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../shared/constants';
import { formatDateWithDay } from '../../../shared/utils/dateTime';

/**
 * 企画一覧画面コンポーネント
 * @returns {JSX.Element} 企画一覧画面
 */
const EventListScreen = () => {
  const navigation = useNavigation();
  const { events, isLoading, error, fetchEvents, removeEvent } = useEvents();
  /** 削除処理中の企画ID */
  const [deletingId, setDeletingId] = useState(null);

  // 画面がフォーカスされた時にデータを再取得
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  /**
   * 企画削除確認
   * Web環境ではwindow.confirmを使用し、ネイティブ環境ではAlert.alertを使用
   * @param {Object} event - 企画データ
   */
  const handleDeleteConfirm = (event) => {
    if (Platform.OS === 'web') {
      // Web環境ではwindow.confirmを使用
      const confirmed = window.confirm(`「${event.name}」を削除しますか？\nこの操作は取り消せません。`);
      if (confirmed) {
        handleDelete(event.id);
      }
    } else {
      // ネイティブ環境ではAlert.alertを使用
      Alert.alert(
        '企画を削除',
        `「${event.name}」を削除しますか？\nこの操作は取り消せません。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: () => handleDelete(event.id),
          },
        ]
      );
    }
  };

  /**
   * 企画を削除
   * @param {string} id - 企画ID
   */
  const handleDelete = async (id) => {
    setDeletingId(id);
    const { success, error: deleteError } = await removeEvent(id);
    setDeletingId(null);
    if (!success) {
      if (Platform.OS === 'web') {
        window.alert('企画の削除に失敗しました');
      } else {
        Alert.alert('エラー', '企画の削除に失敗しました');
      }
    }
  };

  /**
   * 企画アイテムをレンダリング
   * @param {Object} param0 - アイテム情報
   * @returns {JSX.Element} 企画アイテム
   */
  const renderEventItem = ({ item }) => {
    /** 開催日の一覧 */
    const dates = item.event_dates || [];
    /** 開催日表示テキスト */
    const datesText = dates.map(d => formatDateWithDay(d.date)).join(', ');

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{item.name}</Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: item.type === 'time_slot' ? COLORS.PRIMARY : COLORS.SECONDARY },
            ]}
          >
            <Text style={styles.typeBadgeText}>{EVENT_TYPE_LABELS[item.type]}</Text>
          </View>
        </View>

        <Text style={styles.eventLocation}>{item.location}</Text>
        <Text style={styles.eventDates}>{datesText}</Text>

        {/* 開催日ごとのステータス */}
        <View style={styles.statusContainer}>
          {dates.map((dateItem) => (
            <View key={dateItem.id} style={styles.statusItem}>
              <Text style={styles.statusDate}>{formatDateWithDay(dateItem.date)}:</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[dateItem.status] },
                ]}
              >
                <Text style={styles.statusBadgeText}>{STATUS_LABELS[dateItem.status]}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EventEdit', { eventId: item.id })}
          >
            <Text style={styles.editButtonText}>編集</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteConfirm(item)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.ERROR} />
            ) : (
              <Text style={styles.deleteButtonText}>削除</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
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
        <Button title="再読み込み" onPress={fetchEvents} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>企画管理</Text>
        <Button
          title="新規登録"
          onPress={() => navigation.navigate('EventCreate')}
          style={styles.createButton}
        />
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>登録されている企画がありません</Text>
          <Text style={styles.emptySubText}>「新規登録」ボタンから企画を追加してください</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={fetchEvents}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    paddingHorizontal: SPACING.MD,
  },
  listContent: {
    padding: SPACING.MD,
  },
  eventCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  eventName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
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
    marginBottom: SPACING.XS,
  },
  eventDates: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  statusContainer: {
    marginBottom: SPACING.MD,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  statusDate: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT,
    marginRight: SPACING.SM,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.MD,
  },
  editButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginRight: SPACING.SM,
  },
  editButtonText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.ERROR,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.MD,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.ERROR,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 150,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  emptyText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  emptySubText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default EventListScreen;
