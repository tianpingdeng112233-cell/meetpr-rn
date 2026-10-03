import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useColors } from './theme';
import { font, radius } from './tokens';

const useToast = create<{ message: string | null; revision: number; quickLog: boolean }>(() => ({ message: null, revision: 0, quickLog: false }));
export function showToast(message: string | null, quickLog = false) {
  if (message) useToast.setState(state => ({ message, quickLog, revision: state.revision + 1 }));
}

export function Toast() {
  const { message, revision, quickLog } = useToast();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => useToast.setState({ message: null }), quickLog ? 2000 : 3000);
    return () => clearTimeout(timer);
  }, [message, revision, quickLog]);
  return message ? <ToastMessage message={message} quickLog={quickLog} /> : null;
}

function ToastMessage({ message, quickLog }: { message: string; quickLog: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={[styles.container, quickLog ? { top: insets.top + 12, backgroundColor: colors.holdTrack, borderColor: colors.gold500, borderRadius: radius.pill } : { bottom: insets.bottom + 20, backgroundColor: colors.surfaceElevated, borderColor: colors.borderDefault }]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ ...font.body(14), color: quickLog ? colors.gold500 : colors.textPrimary }}>{message}</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { position: 'absolute', left: 20, right: 20, padding: 16, borderWidth: 1, borderRadius: radius.card },
});
