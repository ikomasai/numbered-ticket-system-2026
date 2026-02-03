/**
 * 汎用ボタンコンポーネント
 * アプリケーション全体で使用するボタン
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

/**
 * ボタンコンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.title - ボタンテキスト
 * @param {Function} props.onPress - 押下時のコールバック
 * @param {string} props.variant - ボタンの種類（primary, secondary, danger, outline）
 * @param {boolean} props.disabled - 無効状態
 * @param {boolean} props.isLoading - ローディング状態
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} ボタンコンポーネント
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  isLoading = false,
  style,
}) => {
  /**
   * バリアントに応じたボタンスタイルを取得
   * @returns {Object} スタイルオブジェクト
   */
  const getButtonStyle = () => {
    if (disabled) {
      return styles.buttonDisabled;
    }
    switch (variant) {
      case 'secondary':
        return styles.buttonSecondary;
      case 'danger':
        return styles.buttonDanger;
      case 'outline':
        return styles.buttonOutline;
      default:
        return styles.buttonPrimary;
    }
  };

  /**
   * バリアントに応じたテキストスタイルを取得
   * @returns {Object} スタイルオブジェクト
   */
  const getTextStyle = () => {
    if (disabled) {
      return styles.textDisabled;
    }
    if (variant === 'outline') {
      return styles.textOutline;
    }
    return styles.textDefault;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' ? COLORS.PRIMARY : COLORS.CARD_BACKGROUND}
          size="small"
        />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: SPACING.SM + 4,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: COLORS.PRIMARY,
  },
  buttonSecondary: {
    backgroundColor: COLORS.SECONDARY,
  },
  buttonDanger: {
    backgroundColor: COLORS.ERROR,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  buttonDisabled: {
    backgroundColor: COLORS.DISABLED,
  },
  text: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
  },
  textDefault: {
    color: COLORS.CARD_BACKGROUND,
  },
  textOutline: {
    color: COLORS.PRIMARY,
  },
  textDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
});

export default Button;
