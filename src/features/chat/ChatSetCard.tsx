import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { chatRepository, type ChatMessage, type ChatSetRef } from '@/api/domains/chat';
import { font, radius, useColors } from '@/design';
import { getLocale, t } from '@/i18n';

export function ChatSetCard({ reference, note, message, outgoing, read, openVideo }: { reference: ChatSetRef; note: string | null; message: ChatMessage; outgoing: boolean; read: boolean; openVideo?: () => void }) {
  const colors = useColors();
  const reps = reference.repsMax != null ? `${reference.reps}-${reference.repsMax}` : reference.reps ?? '-';
  return <View testID={`chat.setCard.${message.id}`} style={{ width: '75%', alignSelf: outgoing ? 'flex-end' : 'flex-start', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.lg, overflow: 'hidden' }}>
    <View style={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name="dumbbell" size={13} color={colors.goldText} />
        <Text style={{ ...font.body(12, 'bold'), color: colors.goldText, flex: 1 }}>{t(reference.source === 'logged' ? 'chat.loggedSetCardLabel' : 'chat.plannedSetCardLabel')}</Text>
        <Text style={{ ...font.mono(11), color: colors.textTertiary }}>{new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(message.created_at))}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Text style={{ ...font.body(20, 'bold'), color: colors.textPrimary, flex: 1 }}>{reference.exerciseName}</Text><Text style={{ ...font.mono(11), color: colors.textTertiary }}>{reference.setTotal != null ? t('chat.setPosition %@ of %@', [reference.setNumber, reference.setTotal]) : t('chat.setPosition %@', [reference.setNumber])}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ ...font.body(11), letterSpacing: 1.1, color: colors.textTertiary }}>{t('chat.weightRepsMetric')}</Text><Text style={{ ...font.body(22, 'bold'), color: colors.textPrimary }}>{reference.weightKg ?? '-'}<Text style={font.body(15, 'bold')}>kg</Text>{` × ${reps}`}</Text></View>
        <View style={{ height: 52, width: 1, backgroundColor: colors.borderDefault }} />
        <View style={{ gap: 4 }}><Text style={{ ...font.body(11), letterSpacing: 1.1, color: colors.textTertiary }}>{t('chat.rpeMetric')}</Text><Text style={{ ...font.mono(22, 'bold'), color: colors.goldText }}>{reference.rpe ?? '-'}</Text></View>
      </View>
      {message.video_url ? <Pressable accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} onPress={openVideo} style={{ minHeight: 38, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong }}><MaterialCommunityIcons name="play-box" size={18} color={colors.goldText} /><Text style={{ ...font.body(14, 'bold'), color: colors.goldText }}>{t('chat.playVideo')}</Text></Pressable> : null}
      {note ? <Text style={{ ...font.body(16), color: colors.textPrimary, backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 8 }}>{note}</Text> : null}
    </View>
    {outgoing ? <Text style={{ ...font.body(12), color: colors.textTertiary, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 16, paddingVertical: 8 }}>{t(read ? 'chat.setCardRead' : 'chat.setCardDelivered')}</Text> : null}
    <View style={{ position: 'absolute', top: 0, bottom: 0, [outgoing ? 'right' : 'left']: 0, width: 3, backgroundColor: colors.gold500 }} />
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
