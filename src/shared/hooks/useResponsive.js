/**
 * レスポンシブ対応フック
 * 画面サイズに応じたレイアウト切り替えを提供
 */

import { useWindowDimensions } from 'react-native';

/** ブレークポイント定義 */
const BREAKPOINTS = {
  /** スマホ/タブレット境界 */
  TABLET: 768,
  /** タブレット/PC境界 */
  DESKTOP: 1024,
};

/**
 * レスポンシブ対応フック
 * @returns {Object} レスポンシブ関連の値
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  /** スマホサイズかどうか */
  const isMobile = width < BREAKPOINTS.TABLET;

  /** タブレットサイズかどうか */
  const isTablet = width >= BREAKPOINTS.TABLET && width < BREAKPOINTS.DESKTOP;

  /** PCサイズかどうか */
  const isDesktop = width >= BREAKPOINTS.DESKTOP;

  /** 横向きかどうか */
  const isLandscape = width > height;

  /**
   * レスポンシブな値を返す
   * @param {Object} options - 各デバイスサイズ向けの値
   * @param {*} options.mobile - スマホ向けの値
   * @param {*} options.tablet - タブレット向けの値（省略時はmobile）
   * @param {*} options.desktop - PC向けの値（省略時はtablet）
   * @returns {*} 現在の画面サイズに適した値
   */
  const responsive = ({ mobile, tablet, desktop }) => {
    if (isDesktop) return desktop ?? tablet ?? mobile;
    if (isTablet) return tablet ?? mobile;
    return mobile;
  };

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    responsive,
    breakpoints: BREAKPOINTS,
  };
};

export default useResponsive;
