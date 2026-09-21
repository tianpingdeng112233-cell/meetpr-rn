import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { rates, rateText, workbenchRateText } from './rate';
import { VideoBadgeOverlay } from './VideoBadgeOverlay';
import { VideoBadgeScrim } from './VideoBadgeScrim';
import type { VideoBadgeInfo } from './types';

/** Embedded chrome; playback, seeking and retry remain owned by the shared session. */
export function FeedbackVideoWorkbenchPlayer({ video, playbackControl, annotation, scrubber, rate, selectRate, badge, onAddMarker }: {
  video: ReactNode;
  playbackControl: ReactNode;
  annotation?: ReactNode;
  scrubber?: ReactNode;
  rate: number;
  selectRate: (rate: number) => void;
  badge?: VideoBadgeInfo | null;
  onAddMarker?: () => void;
}) {
  const colors = useColors();
  return <View accessibilityValue={{ text: `${t('chat.playbackSpeed')} ${workbenchRateText(rate)}` }}
    style={[styles.root, { backgroundColor: colors.textPrimary }]}>
    <View style={[styles.stage, { backgroundColor: colors.videoStageFill, borderColor: colors.videoStageBorder }]}>
      {video}
      {badge ? <VideoBadgeScrim /> : null}
      <View style={styles.center} pointerEvents={annotation ? 'none' : 'box-none'}
        accessibilityElementsHidden={Boolean(annotation)} importantForAccessibility={annotation ? 'no-hide-descendants' : 'auto'}>
        {playbackControl}
      </View>
      {annotation}
      {badge ? <View style={styles.badge} pointerEvents="none">
        <VideoBadgeOverlay info={badge} expanded={false} allowsExpansion={false} onToggle={() => {}} />
      </View> : null}
    </View>
    {scrubber}
    {scrubber ? <View style={styles.controlRow}>
      <View style={[styles.rates, { backgroundColor: `${colors.inkOnCTAFill}14` }]}>
        {rates.map(option => <Pressable key={option} accessibilityRole="button"
          accessibilityLabel={`${t('chat.playbackSpeed')} ${workbenchRateText(option)}`}
          accessibilityState={{ selected: option === rate }} testID={`feedback.video.speed.${rateText(option)}`}
          onPress={() => selectRate(option)} style={[styles.rate, option === rate && { backgroundColor: colors.textPrimary }]}>
          <Text style={[styles.rateText, { color: option === rate ? colors.inkOnCTAFill : colors.textTertiary }]}>{workbenchRateText(option)}</Text>
        </Pressable>)}
      </View>
      {onAddMarker ? <Pressable accessibilityRole="button" testID="feedback.video.addMarker" onPress={onAddMarker}
        style={[styles.addMarker, { borderColor: colors.videoStageBorder }]}>
        <Text style={[styles.addMarkerText, { color: colors.inkOnCTAFill }]}>{t('chat.addVideoMarker')}</Text>
      </Pressable> : null}
    </View> : null}
  </View>;
}

export function FeedbackVideoFailureCard({ retrying, retry, workbench = false }: {
  retrying: boolean;
  retry: () => void;
  workbench?: boolean;
}) {
  const colors = useColors();
  return <View style={[styles.failure, { backgroundColor: workbench ? colors.videoStageFill : colors.surfaceCard, borderColor: workbench ? colors.videoStageBorder : colors.borderDefault }]}>
    <MaterialCommunityIcons name="alert" size={26} color={colors.gold500} />
    <Text style={[styles.failureText, { color: workbench ? colors.inkOnCTAFill : colors.textPrimary }]}>{t('chat.playbackFailed')}</Text>
    <Pressable accessibilityRole="button" disabled={retrying} accessibilityState={{ disabled: retrying }} onPress={retry}
      style={[styles.retry, { backgroundColor: colors.goldCTA }]}>
      <Text style={[styles.retryText, { color: colors.inkOnGold }]}>{t(retrying ? 'chat.refreshing' : 'chat.retry')}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.point11, padding: spacing.space3, borderRadius: radius.card, overflow: 'hidden' },
  stage: { height: 270, borderRadius: radius.inset, borderWidth: spacing.point1, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  // Overlay includes 13pt full-screen padding; offset by 3 for the workbench's 10pt inset.
  badge: { ...StyleSheet.absoluteFill, bottom: -spacing.point3 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  rates: { flex: 1, flexDirection: 'row', padding: spacing.point3, borderRadius: radius.inset },
  rate: { flex: 1, alignItems: 'center', paddingVertical: spacing.point6, borderRadius: spacing.point7 },
  rateText: { ...font.mono(11) },
  addMarker: { paddingHorizontal: spacing.space3, paddingVertical: spacing.point7, borderWidth: spacing.point1, borderRadius: radius.inset },
  addMarkerText: { ...font.body(12, 'semibold') },
  failure: { width: '100%', maxWidth: 280, padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg, gap: spacing.base, alignItems: 'center' },
  failureText: { ...font.body(14), textAlign: 'center' },
  retry: { height: spacing.minimumHitTarget, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  retryText: { ...font.body(14, 'semibold') },
});
