/**
 * 汎用テキスト入力コンポーネント
 * アプリケーション全体で使用するテキスト入力フィールド
 */

import React from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

/**
 * テキスト入力コンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.label - ラベルテキスト
 * @param {string} props.value - 入力値
 * @param {Function} props.onChangeText - 値変更時のコールバック
 * @param {string} props.placeholder - プレースホルダー
 * @param {string} props.keyboardType - キーボードタイプ
 * @param {boolean} props.multiline - 複数行入力
 * @param {number} props.numberOfLines - 行数
 * @param {boolean} props.editable - 編集可能
 * @param {boolean} props.secureTextEntry - パスワード入力（文字を隠す）
 * @param {string} props.error - エラーメッセージ
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} テキスト入力コンポーネント
 */
const TextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  editable = true,
  secureTextEntry = false,
  error,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <RNTextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputDisabled,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.TEXT_SECONDARY}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        secureTextEntry={secureTextEntry}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  input: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingVertical: SPACING.SM + 4,
    paddingHorizontal: SPACING.MD,
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: COLORS.BACKGROUND,
    color: COLORS.TEXT_SECONDARY,
  },
  inputError: {
    borderColor: COLORS.ERROR,
  },
  errorText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
});

export default TextInput;
