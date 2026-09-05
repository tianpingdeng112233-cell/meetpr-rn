import { useEffect, useState } from 'react';
import { File } from 'expo-file-system';
import { StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { uploadsRepository } from '@/api/domains/uploads';
import { selectPlaybackSource } from './local-retention';
export function VideoPlayback({
  localUri,
  attachmentId,
  onClose,
}: {
  localUri: string | null;
  attachmentId: string | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void selectPlaybackSource(
      localUri,
      (value) => new File(value).exists,
      async () => {
        if (!attachmentId) throw new Error('No remote video');
        return (await uploadsRepository.url(attachmentId)).url;
      },
    )
      .then((value) => {
        if (live) setUri(value);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [localUri, attachmentId, attempt]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }}>
        <View style={{ padding: spacing.base }}>
          <AppButton
            variant="secondary"
            label={t('student.cameraRecorderView.copy005')}
            onPress={onClose}
          />
        </View>
        {failed ? (
          <View style={{ padding: spacing.base, gap: spacing.md }}>
            <Text style={{ color: colors.textSecondary }}>
              {t('student.videoAttachmentSection.copy004')}
            </Text>
            <AppButton
              label={t('student.videoAttachmentSection.copy002')}
              onPress={() => {
                setFailed(false);
                setUri(null);
                setAttempt((value) => value + 1);
              }}
            />
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
            {uri ? (
              <Video
                key={attempt}
                source={{ uri }}
                controls
                resizeMode="contain"
                playInBackground={false}
                style={StyleSheet.absoluteFill}
                onError={() => setFailed(true)}
              />
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
