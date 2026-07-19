import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors } from '@/design';

export default function CoachTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandRed,
        tabBarInactiveTintColor: colors.fgTertiary,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="today"
        options={{
          title: '今日',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: '学员',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="account-group" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: '编排',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="calendar-plus" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="receiving"
        options={{
          title: '接收',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="inbox" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="account" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface1,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
});
