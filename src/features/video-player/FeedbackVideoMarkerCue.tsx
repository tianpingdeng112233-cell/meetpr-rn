import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { font } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { VideoBadgePalette as palette } from './badge-palette';
import { cueLineUnits, cuePaddingUnits, cuePreviewLines } from './video-badge-layout';
import { timeText } from './time';
import type { FeedbackVideoMarker } from './types';

const fadeIn = FadeIn.duration(250);
const fadeOut = FadeOut.duration(250);

export function FeedbackVideoMarkerCue({ marker, selected, select, failed, retry, scale: s, anchor, maxTextHeight, onHeight }: {
  marker: FeedbackVideoMarker | null;
  selected: boolean;
  select: (marker: FeedbackVideoMarker) => void;
  failed: boolean;
  retry?: () => void | Promise<void>;
  scale: number;
  anchor: { top: '100%'; marginTop: number } | { bottom: number };
  maxTextHeight: number;
  onHeight: (height: number) => void;
}) {
  if ((!marker && !failed) || !(s > 0)) return null;
  const position = { position: 'absolute', left: 44 * s, maxWidth: 452 * s, ...anchor } as const;
  const pill = { paddingVertical: cuePaddingUnits * s, paddingHorizontal: 20 * s, borderRadius: 22 * s, backgroundColor: palette.cardFill };
  const body = { ...font.body(20 * s), lineHeight: cueLineUnits * s, color: 'white', includeFontPadding: false, flexShrink: 1 };
  if (failed) return <View onLayout={event => onHeight(event.nativeEvent.layout.height)} style={[position, styles.row, pill, { columnGap: 12 * s }]}>
    <Text style={body}>{t('chat.videoMarkersFailed')}</Text>
    {retry ? <Pressable testID="feedback.video.marker.retry" accessibilityRole="button" onPress={retry} hitSlop={8}>
      <Text style={[body, { color: palette.gold }]}>{t('chat.retry')}</Text>
    </Pressable> : null}
  </View>;
  if (!marker) return null;
  const note = <Pressable feedback="none" testID="feedback.video.marker.cue" accessibilityRole="button"
    onPress={() => select(marker)} style={[styles.row, { gap: 12 * s }]}>
    <Text style={{ ...font.mono(16 * s), includeFontPadding: false, color: palette.gold }}>{timeText(marker.timeMs / 1000)}</Text>
    <Text numberOfLines={selected ? undefined : cuePreviewLines} style={body}>{marker.note || t('chat.videoMarker')}</Text>
    {marker.annotationURL ? <MaterialCommunityIcons testID="feedback.video.marker.annotationBadge"
      accessible={false} name="pencil" size={16 * s} color={palette.gold} /> : null}
  </Pressable>;
  return <Animated.View onLayout={event => onHeight(event.nativeEvent.layout.height)} entering={fadeIn} exiting={fadeOut} style={[position, pill]}>
    {selected ? <ScrollView style={{ maxHeight: maxTextHeight }} keyboardShouldPersistTaps="handled">{note}</ScrollView> : note}
  </Animated.View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
});
