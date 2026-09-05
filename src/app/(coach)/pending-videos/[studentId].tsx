import { useLocalSearchParams } from 'expo-router';
import { StudentPendingVideosScreen } from '@/features/coach/receiving/StudentPendingVideosScreen';
export default function PendingVideosRoute() {
  const { studentId, studentName } = useLocalSearchParams<{ studentId: string; studentName?: string }>();
  return <StudentPendingVideosScreen studentId={studentId} studentName={studentName} />;
}
