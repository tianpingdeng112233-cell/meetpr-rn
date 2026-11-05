import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { hasVideoDeliveryFailure } from './delivery-failures';
import { t } from '@/i18n';
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
  const failed = hasVideoDeliveryFailure(record);
  if (!failed && record.status !== 'uploaded' && record.status !== 'none') return null;
  return <MaterialCommunityIcons accessibilityLabel={failed ? t('student.videoDelivery.notUploaded') : undefined}
    color={failed ? colors.danger : record.status === 'uploaded' ? colors.success : colors.textGhost}
    name={failed ? 'alert-circle-outline' : 'video-outline'} size={size} />;
}
export const VideoStatusIcon = SetVideoUploadIndicator;
