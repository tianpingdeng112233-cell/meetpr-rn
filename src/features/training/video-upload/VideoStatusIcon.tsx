import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/design';

import { selectVideoUpload, useVideoUploadStore } from './store';

export function VideoStatusIcon({
  size = 15,
  stableSetId,
  studentId,
}: {
  size?: number;
  stableSetId: string;
  studentId: string;
}) {
  const record = useVideoUploadStore(selectVideoUpload(studentId, stableSetId));
  if (record.status === 'uploaded') {
    return <MaterialCommunityIcons color={colors.green} name="video-outline" size={size} />;
  }
  if (record.status === 'failed') {
    return <MaterialCommunityIcons color={colors.brandRed} name="video-outline" size={size} />;
  }
  if (
    record.status === 'pending' ||
    record.status === 'preparing' ||
    record.status === 'uploading'
  ) {
    const progress = record.status === 'uploading' ? record.progress : 0.08;
    return (
      <View style={{ height: size, width: size }}>
        <MaterialCommunityIcons color={colors.fgTertiary} name="video-outline" size={size} />
        <View style={[styles.sweep, { width: size * progress }]}>
          <MaterialCommunityIcons color={colors.brandRed} name="video-outline" size={size} />
        </View>
      </View>
    );
  }
  return <MaterialCommunityIcons color={colors.fgTertiary} name="video-outline" size={size} />;
}

const styles = StyleSheet.create({
  sweep: { left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
});
