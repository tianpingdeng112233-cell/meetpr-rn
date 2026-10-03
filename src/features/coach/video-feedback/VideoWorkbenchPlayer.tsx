import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useColors } from '@/design';
import { t } from '@/i18n';
import type { VideoMarker } from '@/api/domains/video-markers';
import { FeedbackVideoPlayer, type FeedbackVideoPlayerProps } from '@/features/video-player/FeedbackVideoPlayer';
import { FeedbackVideoFailureCard, FeedbackVideoWorkbenchPlayer } from '@/features/video-player/FeedbackVideoWorkbenchPlayer';
import { timeText } from '@/features/video-player/time';

export const markerTime = timeText;
type Props = Omit<FeedbackVideoPlayerProps, 'layout' | 'url' | 'markers' | 'selectedAnnotationMarker'> & {
  url: string | null;
  failed: boolean;
  markers: VideoMarker[] | null;
  onRetry: () => Promise<void>;
  selectedMarkerID?: string | null;
};

/** Adapts coach wire markers and the initial URL state to the shared player. */
export function VideoWorkbenchPlayer({ url, failed, markers, onRetry, onAddMarker, selectedMarkerID, ...props }: Props) {
  const presentationMarkers = useMemo(() => markers?.map(marker => ({ id: marker.id, timeMs: marker.time_ms, note: marker.note, annotationURL: marker.annotation_url })) ?? null, [markers]);
  if (!url) return <PlaybackPlaceholder failed={failed} retry={onRetry} />;
  return <FeedbackVideoPlayer {...props} layout="workbench" url={url} markers={presentationMarkers}
    selectedAnnotationMarker={presentationMarkers?.find(marker => marker.id === selectedMarkerID) ?? null}
    onAddMarker={markers !== null ? onAddMarker : undefined} />;
}

function PlaybackPlaceholder({ failed, retry }: { failed: boolean; retry: () => Promise<void> }) {
  const colors = useColors();
  const [retrying, setRetrying] = useState(false);
  const pending = useRef(false);
  async function retryPlayback() {
    if (pending.current) return;
    pending.current = true;
    setRetrying(true);
    try { await retry(); } catch { /* The same failure card remains available. */ }
    finally { pending.current = false; setRetrying(false); }
  }
  return <FeedbackVideoWorkbenchPlayer video={null} rate={1} selectRate={() => {}}
    playbackControl={failed ? <FeedbackVideoFailureCard workbench retrying={retrying} retry={() => void retryPlayback()} />
      : <ActivityIndicator accessibilityLabel={t('coach.videoFeedback.loading')} color={colors.inkOnCTAFill} />} />;
}
