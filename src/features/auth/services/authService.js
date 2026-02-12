/**
 * 認証サービス
 * Supabase Auth を使用したログイン・ログアウト・ロールチェック機能
 */

import { supabase } from '../../../services/supabase/client';

/** アクセスを許可するロール名 */
const REQUIRED_ROLE_NAME = '企画制作部';

/**
 * メールアドレスとパスワードでログインする
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Promise<{data: Object|null, error: Error|null}>} ログイン結果
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('ログインエラー:', error);
    return { data: null, error };
  }
};

/**
 * ログアウトする
 * @returns {Promise<{error: Error|null}>} ログアウト結果
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return { error };
  }
};

/**
 * ユーザーのロール一覧を取得する
 * user_roles と roles テーブルをJOINしてロール名一覧を返す
 * @param {string} userId - ユーザーID（auth.users.id）
 * @returns {Promise<{data: Array|null, error: Error|null}>} ロール一覧
 */
export const selectUserRoles = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('ロール取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * ユーザープロフィールを取得する
 * @param {string} userId - ユーザーID（auth.users.id）
 * @returns {Promise<{data: Object|null, error: Error|null}>} プロフィール情報
 */
export const selectUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    return { data: null, error };
  }
};

/**
 * ユーザーが必要なロール（企画制作部）を持っているか確認する
 * @param {string} userId - ユーザーID（auth.users.id）
 * @returns {Promise<boolean>} ロールを持っている場合true
 */
export const hasRequiredRole = async (userId) => {
  try {
    const { data, error } = await selectUserRoles(userId);
    if (error) throw error;

    /** ユーザーが持つロール名の配列 */
    const roleNames = data.map((userRole) => userRole.roles?.name);
    return roleNames.includes(REQUIRED_ROLE_NAME);
  } catch (error) {
    console.error('ロール確認エラー:', error);
    return false;
  }
};
