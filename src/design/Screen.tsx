import type { PropsWithChildren } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
// RN's built-in SafeAreaView is a no-op on Android; with edge-to-edge (SDK 35)
// content would slide under the system bars without this implementation.
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './tokens';

export type ScreenProps = PropsWithChildren<ViewProps>;

export function Screen({ children, style, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.root, style]} {...props}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
