import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';

import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from './theme';
import { font, radius } from './tokens';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export type TabIconName = 'house' | 'message' | 'students' | 'training' | 'growth' | 'profile' | 'today';
// Mechanical 24-grid port of MeetPRTabBar.swift at release/1.0 @ 202e95db.
const paths = {
  house: 'M3 11L12 3 21 11M5 10V20H19V10',
  message: 'M21 15C21 16.1 20.1 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5Z',
  students: 'M3.5 19C3.5 11.7 14.5 11.7 14.5 19M16 6C20 6 20 12 16 12M15.5 19C16.3 15.8 18.6 14 21.5 14',
  training: 'M3 9V15M6 7V17M18 7V17M21 9V15M6 12H18',
  growth: 'M4 5V19H20M8 15L11 11 14 14 18 8',
  profile: 'M5.5 20C5.5 11.3 18.5 11.3 18.5 20',
} as const;

export function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {name === 'today' ? <>
      <Circle cx={11.5} cy={12.5} r={8.6} strokeWidth={2.3} />
      <Circle cx={11.5} cy={12.5} r={4.8} strokeWidth={2.3} />
      <Path d="M14.4 8.6L21.5 2.3M22.6 4.5L20.1 3.5 19.5 0.9M21.1 5.8L18.6 4.8 18 2.2" />
      <Circle cx={11.5} cy={12.5} r={1.6} fill={color} stroke="none" />
      <Path d="M10.8 12.2L16.2 10.2 13.8 7.2Z" fill={color} stroke="none" />
    </> : <>
      <Path d={paths[name]} />
      {name === 'students' ? <Circle cx={9} cy={8} r={3} /> : null}
      {name === 'profile' ? <Circle cx={12} cy={8} r={3.2} /> : null}
    </>}
  </Svg>;
}

export function TabBar({ state, descriptors, navigation, insets, icons, selectedColor, unselectedColor, badgeColor, badgeDot = false }: BottomTabBarProps & { icons: Record<string, TabIconName>; selectedColor?: string; unselectedColor?: string; badgeColor?: string; badgeDot?: boolean }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceCard, paddingTop: 5, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: colors.borderSubtle }} />
    {state.routes.map((route, index) => {
      // The map is the visible rail; hidden routes (e.g. growth-curve) stay navigable.
      const icon = icons[route.name];
      if (!icon) return null;
      const { options } = descriptors[route.key];
      const selected = state.index === index;
      const color = selected ? selectedColor ?? colors.goldCTA : unselectedColor ?? colors.textTertiary;
      const title = options.title ?? route.name;
      const badge = options.tabBarBadge;
      const showBadge = badge !== undefined && (typeof badge !== 'number' || badge > 0);
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={options.tabBarAccessibilityLabel ?? title} accessibilityState={{ selected }} testID={options.tabBarButtonTestID}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 }, pressed && { transform: [{ scale: 0.9 }] }]}>
        <View style={{ width: 24, height: 24 }}>
          <TabIcon name={icon} color={color} />
          {showBadge ? <View style={{ position: 'absolute', right: -10, top: -6, minWidth: badgeDot ? 7 : 16, minHeight: badgeDot ? 7 : 16, paddingHorizontal: badgeDot ? 0 : 3, borderRadius: radius.pill, backgroundColor: badgeColor ?? colors.dangerFill, alignItems: 'center', justifyContent: 'center' }}>
            {!badgeDot ? <Text style={{ ...font.mono(9, 'bold'), color: colors.inkOnCTAFill }}>{typeof badge === 'number' && badge > 99 ? '99+' : badge}</Text> : null}
          </View> : null}
        </View>
        <Text style={{ fontSize: 11, color }}>{title}</Text>
      </Pressable>;
    })}
  </View>;
}
