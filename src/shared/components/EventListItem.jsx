/**
 * 企画リストアイテムコンポーネント
 * 企画一覧画面で使用するカード形式のリストアイテム
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
} from '../constants';

/**
 * 企画リストアイテム
 * @param {Object} props - プロパティ
 * @param {Object} props.event - 企画データ
 * @param {string} props.event.id - 企画ID
 * @param {string} props.event.name - 企画名
 * @param {string} props.event.location - 企画場所
 * @param {string} props.event.type - 企画タイプ（time_slot / sequential）
 * @param {Function} props.onPress - タップ時のコールバック
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} 企画リストアイテム
 */
const EventListItem = ({ event, onPress, style }) => {
  /** 企画タイプに応じたバッジの色 */
  const typeBadgeColor = event.type === EVENT_TYPES.TIME_SLOT
    ? COLORS.PRIMARY
    : COLORS.SECONDARY;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* 企画名 */}
        <Text style={styles.name} numberOfLines={1}>
          {event.name}
        </Text>

        {/* 企画場所 */}
        <Text style={styles.location} numberOfLines={1}>
          {event.location}
        </Text>

        {/* 企画タイプバッジ */}
        <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor }]}>
          <Text style={styles.typeBadgeText}>
            {EVENT_TYPE_LABELS[event.type] || event.type}
          </Text>
        </View>
      </View>

      {/* 矢印アイコン */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  location: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.SM,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: COLORS.CARD_BACKGROUND,
  },
  arrow: {
    fontSize: FONT_SIZES.HEADING,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
});

export default EventListItem;
