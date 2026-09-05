import { useLocalSearchParams } from 'expo-router';
import { VideoFeedbackScreen } from '@/features/coach/video-feedback/VideoFeedbackScreen';
export default function VideoFeedbackRoute() {
  const { videoId, studentId } = useLocalSearchParams<{ videoId: string; studentId?: string }>();
  return <VideoFeedbackScreen key={videoId} videoId={videoId} studentId={studentId} />;
}
