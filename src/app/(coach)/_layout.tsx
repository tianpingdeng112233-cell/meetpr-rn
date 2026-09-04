import { Tabs } from 'expo-router';

import { TabBar } from '@/design';

export default function CoachTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} icons={{ today: 'house', students: 'students', planning: 'training', receiving: 'message', profile: 'profile' }} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="today"
        options={{
          title: '今日',
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: '学员',
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: '编排',
        }}
      />
      <Tabs.Screen
        name="receiving"
        options={{
          title: '接收',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
        }}
      />
    </Tabs>
  );
}
