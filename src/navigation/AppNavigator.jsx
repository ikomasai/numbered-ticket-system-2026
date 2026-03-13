/**
 * アプリケーションナビゲーター
 * アプリ全体のナビゲーション構造を定義
 * PC: 左サイドバー（Drawer）
 * スマホ: 画面下タブバー（BottomTab）
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Pressable, Animated, Platform } from 'react-native';

// 企画管理画面インポート
import EventListScreen from '../features/event/screens/EventListScreen';
import EventCreateScreen from '../features/event/screens/EventCreateScreen';
import EventEditScreen from '../features/event/screens/EventEditScreen';

// 発券画面インポート
import TicketListScreen from '../features/ticket/screens/TicketListScreen';
import TicketDetailScreen from '../features/ticket/screens/TicketDetailScreen';

// 呼び出し画面インポート
import CallListScreen from '../features/call/screens/CallListScreen';
import CallDetailScreen from '../features/call/screens/CallDetailScreen';

// 状況確認画面インポート
import StatusListScreen from '../features/status/screens/StatusListScreen';
import StatusDetailScreen from '../features/status/screens/StatusDetailScreen';

// デフォルト設定画面インポート
import SettingsScreen from '../features/settings/screens/SettingsScreen';

// 認証画面インポート
import LoginScreen from '../features/auth/screens/LoginScreen';
import { useAuth } from '../shared/contexts/AuthContext';

import { COLORS, FONT_SIZES, SPACING, APP_NAME } from '../shared/constants';
import { useResponsive } from '../shared/hooks/useResponsive';

/** ネイティブスタックナビゲーター */
const Stack = createNativeStackNavigator();
/** ドロワーナビゲーター（PC用） */
const Drawer = createDrawerNavigator();
/** ボトムタブナビゲーター（スマホ用） */
const Tab = createBottomTabNavigator();

/**
 * 企画管理スタックナビゲーター
 * 企画一覧・登録・編集画面を管理
 * @returns {JSX.Element} 企画管理スタック
 */
const EventStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="EventList" component={EventListScreen} />
    <Stack.Screen name="EventCreate" component={EventCreateScreen} />
    <Stack.Screen name="EventEdit" component={EventEditScreen} />
  </Stack.Navigator>
);

/**
 * 発券スタックナビゲーター
 * 発券企画一覧・発券詳細画面を管理
 * @returns {JSX.Element} 発券スタック
 */
const TicketStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.CARD_BACKGROUND,
      },
      headerTintColor: COLORS.PRIMARY,
      headerTitleStyle: {
        fontWeight: '600',
      },
      headerBackTitle: '戻る',
    }}
  >
    <Stack.Screen
      name="TicketList"
      component={TicketListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="TicketDetail"
      component={TicketDetailScreen}
      options={{ headerTitle: '発券' }}
    />
  </Stack.Navigator>
);

/**
 * 呼び出しスタックナビゲーター
 * 呼び出し企画一覧・呼び出し詳細画面を管理
 * @returns {JSX.Element} 呼び出しスタック
 */
const CallStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.CARD_BACKGROUND,
      },
      headerTintColor: COLORS.PRIMARY,
      headerTitleStyle: {
        fontWeight: '600',
      },
      headerBackTitle: '戻る',
    }}
  >
    <Stack.Screen
      name="CallList"
      component={CallListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CallDetail"
      component={CallDetailScreen}
      options={{ headerTitle: '呼び出し' }}
    />
  </Stack.Navigator>
);

/**
 * 状況確認スタックナビゲーター
 * 状況確認企画一覧・状況確認詳細画面を管理
 * @returns {JSX.Element} 状況確認スタック
 */
const StatusStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.CARD_BACKGROUND,
      },
      headerTintColor: COLORS.PRIMARY,
      headerTitleStyle: {
        fontWeight: '600',
      },
      headerBackTitle: '戻る',
    }}
  >
    <Stack.Screen
      name="StatusList"
      component={StatusListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="StatusDetail"
      component={StatusDetailScreen}
      options={{ headerTitle: '状況確認' }}
    />
  </Stack.Navigator>
);

/**
 * デフォルト設定スタックナビゲーター
 * デフォルト設定画面を管理
 * @returns {JSX.Element} デフォルト設定スタック
 */
const SettingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="SettingsMain" component={SettingsScreen} />
  </Stack.Navigator>
);

/**
 * タブアイコンコンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.icon - アイコン文字
 * @param {boolean} props.focused - フォーカス状態
 * @returns {JSX.Element} タブアイコン
 */
const TabIcon = ({ icon, focused }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
    <Text style={[styles.tabIconText, focused && styles.tabIconTextActive]}>
      {icon}
    </Text>
  </View>
);

/**
 * スマホ用ボトムタブナビゲーター
 * 左上にハンバーガーメニュー（ユーザー名+ログアウト）を配置
 * @returns {JSX.Element} ボトムタブナビゲーター
 */
/** スライドメニューの幅 */
const SLIDE_MENU_WIDTH = 260;

const MobileTabNavigator = () => {
  const { userName, signOut } = useAuth();
  /** デフォルト設定画面の表示状態 */
  const [showSettings, setShowSettings] = useState(false);
  /** ハンバーガーメニューの開閉状態 */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /** スライドアニメーション値（-SLIDE_MENU_WIDTH = 閉じ、0 = 開き） */
  const slideAnim = useRef(new Animated.Value(-SLIDE_MENU_WIDTH)).current;
  /** オーバーレイの透明度アニメーション */
  const overlayAnim = useRef(new Animated.Value(0)).current;

  /**
   * メニュー開閉時にアニメーションを実行
   */
  useEffect(() => {
    if (isMenuOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SLIDE_MENU_WIDTH,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isMenuOpen, slideAnim, overlayAnim]);

  /**
   * ログアウト確認ダイアログを表示
   */
  const handleLogoutPress = () => {
    setIsMenuOpen(false);
    /** Web環境ではwindow.confirmを使用（Alert.alertはWeb非対応） */
    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm(`${userName} からログアウトしますか？`);
      if (isConfirmed) {
        signOut();
      }
    }
  };

  return (
    <View style={styles.mobileContainer}>
      {/* ヘッダー: ハンバーガーメニュー */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setIsMenuOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>{APP_NAME}</Text>
        <View style={styles.hamburgerButton} />
      </View>

      {/* タブナビゲーター */}
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: COLORS.PRIMARY,
          tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="EventTab"
          component={EventStack}
          options={{
            tabBarLabel: '企画管理',
            tabBarIcon: ({ focused }) => <TabIcon icon="企" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="TicketTab"
          component={TicketStack}
          options={{
            tabBarLabel: '発券',
            tabBarIcon: ({ focused }) => <TabIcon icon="券" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="CallTab"
          component={CallStack}
          options={{
            tabBarLabel: '呼び出し',
            tabBarIcon: ({ focused }) => <TabIcon icon="呼" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="StatusTab"
          component={StatusStack}
          options={{
            tabBarLabel: '状況確認',
            tabBarIcon: ({ focused }) => <TabIcon icon="状" focused={focused} />,
          }}
        />
      </Tab.Navigator>

      {/* スライドメニューオーバーレイ */}
      {isMenuOpen && (
        <Animated.View
          style={[
            styles.slideOverlay,
            { opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) },
          ]}
        >
          <Pressable style={styles.slideOverlayPressable} onPress={() => setIsMenuOpen(false)} />
        </Animated.View>
      )}

      {/* スライドメニュー本体 */}
      <Animated.View style={[styles.slideMenu, { left: slideAnim }]}>
        {/* メニューヘッダー */}
        <View style={styles.slideMenuHeader}>
          <Text style={styles.slideMenuTitle}>{APP_NAME}</Text>
        </View>

        {/* ユーザー情報 */}
        <View style={styles.slideMenuUserSection}>
          <Text style={styles.slideMenuUserName} numberOfLines={1}>{userName}</Text>
        </View>

        {/* メニュー下部 */}
        <View style={styles.slideMenuFooter}>
          <TouchableOpacity
            style={styles.mobileMenuSettingsButton}
            onPress={() => {
              setIsMenuOpen(false);
              setShowSettings(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.mobileMenuSettingsText}>デフォルト設定</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuLogoutButton}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
          >
            <Text style={styles.mobileMenuLogoutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* デフォルト設定画面（フルスクリーン） */}
      {showSettings && (
        <View style={styles.settingsFullScreen}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity
              style={styles.settingsBackButton}
              onPress={() => setShowSettings(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsBackText}>← 戻る</Text>
            </TouchableOpacity>
          </View>
          <SettingsScreen />
        </View>
      )}
    </View>
  );
};

/**
 * カスタムドロワーコンテンツ（PC用）
 * @param {Object} props - ナビゲーションプロパティ
 * @returns {JSX.Element} ドロワーコンテンツ
 */
const CustomDrawerContent = (props) => {
  const { state, navigation } = props;
  const { userName, signOut } = useAuth();
  /** 現在のルート名 */
  const currentRoute = state.routes[state.index].name;

  /** メニュー項目 */
  const menuItems = [
    { name: 'EventTab', label: '企画管理', icon: '企', firstScreen: 'EventList' },
    { name: 'TicketTab', label: '発券', icon: '券', firstScreen: 'TicketList' },
    { name: 'CallTab', label: '呼び出し', icon: '呼', firstScreen: 'CallList' },
    { name: 'StatusTab', label: '状況確認', icon: '状', firstScreen: 'StatusList' },
    { name: 'SettingsTab', label: 'デフォルト設定', icon: '設', firstScreen: 'SettingsMain' },
  ];

  /**
   * メニュー項目をタップした時の処理
   * @param {Object} item - メニュー項目
   * @param {boolean} isActive - 現在選択中かどうか
   */
  const handleMenuPress = (item, isActive) => {
    if (isActive) {
      // 同じタブを押した場合、スタックの最初の画面に戻る
      navigation.navigate(item.name, { screen: item.firstScreen });
    } else {
      // 異なるタブの場合、通常のナビゲーション
      navigation.navigate(item.name);
    }
  };

  return (
    <View style={styles.drawerWrapper}>
      <DrawerContentScrollView {...props} style={styles.drawerContent}>
        {/* ヘッダー */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>{APP_NAME}</Text>
        </View>

        {/* メニュー項目 */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => {
            const isActive = currentRoute === item.name;
            return (
              <DrawerItem
                key={item.name}
                label={() => (
                  <View style={styles.menuItemContent}>
                    <View style={[styles.menuIcon, isActive && styles.menuIconActive]}>
                      <Text style={[styles.menuIconText, isActive && styles.menuIconTextActive]}>
                        {item.icon}
                      </Text>
                    </View>
                    <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                      {item.label}
                    </Text>
                  </View>
                )}
                onPress={() => handleMenuPress(item, isActive)}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
              />
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* フッター: ユーザー名 + ログアウト */}
      <View style={styles.drawerFooter}>
        <Text style={styles.drawerUserName} numberOfLines={1}>{userName}</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            /** Web環境ではwindow.confirmを使用（Alert.alertはWeb非対応） */
            if (Platform.OS === 'web') {
              const isConfirmed = window.confirm(`${userName} からログアウトしますか？`);
              if (isConfirmed) {
                signOut();
              }
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * PC用ドロワーナビゲーター
 * @returns {JSX.Element} ドロワーナビゲーター
 */
const DesktopDrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawerContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerType: 'permanent',
      drawerStyle: styles.drawer,
      overlayColor: 'transparent',
    }}
  >
    <Drawer.Screen name="EventTab" component={EventStack} />
    <Drawer.Screen name="TicketTab" component={TicketStack} />
    <Drawer.Screen name="CallTab" component={CallStack} />
    <Drawer.Screen name="StatusTab" component={StatusStack} />
    <Drawer.Screen name="SettingsTab" component={SettingsStack} />
  </Drawer.Navigator>
);

/**
 * アプリケーションナビゲーター
 * 認証状態に応じてログイン画面 or メイン画面を表示
 * PC: Drawer（左サイドバー）
 * スマホ: BottomTab（画面下タブ）
 * @returns {JSX.Element} ナビゲーターコンポーネント
 */
const AppNavigator = () => {
  const { isMobile } = useResponsive();
  const { isLoading, isAuthorized } = useAuth();

  // 初期セッション確認中はローディング表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // 未認証 or 権限なしの場合はログイン画面
  if (!isAuthorized) {
    return <LoginScreen />;
  }

  /** 画面名から日本語タイトルへのマッピング */
  const SCREEN_TITLE_MAP = {
    EventTab: '企画管理',
    EventList: '企画管理',
    EventCreate: '企画登録',
    EventEdit: '企画編集',
    TicketTab: '発券',
    TicketList: '発券',
    TicketDetail: '発券',
    CallTab: '呼び出し',
    CallList: '呼び出し',
    CallDetail: '呼び出し',
    StatusTab: '状況確認',
    StatusList: '状況確認',
    StatusDetail: '状況確認',
    SettingsTab: 'デフォルト設定',
    SettingsMain: 'デフォルト設定',
  };

  return (
    <NavigationContainer
      documentTitle={{
        formatter: (options, route) => {
          /** 画面名に対応する日本語タイトル */
          const title = SCREEN_TITLE_MAP[route?.name] || options?.title || route?.name;
          return `${title} | ${APP_NAME}`;
        },
      }}
    >
      {isMobile ? <MobileTabNavigator /> : <DesktopDrawerNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  /** PC用ドロワー */
  drawer: {
    width: 280,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    marginBottom: SPACING.MD,
  },
  drawerTitle: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    whiteSpace: 'nowrap',
  },
  menuContainer: {
    paddingHorizontal: SPACING.SM,
  },
  menuItem: {
    borderRadius: 8,
    marginVertical: 2,
  },
  menuItemActive: {
    backgroundColor: COLORS.PRIMARY + '15',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.SM,
  },
  menuIconActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  menuIconText: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
  },
  menuIconTextActive: {
    color: COLORS.CARD_BACKGROUND,
  },
  menuLabel: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT,
  },
  menuLabelActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  /** スマホ用ボトムタブ */
  tabBar: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: FONT_SIZES.XS,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabIconText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
  },
  tabIconTextActive: {
    color: COLORS.CARD_BACKGROUND,
  },
  /** PC用ドロワーフッター */
  drawerWrapper: {
    flex: 1,
  },
  drawerFooter: {
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  drawerUserName: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT,
    marginBottom: SPACING.SM,
  },
  logoutButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.ERROR,
    fontWeight: '600',
  },
  /** スマホ用ヘッダー+メニュー */
  mobileContainer: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.XL,
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: FONT_SIZES.HEADING,
    color: COLORS.TEXT,
  },
  mobileHeaderTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  /** スライドメニュー */
  slideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10,
  },
  slideOverlayPressable: {
    flex: 1,
  },
  slideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SLIDE_MENU_WIDTH,
    backgroundColor: COLORS.CARD_BACKGROUND,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 16,
  },
  slideMenuHeader: {
    paddingTop: SPACING.XL,
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  slideMenuTitle: {
    fontSize: FONT_SIZES.HEADING,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  slideMenuUserSection: {
    flex: 1,
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.LG,
  },
  slideMenuUserName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  slideMenuFooter: {
    padding: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  mobileMenuLogoutButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
    alignItems: 'center',
  },
  mobileMenuLogoutText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.ERROR,
    fontWeight: '600',
  },
  /** モバイル設定ボタン */
  mobileMenuSettingsButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  mobileMenuSettingsText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  /** モバイル設定フルスクリーン */
  settingsFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.BACKGROUND,
    zIndex: 30,
  },
  settingsHeader: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    paddingTop: SPACING.XL,
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  settingsBackButton: {
    paddingVertical: SPACING.XS,
  },
  settingsBackText: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  /** ローディング画面 */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AppNavigator;
