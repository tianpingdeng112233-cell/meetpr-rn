import { Tabs } from 'expo-router';
import { t } from '@/i18n';
import { TabBar, useColors } from '@/design';
import { useCoachData } from '@/features/coach/CoachDataProvider';
import { selectMessagesBadge } from '@/domain/coach/todo-list';
import { AnalyticsEvent, track } from '@/analytics';
const screens: Record<string, string> = { today: 'dashboard', messages: 'coach_receiving', students: 'coach_roster', profile: 'account' };
export default function CoachTabs() {
  const { applications, videos, conversations } = useCoachData();
  const colors = useColors();
  return <Tabs initialRouteName="today" detachInactiveScreens={false} screenOptions={{ headerShown: false, lazy: false, freezeOnBlur: false }} screenListeners={({ route }) => ({ focus: () => { void track(AnalyticsEvent.ScreenView, { screen: screens[route.name] }); } })}
    tabBar={props => <TabBar {...props} icons={{ today: 'house', messages: 'message', students: 'students', profile: 'profile' }} selectedColor={colors.gold500} unselectedColor={colors.textDisabled} badgeColor={colors.danger} badgeDot />}>
    <Tabs.Screen name="today" options={{ title: t('coach.shell.today') }} />
    <Tabs.Screen name="messages" options={{ title: t('coach.chat.messages'), tabBarBadge: selectMessagesBadge(videos, conversations) }} />
    <Tabs.Screen name="students" options={{ title: t('coach.shell.students'), tabBarBadge: applications.length }} />
    <Tabs.Screen name="profile" options={{ title: t('coach.shell.profile') }} />
  </Tabs>;
}
