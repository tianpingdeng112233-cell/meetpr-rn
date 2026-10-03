import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors } from '@/design';
import { selectVideoUpload, useVideoUploadStore } from './store';

export function SetVideoUploadIndicator({
  size = 15,
  stableSetId,
  studentId,
}: {
  size?: number;
  stableSetId: string;
  studentId: string;
}) {
  const colors = useColors();
  const record = useVideoUploadStore(selectVideoUpload(studentId, stableSetId));
  const color =
    record.status === 'failed'
      ? colors.danger
      : record.status === 'uploaded'
        ? colors.success
        : record.status === 'none'
          ? colors.textGhost
          : colors.gold500;
  return (
    <MaterialCommunityIcons color={color} name="video-outline" size={size} />
  );
}
export const VideoStatusIcon = SetVideoUploadIndicator;
