import { Tabs } from 'expo-router';

import { t } from '@/i18n';
import { useSessionStore } from '@/api/session';
import { TabBar } from '@/design';
import { useStudentTabsStore } from '@/features/student-tabs';
import { BindGate } from '@/navigation/BindGate';

function StudentTabs() {
  const bumpTodayReload = useStudentTabsStore((state) => state.bumpTodayReload);
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} icons={{ today: 'today', training: 'training', growth: 'growth', profile: 'profile' }} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="today"
        listeners={{ tabPress: bumpTodayReload }}
        options={{
          title: t('student.studentRootView.copy001'),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: t('student.studentRootView.copy002'),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: t('student.studentRootView.copy003'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('student.studentRootView.copy004'),
        }}
      />
      <Tabs.Screen name="feedback" options={{ href: null }} />
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
