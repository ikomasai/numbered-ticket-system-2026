/**
 * 認証コンテキスト
 * アプリ全体の認証状態を管理する
 * Supabase Auth + ロールベースのアクセス制御
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase/client';
import { signIn as authSignIn, signOut as authSignOut, hasRequiredRole, selectUserProfile } from '../../features/auth/services/authService';

/** 認証コンテキスト */
const AuthContext = createContext(null);

/**
 * 認証プロバイダーコンポーネント
 * アプリ全体をラップして認証状態を提供する
 * @param {Object} props - プロパティ
 * @param {React.ReactNode} props.children - 子コンポーネント
 * @returns {JSX.Element} 認証プロバイダー
 */
export const AuthProvider = ({ children }) => {
  /** ログイン中のユーザー情報（null = 未ログイン） */
  const [user, setUser] = useState(null);
  /** 初期セッション確認中フラグ */
  const [isLoading, setIsLoading] = useState(true);
  /** 企画制作部ロールを持っているかどうか */
  const [isAuthorized, setIsAuthorized] = useState(false);
  /** ユーザー表示名 */
  const [userName, setUserName] = useState('');

  /**
   * 初期セッション確認
   * getSession() でローカルストレージからセッションを取得
   * セッション更新が詰まる場合に備えてタイムアウトを設定
   */
  useEffect(() => {
    /** セッション確認のタイムアウト時間（ミリ秒） */
    const SESSION_CHECK_TIMEOUT = 3000;

    const initializeAuth = async () => {
      try {
        /** タイムアウト付きでセッション取得を実行 */
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('セッション確認タイムアウト')), SESSION_CHECK_TIMEOUT)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        if (session?.user) {
          /** セッションがある場合はロールを確認 */
          const hasRole = await hasRequiredRole(session.user.id);
          if (hasRole) {
            setUser(session.user);
            setIsAuthorized(true);
            /** プロフィール名を取得 */
            const { data: profile } = await selectUserProfile(session.user.id);
            setUserName(profile?.name || '');
          }
        }
      } catch (error) {
        console.error('セッション確認エラー:', error);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * ログイン処理
   * @param {string} email - メールアドレス
   * @param {string} password - パスワード
   * @returns {Promise<{error: Error|null, isAuthorized: boolean}>} ログイン結果
   */
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await authSignIn(email, password);
    if (error) {
      return { error, isAuthorized: false };
    }

    /** ログイン成功後にロールを確認 */
    const hasRole = await hasRequiredRole(data.user.id);
    if (!hasRole) {
      // ロールがない場合はログアウトさせる
      await authSignOut();
      return {
        error: new Error('このアプリへのアクセス権限がありません。問題が解決しない場合はシステム部までお問い合わせください。'),
        isAuthorized: false,
      };
    }

    setUser(data.user);
    setIsAuthorized(true);
    /** プロフィール名を取得 */
    const { data: profile } = await selectUserProfile(data.user.id);
    setUserName(profile?.name || '');
    return { error: null, isAuthorized: true };
  }, []);

  /**
   * ログアウト処理
   * @returns {Promise<{error: Error|null}>} ログアウト結果
   */
  const signOut = useCallback(async () => {
    const { error } = await authSignOut();
    if (!error) {
      setUser(null);
      setIsAuthorized(false);
      setUserName('');
    }
    return { error };
  }, []);

  /** コンテキストに提供する値 */
  const value = {
    user,
    userName,
    isLoading,
    isAuthorized,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 認証コンテキストを使用するカスタムフック
 * @returns {{user: Object|null, userName: string, isLoading: boolean, isAuthorized: boolean, signIn: Function, signOut: Function}} 認証状態と関数
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth は AuthProvider の中で使用してください');
  }
  return context;
};
