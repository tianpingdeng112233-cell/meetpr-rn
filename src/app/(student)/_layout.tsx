import { Tabs } from 'expo-router';
import { t } from '@/i18n';
import { useSessionStore } from '@/api/session';
import { TabBar, type TabIconName } from '@/design';
import { useOpenCoachChat } from '@/features/chat/open-coach-chat';
import { BindGate } from '@/navigation/BindGate';
import { studentTabs } from '@/navigation/student-tabs';

function StudentTabs({ unread = 0 }: { unread?: number }) {
  const role = useSessionStore(state => state.user?.role);
  const icons: Record<string, TabIconName> = {};
  const tabIcons = { training: 'training', chat: 'message', growth: 'growth', profile: 'profile' } as const;
  for (const name of studentTabs(role)) icons[name] = tabIcons[name];
  return <Tabs initialRouteName="training" backBehavior="history" detachInactiveScreens={false}
    tabBar={props => <TabBar {...props} variant="student" icons={icons} selectedRouteName={props.state.routes[props.state.index]?.name === 'body-weight' ? 'growth' : undefined} hideSelectedBadge />}
    screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
    <Tabs.Screen name="training" options={{ title: t('student.studentRootView.copy002') }} />
    <Tabs.Screen name="chat" options={{ title: t('student.coachTab.title'), tabBarBadge: unread || undefined, href: role === 'self_train_student' ? null : undefined }} />
    <Tabs.Screen name="growth" options={{ title: t('student.studentRootView.copy003') }} />
    <Tabs.Screen name="profile" options={{ title: t('student.studentRootView.copy004') }} />
    <Tabs.Screen name="body-weight" options={{ href: null }} />
    <Tabs.Screen name="feedback" options={{ href: null }} />
  </Tabs>;
}
function CoachedTabs({ studentId }: { studentId: string }) {
  const { totalUnread } = useOpenCoachChat(studentId);
  return <StudentTabs unread={totalUnread} />;
}
export default function StudentTabLayout() {
  const user = useSessionStore(state => state.user);
  return user?.role === 'coached_student'
    ? <BindGate><CoachedTabs key={user.id} studentId={user.id} /></BindGate>
    : <StudentTabs key={user?.id} />;
}
