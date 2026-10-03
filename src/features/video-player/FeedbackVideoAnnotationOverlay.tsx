import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';

/** Mounted per selection: a late image event cannot change the next frame's spinner. */
export function FeedbackVideoAnnotationOverlay({ url, close, loadFailed }: {
  url: string;
  close: () => void;
  loadFailed: () => void;
}) {
  const [loading, setLoading] = useState(true);
  return <Pressable feedback="none" testID="feedback.video.annotationOverlay" accessibilityRole="button" accessibilityLabel={t('chat.closeAnnotation')}
    onPress={close} style={[StyleSheet.absoluteFill, styles.overlay]}>
    <Image source={{ uri: url }} resizeMode="contain" style={StyleSheet.absoluteFill}
      onLoad={() => setLoading(false)} onError={loadFailed} />
    {loading ? <ActivityIndicator color="white" accessibilityLabel={t('chat.refreshing')} /> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  overlay: { backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
});
