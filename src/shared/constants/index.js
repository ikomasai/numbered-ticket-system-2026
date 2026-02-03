/**
 * 共通定数
 * アプリケーション全体で使用する定数を定義
 */

/** アプリケーション名 */
export const APP_NAME = '整理券発券システム';

/** アプリケーションバージョン */
export const APP_VERSION = '1.0.0';

/** デフォルトのタイムアウト時間（ミリ秒） */
export const DEFAULT_TIMEOUT = 10000;

/** 最大リトライ回数 */
export const MAX_RETRY_COUNT = 3;

/**
 * イベント開始時刻
 * 環境変数から取得（デフォルト: 10:00）
 */
export const EVENT_START_TIME = process.env.EXPO_PUBLIC_EVENT_START_TIME || '10:00';

/**
 * イベント終了時刻
 * 環境変数から取得（デフォルト: 19:00）
 */
export const EVENT_END_TIME = process.env.EXPO_PUBLIC_EVENT_END_TIME || '19:00';

/**
 * 大学祭開催日一覧
 * 環境変数から取得してDate配列に変換
 */
export const FESTIVAL_DATES = (process.env.EXPO_PUBLIC_FESTIVAL_DATES || '2024-11-02,2024-11-03,2024-11-04')
  .split(',')
  .map(dateStr => dateStr.trim());

/**
 * 企画タイプ定数
 */
export const EVENT_TYPES = {
  /** 時間枠定員制 */
  TIME_SLOT: 'time_slot',
  /** 順次案内制 */
  SEQUENTIAL: 'sequential',
};

/**
 * 企画タイプ表示名
 */
export const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.TIME_SLOT]: '時間枠定員制',
  [EVENT_TYPES.SEQUENTIAL]: '順次案内制',
};

/**
 * ステータス定数
 */
export const STATUS = {
  /** 未発券 */
  NOT_STARTED: 'not_started',
  /** 発券中 */
  ACTIVE: 'active',
  /** 発券停止中 */
  PAUSED: 'paused',
  /** 満員 */
  FULL: 'full',
  /** 発券終了 */
  ENDED: 'ended',
};

/**
 * ステータス表示名
 */
export const STATUS_LABELS = {
  [STATUS.NOT_STARTED]: '未発券',
  [STATUS.ACTIVE]: '発券中',
  [STATUS.PAUSED]: '発券停止中',
  [STATUS.FULL]: '満員',
  [STATUS.ENDED]: '発券終了',
};

/**
 * ステータス表示色
 */
export const STATUS_COLORS = {
  [STATUS.NOT_STARTED]: '#9E9E9E',
  [STATUS.ACTIVE]: '#4CAF50',
  [STATUS.PAUSED]: '#FF9800',
  [STATUS.FULL]: '#F44336',
  [STATUS.ENDED]: '#607D8B',
};

/**
 * 媒体タイプ定数
 */
export const MEDIUM_TYPES = {
  /** 紙媒体 */
  PAPER: 'paper',
  /** 電子媒体 */
  DIGITAL: 'digital',
};

/**
 * 媒体タイプ表示名
 */
export const MEDIUM_TYPE_LABELS = {
  [MEDIUM_TYPES.PAPER]: '紙',
  [MEDIUM_TYPES.DIGITAL]: '電子',
};

/**
 * 共通カラー定義
 */
export const COLORS = {
  /** プライマリカラー */
  PRIMARY: '#007AFF',
  /** セカンダリカラー */
  SECONDARY: '#5856D6',
  /** 成功 */
  SUCCESS: '#34C759',
  /** 警告 */
  WARNING: '#FF9500',
  /** エラー */
  ERROR: '#FF3B30',
  /** 背景色 */
  BACKGROUND: '#F2F2F7',
  /** カード背景色 */
  CARD_BACKGROUND: '#FFFFFF',
  /** テキスト色 */
  TEXT: '#000000',
  /** セカンダリテキスト色 */
  TEXT_SECONDARY: '#8E8E93',
  /** ボーダー色 */
  BORDER: '#C6C6C8',
  /** 無効状態 */
  DISABLED: '#C7C7CC',
};

/**
 * フォントサイズ定義
 */
export const FONT_SIZES = {
  /** 極小 */
  XS: 10,
  /** 小 */
  SM: 12,
  /** 中（デフォルト） */
  MD: 14,
  /** 大 */
  LG: 16,
  /** 極大 */
  XL: 20,
  /** 見出し */
  HEADING: 24,
  /** 大見出し */
  TITLE: 32,
  /** 呼び出し表示用 */
  CALL_DISPLAY: 72,
};

/**
 * スペーシング定義
 */
export const SPACING = {
  /** 極小 */
  XS: 4,
  /** 小 */
  SM: 8,
  /** 中（デフォルト） */
  MD: 16,
  /** 大 */
  LG: 24,
  /** 極大 */
  XL: 32,
};

/**
 * 時間枠の配布状況表示用閾値（%）
 * 環境変数から取得してデフォルト値を設定
 */
export const SLOT_THRESHOLDS = {
  /** 低（25%以下） */
  LOW: parseInt(process.env.EXPO_PUBLIC_SLOT_THRESHOLD_LOW || '25'),
  /** 中（25〜50%） */
  MEDIUM: parseInt(process.env.EXPO_PUBLIC_SLOT_THRESHOLD_MEDIUM || '50'),
  /** 高（50〜60%） */
  HIGH: parseInt(process.env.EXPO_PUBLIC_SLOT_THRESHOLD_HIGH || '60'),
  /** 非常に高（60〜80%） */
  VERY_HIGH: parseInt(process.env.EXPO_PUBLIC_SLOT_THRESHOLD_VERY_HIGH || '80'),
};

/**
 * 時間枠の配布状況表示用色
 */
export const SLOT_STATUS_COLORS = {
  /** 非常に低（青色） */
  VERY_LOW: '#2196F3',
  /** 低（緑色） */
  LOW: '#4CAF50',
  /** 中（黄色） */
  MEDIUM: '#FFC107',
  /** 高（オレンジ色） */
  HIGH: '#FF9800',
  /** 非常に高（赤色） */
  VERY_HIGH: '#F44336',
};
