/**
 * チェックボックスコンポーネント
 * 選択可能なチェックボックス
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

/**
 * チェックボックスコンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.label - ラベルテキスト
 * @param {boolean} props.checked - チェック状態
 * @param {Function} props.onToggle - トグル時のコールバック
 * @param {boolean} props.disabled - 無効状態
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} チェックボックスコンポーネント
 */
const Checkbox = ({
  label,
  checked,
  onToggle,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => !disabled && onToggle(!checked)}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * チェックボックスグループコンポーネント
 * 複数のチェックボックスをまとめて管理
 * @param {Object} props - プロパティ
 * @param {string} props.label - グループラベル
 * @param {Array<{label: string, value: string}>} props.options - 選択肢の配列
 * @param {Array<string>} props.selectedValues - 選択された値の配列
 * @param {Function} props.onValuesChange - 値変更時のコールバック
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} チェックボックスグループコンポーネント
 */
export const CheckboxGroup = ({
  label,
  options,
  selectedValues,
  onValuesChange,
  style,
}) => {
  /**
   * チェックボックスをトグル
   * @param {string} value - トグルする値
   * @param {boolean} isChecked - チェック状態
   */
  const handleToggle = (value, isChecked) => {
    if (isChecked) {
      onValuesChange([...selectedValues, value]);
    } else {
      onValuesChange(selectedValues.filter(v => v !== value));
    }
  };

  return (
    <View style={[styles.groupContainer, style]}>
      {label && <Text style={styles.groupLabel}>{label}</Text>}
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={selectedValues.includes(option.value)}
            onToggle={(isChecked) => handleToggle(option.value, isChecked)}
            style={styles.optionItem}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.CARD_BACKGROUND,
  },
  checkboxChecked: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  checkboxDisabled: {
    backgroundColor: COLORS.DISABLED,
    borderColor: COLORS.DISABLED,
  },
  checkmark: {
    color: COLORS.CARD_BACKGROUND,
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
  },
  label: {
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
  },
  labelDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  groupContainer: {
    marginBottom: SPACING.MD,
  },
  groupLabel: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.SM,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionItem: {
    marginRight: SPACING.LG,
    marginBottom: SPACING.SM,
  },
});

export default Checkbox;
