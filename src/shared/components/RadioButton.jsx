/**
 * ラジオボタンコンポーネント
 * 単一選択用のラジオボタン
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

/**
 * ラジオボタンコンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.label - ラベルテキスト
 * @param {boolean} props.selected - 選択状態
 * @param {Function} props.onSelect - 選択時のコールバック
 * @param {boolean} props.disabled - 無効状態
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} ラジオボタンコンポーネント
 */
const RadioButton = ({
  label,
  selected,
  onSelect,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => !disabled && onSelect()}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
          disabled && styles.radioDisabled,
        ]}
      >
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * ラジオボタングループコンポーネント
 * 複数のラジオボタンをまとめて管理
 * @param {Object} props - プロパティ
 * @param {string} props.label - グループラベル
 * @param {Array<{label: string, value: string, description?: string}>} props.options - 選択肢の配列
 * @param {string} props.value - 選択値
 * @param {Function} props.onValueChange - 値変更時のコールバック
 * @param {boolean} [props.horizontal=false] - 選択肢を横並びにする
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} ラジオボタングループコンポーネント
 */
export const RadioGroup = ({
  label,
  options,
  value,
  onValueChange,
  horizontal = false,
  style,
}) => {
  return (
    <View style={[styles.groupContainer, style]}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}
      <View style={[styles.optionsContainer, horizontal && styles.optionsContainerHorizontal]}>
        {options.map((option) => (
          <View key={option.value} style={styles.optionWrapper}>
            <RadioButton
              label={option.label}
              selected={value === option.value}
              onSelect={() => onValueChange(option.value)}
            />
            {option.description && (
              <Text style={styles.description}>{option.description}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.CARD_BACKGROUND,
  },
  radioSelected: {
    borderColor: COLORS.PRIMARY,
  },
  radioDisabled: {
    backgroundColor: COLORS.DISABLED,
    borderColor: COLORS.DISABLED,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  label: {
    marginLeft: SPACING.XS,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
  },
  labelDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  groupContainer: {
    marginBottom: SPACING.SM,
  },
  groupLabel: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  optionsContainer: {
    gap: SPACING.XS,
  },
  /** 横並びオプション */
  optionsContainerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.MD,
  },
  optionWrapper: {
    marginBottom: 0,
  },
  description: {
    marginLeft: 28,
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
});

export default RadioButton;
