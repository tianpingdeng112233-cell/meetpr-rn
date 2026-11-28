import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import { ActivityIndicator, ToastAndroid, View } from 'react-native';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { spacing } from '@/design';
import { t } from '@/i18n';
import { useBadgeCapture } from './BadgeCaptureHost';
import { presentBadge } from './badge-presentation';
import type { VideoBadgeInfo } from './types';

type ExportButtonProps = { uri: string; videoId?: string; badge: VideoBadgeInfo; getBadge?: () => Promise<VideoBadgeInfo>; refreshURL: () => Promise<string> };

export function GalleryExportButton({ uri, videoId, badge, getBadge, refreshURL }: ExportButtonProps) {
  const capture = useBadgeCapture();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  if (!presentBadge(badge, 'export')) return null;
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    let setupStage: string | null = 'LOAD_EXPORT';
    try {
      // The shared coach/chat player can mount without initializing Android gallery services.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { galleryPermission, saveReplayVideo } = require('@/features/training/video-upload/gallery-save') as typeof import('@/features/training/video-upload/gallery-save');
      setupStage = 'BADGE_DATA';
      const current = getBadge ? await getBadge() : badge;
      if (!presentBadge(current, 'export')) throw new Error('Badge unavailable');
      setupStage = null;
      await saveReplayVideo(uri, current, capture, galleryPermission, refreshURL, videoId);
      ToastAndroid.show(t('chat.videoExport.saved'), ToastAndroid.SHORT);
    } catch (error) {
      if (setupStage) console.warn('[video.replay_save]', setupStage);
      ToastAndroid.show(t(error instanceof Error && error.message === 'Photos permission denied'
        ? 'chat.videoExport.photoPermissionDenied' : 'chat.videoExport.failed'), ToastAndroid.LONG);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return <FeedbackPressable testID="feedback.video.export" accessibilityRole="button"
    accessibilityLabel={t(saving ? 'chat.videoExport.exporting' : 'student.cameraRecorderComponents.copy006')}
    accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={() => void save()}
    style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center' }}>
    {/* Same dark backing as the other player chrome, so the icon reads on bright footage. */}
    <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1 }}>
      {saving ? <ActivityIndicator size="small" color="white" /> :
        <MaterialCommunityIcons name="download-outline" size={20} color="white" />}
    </View>
  </FeedbackPressable>;
}
