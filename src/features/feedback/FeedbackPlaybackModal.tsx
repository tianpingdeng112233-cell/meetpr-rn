import { Modal } from 'react-native';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import type { FeedbackVideoPlaybackItem } from '@/features/video-player/types';
import type { FeedbackPlaybackSession } from './playback-session';
import { freshPlaybackURL } from './use-feedback-playback';

export function FeedbackPlaybackModal({ item, session }: { item: FeedbackVideoPlaybackItem | null; session: FeedbackPlaybackSession }) {
  if (!item) return null;
  return <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={session.close}>
    <FeedbackVideoPlayer videoId={item.id} url={item.url} markers={item.markers} markersFailed={item.markersFailed}
      onMarkersRefresh={() => session.refreshMarkers(item.id)} refreshURL={freshPlaybackURL} onClose={session.close} />
  </Modal>;
}
