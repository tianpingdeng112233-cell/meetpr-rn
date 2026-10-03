import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { chatRepository, type ChatMessage, type ChatSetRef } from '@/api/domains/chat';
import { font, fontMetrics, radius, spacing, useColors } from '@/design';
import { sharedSetAttachment } from './student-timeline';
import { displayFirstLine } from './set-ref';
import { getLocale, t } from '@/i18n';

export function ChatSetCard({ reference, note, message, outgoing, read, openVideo }: { reference: ChatSetRef; note: string | null; message: ChatMessage; outgoing: boolean; read: boolean; openVideo?: () => void }) {
  const colors = useColors();
  const attachment = sharedSetAttachment(reference, note, message.video_url);
  return <View testID={`chat.setCard.${message.id}`} style={{ maxWidth: '88%', alignSelf: outgoing ? 'flex-end' : 'flex-start', gap: spacing.xs }}>
    <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.card, backgroundColor: outgoing ? colors.textPrimary : colors.surfaceElevated }}>
      {attachment.note ? <Text selectable style={{ ...font.body(fontMetrics.size14, outgoing ? 'medium' : 'regular'), color: outgoing ? colors.bgBase : colors.textPrimary }}>{attachment.note}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={attachment.hasVideo ? t('chat.playVideo') : attachment.subtitle}
        onPress={attachment.hasVideo ? openVideo : () => Alert.alert(attachment.title, displayFirstLine(reference))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceCard, borderRadius: radius.inset }}>
        {attachment.hasVideo ? <View style={{ width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, borderRadius: radius.micro, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="play" size={spacing.lg} color={colors.textPrimary} />
        </View> : null}
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 'auto', gap: spacing.xs }}>
          <Text style={{ ...font.body(fontMetrics.size14, 'semibold'), color: colors.textPrimary }}>{attachment.title}</Text>
          <Text style={{ ...font.body(fontMetrics.size12), color: colors.textSecondary }}>{attachment.subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={spacing.space5} color={colors.textSecondary} />
      </Pressable>
    </View>
    <Text style={{ ...font.body(fontMetrics.size12), color: colors.textTertiary }}>
      {new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(message.created_at))}
      {outgoing ? <> · <Text>{t(read ? 'chat.setCardRead' : 'chat.setCardDelivered')}</Text></> : null}
    </Text>
  </View>;
}

/** Shared-message playback renews the message URL, independently of feedback read/markers. */
export function useChatSetPlayback(conversationId: string) {
  const [selectedShare, setSelectedShare] = useState<ChatMessage | null>(null);
  const [shareVideoError, setShareVideoError] = useState(false);
  const focused = useRef(false);
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    generation.current += 1;
    return () => { focused.current = false; generation.current += 1; setSelectedShare(null); };
  }, []));
  async function refreshShareURL(message: ChatMessage) {
    const page = await chatRepository.messages(conversationId, { since_seq: message.seq - 1, limit: 1 });
    const url = page.messages.find(item => item.id === message.id)?.video_url;
    if (!url) throw new Error('Playback unavailable');
    return url;
  }
  async function openShareVideo(message: ChatMessage) {
    const requestGeneration = generation.current;
    setShareVideoError(false);
    try {
      const video_url = await refreshShareURL(message);
      if (focused.current && requestGeneration === generation.current) setSelectedShare({ ...message, video_url });
    } catch { if (focused.current && requestGeneration === generation.current) setShareVideoError(true); }
  }
  return { selectedShare, setSelectedShare, shareVideoError, refreshShareURL, openShareVideo };
}
