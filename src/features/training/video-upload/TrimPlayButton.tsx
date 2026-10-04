import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';

export function TrimPlayButton({ playing, disabled, onPress }: { playing: boolean; disabled: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable testID="trim-play-button" accessibilityRole="button"
    accessibilityLabel={t(playing ? 'student.videoTrimView.copy004' : 'student.videoTrimView.copy005')}
    disabled={disabled} onPress={onPress}
    style={{ width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, borderRadius: radius.pill, backgroundColor: colors.numberPadScrim, alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons testID="trim-play-icon" name={playing ? 'pause' : 'play'} size={24} color={colors.inkOnCTAFill} />
  </Pressable>;
}
