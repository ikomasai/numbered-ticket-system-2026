/**
 * バリデーション関数
 * フォーム入力などのバリデーションに使用する関数群
 */

/**
 * メールアドレスのバリデーション
 * @param {string} email - メールアドレス
 * @returns {boolean} バリデーション結果
 */
export const validateEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * パスワードのバリデーション（最低8文字）
 * @param {string} password - パスワード
 * @returns {boolean} バリデーション結果
 */
export const validatePassword = (password) => {
  if (!password) return false;
  return password.length >= 8;
};

/**
 * 空文字チェック
 * @param {string} value - チェックする値
 * @returns {boolean} 空でない場合true
 */
export const validateNotEmpty = (value) => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

/**
 * 電話番号のバリデーション（日本の電話番号形式）
 * @param {string} phone - 電話番号
 * @returns {boolean} バリデーション結果
 */
export const validatePhone = (phone) => {
  if (!phone) return false;
  const regex = /^0\d{9,10}$/;
  return regex.test(phone.replace(/-/g, ''));
};

/**
 * URLのバリデーション
 * @param {string} url - URL
 * @returns {boolean} バリデーション結果
 */
export const validateUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 全角数字・記号を半角に変換
 * ０-９ → 0-9、： → : に変換する
 * @param {string} value - 変換対象の文字列
 * @returns {string} 半角に変換された文字列
 */
export const toHalfWidth = (value) => {
  if (!value) return value;
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ':');
};
