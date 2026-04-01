/**
 * アプリケーションエントリーポイント
 * React Native Expo テンプレート
 */

import React from 'react';
import { LogBox, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/shared/contexts/AuthContext';
import { SettingsProvider } from './src/shared/contexts/SettingsContext';

/**
 * React Navigation がWeb環境で発生させる警告を抑制
 * ライブラリ内部の問題であり、動作に影響なし
 */
LogBox.ignoreLogs([
  'Unexpected text node',
  'props.pointerEvents is deprecated',
]);

/**
 * Web環境でReact Navigation内部の非推奨警告をコンソールから抑制
 * LogBoxはWebコンソールに効かないため、console.warnをフィルタリング
 */
if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    /** 抑制対象の警告メッセージパターン */
    const suppressPatterns = [
      'props.pointerEvents is deprecated',
      'Blocked aria-hidden on an element',
    ];
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (suppressPatterns.some(pattern => message.includes(pattern))) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

/**
 * アプリケーションルートコンポーネント
 * @returns {JSX.Element} アプリケーション
 */
export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppNavigator />
      </SettingsProvider>
    </AuthProvider>
  );
}
