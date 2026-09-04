import { Tabs } from 'expo-router';

import { t } from '@/i18n';
import { TabBar } from '@/design';

export default function CoachTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} icons={{ today: 'house', students: 'students', planning: 'training', receiving: 'message', profile: 'profile' }} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="today"
        options={{
          title: t('coach.shell.today'),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: t('coach.shell.students'),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: t('coach.workspace.title'),
        }}
      />
      <Tabs.Screen
        name="receiving"
        options={{
          title: t('coach.applicationProfile.accept'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('student.studentRootView.copy004'),
        }}
      />
    </Tabs>
  );
}
