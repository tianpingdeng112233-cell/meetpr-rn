import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { useTheme } from '@/design/theme';
import { TrimPlayButton } from './TrimPlayButton';
import { t } from '@/i18n';
import { trainingVideoTrim } from './trim-native';
import { type TrimOutcome } from './trim-session';
import { TrimTimeline } from './TrimTimeline';
import { useTrimSource, warnTrimPreparation } from './useTrimSource';

export function VideoTrimView({ uri, onOutcome }: { uri: string; onOutcome: (outcome: TrimOutcome) => void }) {
  const colors = useColors();
  const { scheme } = useTheme();
  const { session, workingUri, thumbnails, playback } = useTrimSource(uri, onOutcome);
  const { player, selection, ready, playing, setPlaying } = playback;
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const move = (edge: 'start' | 'end', seconds: number) => {
    if (ready && !exportingRef.current) playback.move(edge, seconds);
  };
  const close = () => {
    if (!exportingRef.current) session.current?.cancelled();
  };
  const save = async () => {
    const current = session.current;
    if (!ready || !workingUri || !current?.active || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setPlaying(false);
    try {
      const result = await trainingVideoTrim().trim(workingUri, Math.round(selection.startSeconds * 1000), Math.round(selection.endSeconds * 1000));
      current.saved(result);
    } catch (error) {
      warnTrimPreparation('export', error);
      current.failed();
    }
  };
  return (
    <Modal visible presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView testID="trim-page" style={{ flex: 1, backgroundColor: colors.bgBase }}>
        <View testID="trim-header" style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, backgroundColor: colors.bgBase }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.cameraRecorderView.copy005')} disabled={exporting} onPress={close} style={[styles.toolbarButton, { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised }]}>
            <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, ...font.body(17, 'semibold') }}>{t('student.videoTrimView.copy002')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.videoTrimView.copy003')} disabled={!ready || exporting} onPress={() => void save()} style={styles.toolbarButton}>
            {exporting ? <ActivityIndicator color={colors.gold500} /> : <Text style={{ color: colors.gold500, opacity: ready ? 1 : 0.4, ...font.body(16, 'semibold') }}>{t('student.videoTrimView.copy003')}</Text>}
          </Pressable>
        </View>
        <View testID="trim-video" style={{ flex: 1, minHeight: 180, marginHorizontal: spacing.base, backgroundColor: colors.chatImageBackground }}>
          {workingUri ? <Video ref={player} source={{ uri: workingUri }} paused={!playing} resizeMode="contain" style={StyleSheet.absoluteFill}
            progressUpdateInterval={50} onLoad={playback.onLoad} onError={event => {
              warnTrimPreparation('player.onError', event.error ? {
                name: event.error.errorException ?? 'VideoError',
                message: event.error.errorString ?? event.error.localizedDescription,
              } : event);
              session.current?.failed();
            }}
            onSeek={playback.onSeek} onProgress={playback.onProgress} onEnd={playback.onEnd} /> : null}
          {!ready ? <View style={styles.loading}><ActivityIndicator color={colors.inkOnCTAFill} /><Text style={{ color: colors.inkOnCTAFill, ...font.body(14) }}>{t('student.videoTrimView.copy001')}</Text></View> : null}
          <View style={{ position: 'absolute', bottom: spacing.base, alignSelf: 'center' }}>
            <TrimPlayButton playing={playing} disabled={!ready || exporting} onPress={() => { if (ready && !exportingRef.current) playback.toggle(); }} />
          </View>
        </View>
        <TrimTimeline selection={selection} thumbnails={thumbnails} enabled={ready && !exporting} onMove={move}
          position={playback.position} onScrub={(seconds, exact) => { if (ready && !exportingRef.current) playback.scrub(seconds, exact); }} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbarButton: { minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.space2 },
});
