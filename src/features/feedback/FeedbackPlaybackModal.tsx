import { Modal } from 'react-native';
import { useStudentVideos } from '@/api/domains/videos';
import { useSessionStore } from '@/api/session';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import type { FeedbackVideoPlaybackItem } from '@/features/video-player/types';
import type { FeedbackPlaybackSession } from './playback-session';
import { freshPlaybackURL } from './use-feedback-playback';
import { feedbackVideoBadge } from './video-presentation';

export function FeedbackPlaybackModal({ item, session }: { item: FeedbackVideoPlaybackItem | null; session: FeedbackPlaybackSession }) {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const videos = useStudentVideos(studentId);
  if (!item) return null;
  return <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={session.close}>
    <FeedbackVideoPlayer videoId={item.id} url={item.url} markers={item.markers} markersFailed={item.markersFailed}
      badge={feedbackVideoBadge(videos.data?.videos.find(video => video.id === item.id))}
      onMarkersRefresh={() => session.refreshMarkers(item.id)} refreshURL={freshPlaybackURL} onClose={session.close} />
  </Modal>;
}
