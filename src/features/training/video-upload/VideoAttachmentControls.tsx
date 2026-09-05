import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/design';

import { requestVideoUploadConsent } from './consent';
import { videoUploadManager } from './manager';
import { pickTrainingVideo, VideoNativeError, type VideoSource } from './native';
import { selectVideoUpload, useVideoUploadStore } from './store';

type Props = {
  editable: boolean;
  ensureSetLog: () => Promise<string>;
  stableSetId: string;
  studentId: string;
};

function promptConsent(input: {
  title: string;
  message: string;
  acceptLabel: string;
  declineLabel: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    Alert.alert(
      input.title,
      input.message,
      [
        { text: input.declineLabel, style: 'cancel', onPress: () => finish(false) },
        { text: input.acceptLabel, onPress: () => finish(true) },
      ],
      { cancelable: true, onDismiss: () => finish(false) },
    );
  });
}

function Chip({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: 'camera-outline' | 'image-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.disabled]}>
      <MaterialCommunityIcons color={colors.brandRed} name={icon} size={17} />
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function TextAction({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function VideoAttachmentControls({
  editable,
  ensureSetLog,
  stableSetId,
  studentId,
}: Props) {
  const record = useVideoUploadStore(selectVideoUpload(studentId, stableSetId));
  const [choosing, setChoosing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const identity = { studentId, stableSetId };

  const choose = async (source: VideoSource) => {
    if (!editable || choosing) return;
    setChoosing(true);
    try {
      const consented = await requestVideoUploadConsent(AsyncStorage, promptConsent);
      if (!consented) return;
      const video = await pickTrainingVideo(source);
      if (!video) return;
      void videoUploadManager.attach(identity, video, ensureSetLog);
    } catch (error) {
      Alert.alert(
        '视频处理失败',
        error instanceof VideoNativeError ? error.copy : '视频处理失败,请重试',
        [{ text: '知道了' }],
      );
    } finally {
      setChoosing(false);
    }
  };

  const remove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await videoUploadManager.remove(identity);
    } catch {
      Alert.alert('删除失败', '视频未删除,请重试', [{ text: '知道了' }]);
    } finally {
      setRemoving(false);
    }
  };

  const replace = () => {
    if (!editable || choosing) return;
    Alert.alert('更换视频', undefined, [
      { text: '拍摄', onPress: () => void choose('camera') },
      { text: '相册', onPress: () => void choose('library') },
      { text: '取消', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>视频</Text>
          <Text style={styles.degradation}>Android 兼容模式：当前不支持 passthrough/remux，统一转码 1080p MP4</Text>
        </View>
        {record.status === 'none' ? (
          <View style={styles.actions}>
            {choosing ? <ActivityIndicator color={colors.brandRed} /> : null}
            <Chip disabled={!editable || choosing} icon="camera-outline" label="拍摄" onPress={() => void choose('camera')} />
            <Chip disabled={!editable || choosing} icon="image-outline" label="相册" onPress={() => void choose('library')} />
          </View>
        ) : null}
      </View>

      {record.status === 'pending' ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.brandRed} size="small" />
          <Text style={styles.statusText}>处理中…</Text>
          <TextAction label="取消" onPress={() => void videoUploadManager.cancel(identity)} />
        </View>
      ) : null}
      {record.status === 'preparing' ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.brandRed} size="small" />
          <Text style={styles.statusText}>准备中…</Text>
          <TextAction label="取消" onPress={() => void videoUploadManager.cancel(identity)} />
        </View>
      ) : null}
      {record.status === 'uploading' ? (
        <View style={styles.uploading}>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>{Math.round(record.progress * 100)}%</Text>
            <TextAction label="取消" onPress={() => void videoUploadManager.cancel(identity)} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(record.progress * 100)}%` }]} />
          </View>
        </View>
      ) : null}
      {record.status === 'uploaded' ? (
        <View style={styles.statusRow}>
          <Pressable accessibilityLabel="更换已上传视频" disabled={!editable} onPress={replace} style={styles.uploadedLabel}>
            <MaterialCommunityIcons color={colors.green} name="check-circle" size={18} />
            <Text style={styles.statusText}>已上传</Text>
          </Pressable>
          <TextAction disabled={removing} label="删除" onPress={() => void remove()} />
        </View>
      ) : null}
      {record.status === 'failed' ? (
        <View style={styles.failedBlock}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons color={colors.brandRed} name="alert-circle-outline" size={18} />
            <Text style={styles.failedText}>上传失败</Text>
            <TextAction label="重试" onPress={() => void videoUploadManager.retry(identity, ensureSetLog)} />
            <TextAction disabled={removing} label="删除" onPress={() => void remove()} />
          </View>
          {record.errorMessage ? <Text style={styles.errorCopy}>{record.errorMessage}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  label: { color: colors.fgSecondary, ...typography.footnote },
  degradation: { color: colors.fgTertiary, marginTop: spacing.xs, maxWidth: 210, ...typography.caption },
  actions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  chip: { alignItems: 'center', backgroundColor: colors.brandRedSoft, borderColor: 'rgba(229,34,30,0.3)', borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.md },
  chipText: { color: colors.brandRed, ...typography.footnote },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  statusText: { color: colors.fgPrimary, flex: 1, ...typography.footnote },
  uploadedLabel: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm },
  actionText: { color: colors.brandRed, ...typography.footnote },
  uploading: { gap: spacing.sm },
  progressTrack: { backgroundColor: colors.surface3, borderRadius: radius.pill, height: 5, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.brandRed, borderRadius: radius.pill, height: 5 },
  failedBlock: { gap: spacing.xs },
  failedText: { color: colors.brandRed, flex: 1, ...typography.footnote },
  errorCopy: { color: colors.brandRed, ...typography.caption },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
});
