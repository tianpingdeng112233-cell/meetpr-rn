import type { ChatMessage } from '@/api/domains/chat';
import { font, Screen, spacing, radius, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { ChatVideoCover } from './ChatVideoCover';
import type { ChatVideoDraft, ChatVideoItem } from './chat-video-outbox';

export function isStandaloneChatVideo(message: ChatMessage) {
  return message.kind === 'text' && message.video_id != null && message.set_ref == null && message.exercise_ref == null;
}
export function ChatStandaloneVideo({ message, outgoing, read, onPress }: { message: ChatMessage; outgoing: boolean; read: boolean; onPress?: () => void }) {
  const colors = useColors();
  return <View testID={`chat.video.${message.id}`} style={{ alignSelf: outgoing ? 'flex-end' : 'flex-start', gap: spacing.xs }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} onPress={onPress}
      style={{ width: 215, height: 245, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.surfaceRaised }}>
      <ChatVideoCover posterURL={message.poster_url} durationSeconds={message.duration_seconds} />
      {!message.video_url ? <Text style={{ position: 'absolute', left: spacing.sm, bottom: spacing.sm, ...font.body(12), color: colors.textSecondary }}>{t('chat.standaloneVideoUnavailable')}</Text> : null}
    </Pressable>
    {outgoing ? <Text style={{ textAlign: 'right', ...font.body(12), color: colors.textTertiary }}>{t(read ? 'chat.read' : 'chat.delivered')}</Text> : null}
  </View>;
}
export function ChatPendingVideo({ item, retry }: { item: ChatVideoItem; retry: () => void }) {
  const colors = useColors();
  const percent = Math.floor(item.progress * 100);
  return <View testID={`chat.video.pending.${item.draft.clientId}`} style={{ alignSelf: 'flex-end', gap: spacing.xs }}>
    <View style={{ width: 215, height: 245, overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.surfaceRaised }}>
      <Video disableFocus source={{ uri: item.draft.uri }} paused muted resizeMode="cover" style={StyleSheet.absoluteFill} />
      <ChatVideoCover durationSeconds={item.draft.durationSeconds} />
      {item.state === 'sending' ? <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <Text accessibilityLiveRegion="polite" style={{ ...font.body(13), color: colors.ctaTopHighlight }}>{t(percent < 100 ? 'chat.standaloneVideoUploading' : 'chat.videoConfirming', [percent])}</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ width: 130, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2 }}>
          <View style={{ width: `${percent}%`, height: 4, backgroundColor: colors.gold500, borderRadius: 2 }} />
        </View>
      </View> : null}
    </View>
    {item.state === 'failed' ? <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: spacing.minimumHitTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs }}>
      <MaterialCommunityIcons name="reload" size={14} color={colors.danger} /><Text style={{ ...font.body(12), color: colors.danger }}>{t('chat.videoRetry')}</Text>
    </Pressable> : null}
  </View>;
}

export function ChatVideoPreview({ video, coachName, cancel, reselect, send }: { video: ChatVideoDraft; coachName: string; cancel: () => void; reselect: () => void; send: () => void }) {
  const colors = useColors();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <Modal visible animationType="slide" onRequestClose={cancel}><Screen>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm }}>
      <Pressable accessibilityRole="button" onPress={reselect} style={styles.navButton}><Text style={{ ...font.body(15), color: colors.goldText }}>{t('chat.videoReselect')}</Text></Pressable>
      <Text style={{ ...font.body(17, 'semibold'), color: colors.textPrimary }}>{t('chat.videoPreview')}</Text>
      <Pressable accessibilityRole="button" onPress={cancel} style={styles.navButton}><Text style={{ ...font.body(15), color: colors.goldText }}>{t('chat.cancel')}</Text></Pressable>
    </View>
    <View style={{ flex: 1, backgroundColor: colors.chatImageBackground }}>
      <Video disableFocus source={{ uri: video.uri }} controls resizeMode="contain" style={StyleSheet.absoluteFill}
        onLoad={() => { setReady(true); setFailed(false); }} onError={() => { setReady(false); setFailed(true); }} />
      {failed ? <Text accessibilityRole="alert" style={{ margin: spacing.md, ...font.body(14), color: colors.danger }}>{t('chat.standaloneVideoUnavailable')}</Text> : null}
    </View>
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between', padding: spacing.md }}>
      <Text numberOfLines={2} style={{ flex: 1, ...font.body(14), color: colors.textSecondary }}>{t('chat.videoSendTo', [coachName])}</Text>
      <Pressable accessibilityRole="button" disabled={!ready || failed} onPress={send} style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.gold500, opacity: ready && !failed ? 1 : 0.45 }}>
        <Text style={{ ...font.body(15, 'semibold'), color: colors.inkOnGold }}>{t('chat.send')}</Text>
      </Pressable>
    </View>
  </Screen></Modal>;
}
const styles = StyleSheet.create({ navButton: { minHeight: 44, minWidth: 52, alignItems: 'center', justifyContent: 'center' } });
