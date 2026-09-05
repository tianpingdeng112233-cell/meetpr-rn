import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { font, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { markerPanelVisible } from '@/features/feedback/markers-outcome';
import { timeText } from './time';
import type { FeedbackVideoMarker } from './types';

export function FeedbackVideoMarkerPanel({ markers, failed, seconds, duration, select }: {
  markers: FeedbackVideoMarker[] | null;
  failed: boolean;
  seconds: number;
  duration: number;
  select: (marker: FeedbackVideoMarker) => void;
}) {
  const colors = useColors();
  if (!markerPanelVisible(markers, failed)) return null;
  return <View style={styles.panel}>
    <View style={styles.header}>
      <Text style={styles.heading}>{failed ? t('chat.videoMarkersFailed') : t('chat.videoMarkers', [markers?.length ?? 0])}</Text>
      <Text style={styles.time}>{timeText(seconds)} / {timeText(duration)}</Text>
    </View>
    {!failed ? <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
      {markers?.map(marker => <Pressable key={marker.id} accessibilityRole="button"
        accessibilityLabel={`${marker.annotationURL ? '✏️ ' : ''}${t('chat.seekToVideoMarker', [timeText(marker.timeMs / 1000)])}`}
        onPress={() => select(marker)} style={styles.marker}>
        <Text style={[styles.markerTime, { color: colors.gold500 }]}>{timeText(marker.timeMs / 1000)}</Text>
        <Text style={styles.note}>{marker.note || t('chat.videoMarker')}</Text>
        {marker.annotationURL ? <MaterialCommunityIcons testID="feedback.video.marker.annotationBadge" accessible={false} importantForAccessibility="no" name="pencil" size={11} color={colors.gold500} /> : null}
        <MaterialCommunityIcons accessible={false} name="skip-forward" size={11} color="rgba(255,255,255,0.72)" />
      </Pressable>)}
    </ScrollView> : null}
  </View>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: 'rgba(0,0,0,0.72)', padding: spacing.base, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  heading: { ...font.mono(11, 'semibold'), color: 'rgba(255,255,255,0.82)', flexShrink: 1 },
  time: { ...font.mono(11), color: 'rgba(255,255,255,0.82)' },
  list: { maxHeight: 190 },
  marker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  markerTime: { ...font.mono(12, 'bold') },
  note: { ...font.body(14), color: 'white', flex: 1 },
});
