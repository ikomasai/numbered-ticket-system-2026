/**
 * 汎用選択コンポーネント
 * モーダル形式の選択入力
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

/**
 * 選択コンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.label - ラベルテキスト
 * @param {string} props.value - 選択値
 * @param {Function} props.onValueChange - 値変更時のコールバック
 * @param {Array<{label: string, value: string}>} props.options - 選択肢の配列
 * @param {string} props.placeholder - プレースホルダー
 * @param {boolean} props.disabled - 無効状態
 * @param {string} props.disabledReason - 無効時のツールチップ（Web用）
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} 選択コンポーネント
 */
const Select = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = '選択してください',
  disabled = false,
  disabledReason,
  style,
}) => {
  /** モーダル表示状態 */
  const [isModalVisible, setIsModalVisible] = useState(false);
  /** セレクターボタンのref（Web用ツールチップ設定） */
  const selectorRef = useRef(null);

  // Web用: 無効時にツールチップ（title属性）を設定
  useEffect(() => {
    if (Platform.OS === 'web' && selectorRef.current) {
      if (disabled && disabledReason) {
        selectorRef.current.setAttribute('title', disabledReason);
      } else {
        selectorRef.current.removeAttribute('title');
      }
    }
  }, [disabled, disabledReason]);

  /**
   * 選択されたオプションのラベルを取得
   * @returns {string} 選択されたオプションのラベル
   */
  const getSelectedLabel = () => {
    const selectedOption = options.find(option => option.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  /**
   * モーダルを開く
   */
  const handleOpen = () => {
    if (!disabled) {
      setIsModalVisible(true);
    }
  };

  /**
   * オプションを選択
   * @param {string} selectedValue - 選択された値
   */
  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue);
    setIsModalVisible(false);
  };

  /**
   * モーダルを閉じる
   */
  const handleClose = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <View style={[styles.container, style]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}

        {/* セレクターボタン */}
        <TouchableOpacity
          ref={selectorRef}
          style={[styles.selector, disabled && styles.selectorDisabled]}
          onPress={handleOpen}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text
            style={[
              styles.selectorText,
              !value && styles.selectorPlaceholder,
              disabled && styles.selectorTextDisabled,
            ]}
          >
            {getSelectedLabel()}
          </Text>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* モーダル */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || '選択してください'}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    option.value === value && styles.optionSelected,
                    index === options.length - 1 && styles.optionLast,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      option.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.XS,
  },
  selector: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingVertical: SPACING.SM + 4,
    paddingHorizontal: SPACING.MD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  selectorDisabled: {
    backgroundColor: COLORS.BACKGROUND,
  },
  selectorText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    flex: 1,
  },
  selectorPlaceholder: {
    color: COLORS.TEXT_SECONDARY,
  },
  selectorTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  arrow: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  modalContent: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  closeButton: {
    padding: SPACING.XS,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.HEADING,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: 'bold',
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionSelected: {
    backgroundColor: COLORS.PRIMARY + '15',
  },
  optionText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.SM,
  },
});

export default Select;
