import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { uploadsRepository } from '@/api/domains/uploads';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import { selectPlaybackSource } from './local-retention';

/** Source resolution only; the OverlayHost owner supplies the full-screen layer. */
export function VideoPlayback({ localUri, attachmentId, onClose, badge }: {
  badge?: VideoBadgeInfo | null;
  localUri: string | null;
  attachmentId: string | null;
  onClose: () => void;
}) {
  return <ResolvedVideoPlayback key={`${attachmentId}:${localUri}`} localUri={localUri} attachmentId={attachmentId} onClose={onClose} badge={badge} />;
}

function ResolvedVideoPlayback({ localUri, attachmentId, onClose, badge }: { localUri: string | null; attachmentId: string | null; onClose: () => void; badge?: VideoBadgeInfo | null }) {
  const colors = useColors();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refreshURL = useCallback(() => selectPlaybackSource(
    localUri,
    value => new File(value).exists,
    async () => {
      if (!attachmentId) throw new Error('No remote video');
      return (await uploadsRepository.url(attachmentId)).url;
    },
  ), [localUri, attachmentId]);
  useEffect(() => {
    let live = true;
    void refreshURL().then(value => { if (live) setUri(value); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [refreshURL, attempt]);
  if (uri) return <FeedbackVideoPlayer videoId={attachmentId ?? localUri ?? ''} url={uri} markers={null} badge={badge} refreshURL={refreshURL} onClose={onClose} />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }}>
    <View style={{ padding: spacing.base, gap: spacing.md }}>
      <AppButton variant="secondary" label={t('chat.closePlayback')} onPress={onClose} />
      {failed ? <>
        <Text style={{ color: colors.textSecondary }}>{t('student.videoAttachmentSection.copy004')}</Text>
        <AppButton label={t('student.videoAttachmentSection.copy002')} onPress={() => { setFailed(false); setAttempt(value => value + 1); }} />
      </> : <ActivityIndicator color={colors.gold500} accessibilityLabel={t('chat.refreshing')} />}
    </View>
  </SafeAreaView>;
}
