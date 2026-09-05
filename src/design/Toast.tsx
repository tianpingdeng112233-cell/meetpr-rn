import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useColors } from './theme';
import { font, radius } from './tokens';

const useToast = create<{ message: string | null; revision: number }>(() => ({ message: null, revision: 0 }));
export function showToast(message: string | null) {
  if (message) useToast.setState(state => ({ message, revision: state.revision + 1 }));
}

export function Toast() {
  const { message, revision } = useToast();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => useToast.setState({ message: null }), 3000);
    return () => clearTimeout(timer);
  }, [message, revision]);
  return message ? <ToastMessage message={message} /> : null;
}

function ToastMessage({ message }: { message: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={[styles.container, { bottom: insets.bottom + 20, backgroundColor: colors.surfaceElevated, borderColor: colors.borderDefault }]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ ...font.body(14), color: colors.textPrimary }}>{message}</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { position: 'absolute', left: 20, right: 20, padding: 16, borderWidth: 1, borderRadius: radius.card },
});
