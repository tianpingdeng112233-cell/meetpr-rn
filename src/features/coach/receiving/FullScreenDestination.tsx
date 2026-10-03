import { useCallback, useState } from 'react';
import { useFocusEffect , router } from 'expo-router';
import { Modal } from 'react-native';
import type { PropsWithChildren } from 'react';
/** Cover the tab rail without modifying the independently owned W2-a shell. */
export function FullScreenDestination({ children }: PropsWithChildren) {
  const focused = useDestinationFocused();
  return <Modal visible={focused} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => router.back()}>{children}</Modal>;
}

export function useDestinationFocused() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  return focused;
}
