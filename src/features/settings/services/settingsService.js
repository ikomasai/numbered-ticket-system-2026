/**
 * デフォルト設定サービス
 * numbered_ticket_settingsテーブルの読み書きを管理
 */

import { supabase } from '../../../services/supabase/client';

/** テーブル名 */
const TABLE_NAME = 'numbered_ticket_settings';

/**
 * 全設定を取得する
 * @returns {Promise<{data: Object|null, error: Error|null}>} キー・バリュー形式の設定オブジェクト
 */
export const selectAllSettings = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('key, value');

    if (error) {
      console.error('設定取得エラー:', error);
      return { data: null, error };
    }

    /** 配列をキー・バリューオブジェクトに変換 */
    const settings = {};
    data.forEach((row) => {
      settings[row.key] = row.value;
    });

    return { data: settings, error: null };
  } catch (error) {
    console.error('設定取得で予期しないエラー:', error);
    return { data: null, error };
  }
};

/**
 * 複数の設定を一括更新する
 * @param {Object} settingsMap - { key: value } 形式の設定オブジェクト
 * @returns {Promise<{success: boolean, error: Error|null}>} 更新結果
 */
export const updateSettings = async (settingsMap) => {
  try {
    /** 各キーに対してupsert実行 */
    const updates = Object.entries(settingsMap).map(([key, value]) =>
      supabase
        .from(TABLE_NAME)
        .update({ value: String(value) })
        .eq('key', key)
    );

    const results = await Promise.all(updates);

    /** エラーがあれば最初のエラーを返す */
    const firstError = results.find((r) => r.error);
    if (firstError) {
      console.error('設定更新エラー:', firstError.error);
      return { success: false, error: firstError.error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('設定更新で予期しないエラー:', error);
    return { success: false, error };
  }
};
