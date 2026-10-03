import { Modal } from 'react-native';
import { useFeedback } from '@/api/domains/feedback';
import { useStudentVideos } from '@/api/domains/videos';
import { useSessionStore } from '@/api/session';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import type { FeedbackVideoPlaybackItem } from '@/features/video-player/types';
import type { FeedbackPlaybackSession } from './playback-session';
import { freshPlaybackURL } from './use-feedback-playback';
import { feedbackVideoAssociation, feedbackVideoBadge } from './video-presentation';

export function FeedbackPlaybackModal({ item, session }: { item: FeedbackVideoPlaybackItem | null; session: FeedbackPlaybackSession }) {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const videos = useStudentVideos(studentId);
  const feedback = useFeedback(studentId);
  if (!item) return null;
  const embedded = feedback.data?.items.find(entry => entry.video_id === item.id)?.video;
  const association = feedbackVideoAssociation(item.id, videos.data?.videos ?? [], embedded);
  return <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={session.close}>
    <FeedbackVideoPlayer videoId={item.id} url={item.url} markers={item.markers} markersFailed={item.markersFailed}
      badge={feedbackVideoBadge(association.kind === 'available' ? association.video : null)}
      onMarkersRefresh={() => session.refreshMarkers(item.id)} refreshURL={freshPlaybackURL} onClose={session.close} />
  </Modal>;
}
