import { Modal } from 'react-native';
import { useFeedback } from '@/api/domains/feedback';
import { useStudentVideos } from '@/api/domains/videos';
import { useSessionStore } from '@/api/session';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import type { FeedbackVideoPlaybackItem } from '@/features/video-player/types';
import type { FeedbackPlaybackSession } from './playback-session';
import { freshPlaybackURL } from './use-feedback-playback';
import { currentFeedbackExportBadge, feedbackVideoAssociation, feedbackVideoBadge } from './video-presentation';

export function FeedbackPlaybackModal({ item, session }: { item: FeedbackVideoPlaybackItem | null; session: FeedbackPlaybackSession }) {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const videos = useStudentVideos(studentId);
  const feedback = useFeedback(studentId);
  if (!item) return null;
  const entry = feedback.data?.items.find(feedbackItem => feedbackItem.video_id === item.id);
  const association = feedbackVideoAssociation(item.id, videos.data?.videos ?? [], entry?.video);
  return <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={session.close}>
    <FeedbackVideoPlayer getExportBadge={association.kind === 'available' ? async () => {
      let video = videos.data?.videos.find(row => row.id === item.id);
      if (!video?.set_log_id) video = (await videos.refetch()).data?.videos.find(row => row.id === item.id);
      return currentFeedbackExportBadge(studentId, video, entry?.day_date, association.video);
    } : undefined} allowGalleryExport videoId={item.id} url={item.url} markers={item.markers} markersFailed={item.markersFailed}
      badge={feedbackVideoBadge(association.kind === 'available' ? association.video : null)}
      onMarkersRefresh={() => session.refreshMarkers(item.id)} refreshURL={freshPlaybackURL} onClose={session.close} />
  </Modal>;
}
