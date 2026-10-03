import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { useTheme } from './theme';

export type ScreenProps = PropsWithChildren<SafeAreaViewProps>;

export function Screen({ children, style, ...props }: ScreenProps) {
  const { colors, scheme } = useTheme();
  return <SafeAreaView style={[{ flex: 1, backgroundColor: colors.bgBase }, style]} {...props}>
    <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
    {children}
  </SafeAreaView>;
}
