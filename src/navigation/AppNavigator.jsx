/**
 * アプリケーションナビゲーター
 * アプリ全体のナビゲーション構造を定義
 * PC: 左サイドバー（Drawer）
 * スマホ: 画面下タブバー（BottomTab）
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

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
 * @returns {JSX.Element} ボトムタブナビゲーター
 */
const MobileTabNavigator = () => (
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
);

/**
 * カスタムドロワーコンテンツ（PC用）
 * @param {Object} props - ナビゲーションプロパティ
 * @returns {JSX.Element} ドロワーコンテンツ
 */
const CustomDrawerContent = (props) => {
  const { state, navigation } = props;
  /** 現在のルート名 */
  const currentRoute = state.routes[state.index].name;

  /** メニュー項目 */
  const menuItems = [
    { name: 'EventTab', label: '企画管理', icon: '企', firstScreen: 'EventList' },
    { name: 'TicketTab', label: '発券', icon: '券', firstScreen: 'TicketList' },
    { name: 'CallTab', label: '呼び出し', icon: '呼', firstScreen: 'CallList' },
    { name: 'StatusTab', label: '状況確認', icon: '状', firstScreen: 'StatusList' },
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
  </Drawer.Navigator>
);

/**
 * アプリケーションナビゲーター
 * PC: Drawer（左サイドバー）
 * スマホ: BottomTab（画面下タブ）
 * @returns {JSX.Element} ナビゲーターコンポーネント
 */
const AppNavigator = () => {
  const { isMobile } = useResponsive();

  return (
    <NavigationContainer>
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
});

export default AppNavigator;
