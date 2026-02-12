/**
 * 日付タブバーコンポーネント
 * 企画詳細画面で日付を切り替えるためのタブバー
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

/**
 * 日付を表示用にフォーマット
 * @param {string} dateStr - 日付文字列（YYYY-MM-DD形式）
 * @returns {string} フォーマット済み日付（例: 11/2(土)）
 */
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = dayNames[date.getDay()];
  return `${month}/${day}(${dayOfWeek})`;
};

/**
 * 日付タブバー
 * @param {Object} props - プロパティ
 * @param {Array} props.dates - 開催日配列
 * @param {string} props.dates[].id - 開催日ID
 * @param {string} props.dates[].date - 開催日（YYYY-MM-DD形式）
 * @param {string} props.selectedDateId - 選択中の開催日ID
 * @param {Function} props.onSelectDate - 日付選択時のコールバック
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} 日付タブバー
 */
const DateTabBar = ({ dates, selectedDateId, onSelectDate, style }) => {
  // 日付がない場合は何も表示しない
  if (!dates || dates.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((dateItem) => {
          /** 選択中かどうか */
          const isSelected = selectedDateId === dateItem.id;

          return (
            <TouchableOpacity
              key={dateItem.id}
              style={[
                styles.tab,
                isSelected && styles.tabSelected,
              ]}
              onPress={() => onSelectDate(dateItem)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {formatDate(dateItem.date)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  scrollContent: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.SM,
  },
  tab: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    marginHorizontal: SPACING.XS,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    minWidth: 80,
    alignItems: 'center',
  },
  tabSelected: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  tabTextSelected: {
    color: COLORS.CARD_BACKGROUND,
    fontWeight: '600',
  },
});

export default DateTabBar;
