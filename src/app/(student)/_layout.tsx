import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useSessionStore } from '@/api/session';
import { colors } from '@/design';
import { useStudentTabsStore } from '@/features/student-tabs';
import { BindGate } from '@/navigation/BindGate';

function StudentTabs() {
  const bumpTodayReload = useStudentTabsStore((state) => state.bumpTodayReload);
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
        listeners={{ tabPress: bumpTodayReload }}
        options={{
          title: '今日',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: '训练',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="dumbbell" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: '成长',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="chart-line" size={size} />
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
      <Tabs.Screen name="growth-curve" options={{ href: null }} />
    </Tabs>
  );
}

export default function StudentTabLayout() {
  const role = useSessionStore((state) => state.user?.role);
  const tabs = <StudentTabs />;

  if (role === 'coached_student') {
    return <BindGate>{tabs}</BindGate>;
  }

  // TODO(W1): self_train_student 仍需补齐 iOS E1RMCompetitionLiftGate 迁移门。
  return tabs;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface1,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
});
