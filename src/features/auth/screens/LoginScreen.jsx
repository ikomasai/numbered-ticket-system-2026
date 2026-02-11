/**
 * ログイン画面
 * メールアドレスとパスワードで認証を行う
 * 企画制作部ロールを持つユーザーのみアクセスを許可
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import TextInput from '../../../shared/components/TextInput';
import Button from '../../../shared/components/Button';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { COLORS, FONT_SIZES, SPACING, APP_NAME } from '../../../shared/constants';
import { useResponsive } from '../../../shared/hooks/useResponsive';

/**
 * ログイン画面コンポーネント
 * @returns {JSX.Element} ログイン画面
 */
const LoginScreen = () => {
  /** メールアドレス入力値 */
  const [email, setEmail] = useState('');
  /** パスワード入力値 */
  const [password, setPassword] = useState('');
  /** エラーメッセージ */
  const [error, setError] = useState('');
  /** ログイン処理中フラグ */
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const { isMobile } = useResponsive();

  /**
   * ログインボタン押下時の処理
   */
  const handleLogin = async () => {
    // 入力バリデーション
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        /** Supabaseのエラーメッセージを日本語に変換 */
        const errorMessage = getErrorMessage(result.error);
        setError(errorMessage);
      }
    } catch (err) {
      setError('予期しないエラーが発生しました。もう一度お試しください。');
      console.error('ログイン処理エラー:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Supabaseのエラーメッセージを日本語に変換する
   * @param {Error} err - エラーオブジェクト
   * @returns {string} 日本語エラーメッセージ
   */
  const getErrorMessage = (err) => {
    const message = err.message || '';

    if (message.includes('Invalid login credentials')) {
      return 'メールアドレスまたはパスワードが正しくありません';
    }
    if (message.includes('Email not confirmed')) {
      return 'メールアドレスの確認が完了していません';
    }
    if (message.includes('Too many requests')) {
      return 'ログイン試行回数が多すぎます。しばらく待ってからお試しください';
    }
    if (message.includes('アクセス権限がありません')) {
      return message;
    }

    return message || '認証エラーが発生しました';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.loginCard, !isMobile && styles.loginCardDesktop]}>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.appName}>{APP_NAME}</Text>
              <Text style={styles.subtitle}>ログイン</Text>
            </View>

            {/* エラー表示 */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* メールアドレス入力 */}
            <TextInput
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              placeholder="example@mail.com"
              keyboardType="email-address"
            />

            {/* パスワード入力 */}
            <TextInput
              label="パスワード"
              value={password}
              onChangeText={setPassword}
              placeholder="パスワードを入力"
              secureTextEntry
            />

            {/* ログインボタン */}
            <Button
              title="ログイン"
              onPress={handleLogin}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              style={styles.loginButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  /** ログインカード */
  loginCard: {
    width: '100%',
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 16,
    padding: SPACING.LG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  /** PC用: カード幅を制限 */
  loginCardDesktop: {
    maxWidth: 420,
  },
  /** ヘッダー */
  header: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  appName: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT_SECONDARY,
  },
  /** エラー表示 */
  errorContainer: {
    backgroundColor: COLORS.ERROR + '15',
    borderWidth: 1,
    borderColor: COLORS.ERROR + '40',
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  errorText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  /** ログインボタン */
  loginButton: {
    marginTop: SPACING.SM,
  },
});

export default LoginScreen;
