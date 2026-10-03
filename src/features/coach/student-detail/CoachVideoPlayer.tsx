import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentVideo } from '@/api/domains/videos';
import type { SetLog } from '@/api/domains/sets';
import { VideoPlayback } from '@/features/training/video-upload/VideoPlayback';
import { useColors, radius } from '@/design';
import { t } from '@/i18n';
import { Copy } from './components';

/** Pure W1-h playback, including fresh URL on open and on playback Retry. No editing/export. */
export function CoachVideoPlayer({ video, log, title, coachName, onClose }: { video: StudentVideo; log: SetLog | null; title: string; coachName: string; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const weight = log?.weight_kg ?? video.weight_kg;
  const reps = log?.reps ?? video.reps;
  const index = log?.set_index ?? video.set_index;
  const missing = t('coach.profile.notProvided');
  return <View style={{ flex: 1 }}>
    <VideoPlayback localUri={null} attachmentId={video.id} onClose={onClose} />
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 88, borderRadius: radius.inset, padding: 12, gap: 4, backgroundColor: colors.surfaceFocus }}>
      <Copy bold tone="inkOnCTAFill">{title}</Copy>
      <Copy mono size={12} tone="inkOnCTAFill">{weight == null ? missing : Number(weight)} kg · {reps == null ? missing : t('coach.videoFeedback.repsValue %lld', [reps])} · {t('coach.videoFeedback.rpe')} {log?.rpe == null ? missing : Number(log.rpe)}</Copy>
      <Copy size={12} tone="inkOnCTAFill">{index == null ? missing : t('coach.videoFeedback.setNumber %lld', [index + 1])} · {coachName}</Copy>
    </View>
  </View>;
}
