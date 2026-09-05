import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, ScrollView, Text, TextInput, View } from 'react-native';
import { font, radius, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { useSessionStore } from '@/api/session';
import { chatRepository, type ChatMessage, type Conversation } from '@/api/domains/chat';
import { createUUID } from '@/analytics/uuid';
import { receivingKeys } from '@/features/coach/receiving/use-coach-receiving';
import { Pill } from '@/features/coach/receiving/ReceivingUI';
import { FullScreenDestination } from '@/features/coach/receiving/FullScreenDestination';
import { applyReadState, CHAT_POLL_MS, conversationSubtitle, createConversationSync, mergeMessages } from './conversation-model';
export function ConversationScreen({ conversationId, studentName, status, initialDraft }: { conversationId: string; studentName?: string; status?: string; initialDraft?: string }) {
  const colors = useColors();
  const userID = useSessionStore(state => state.user?.id ?? '');
  const client = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const fetchedCursor = useRef<number | undefined>(undefined);
  const [name, setName] = useState(studentName);
  const [draft, setDraft] = useState(initialDraft ?? '');
  const [loading, setLoading] = useState(true);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [error, setError] = useState<'load' | 'send' | null>(null);
  const [sending, setSending] = useState(false);
  const retryIntent = useRef<{ text: string; clientID: string } | null>(null);
  const refresh = useRef<() => void>(() => {});
  const active = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const followLatest = useRef(true);
  useEffect(() => {
    let live = true;
    if (!studentName) void chatRepository.list().then(result => { if (live) setName(result.conversations.find(item => item.id === conversationId)?.other_party.display_name); }).catch(() => {});
    return () => { live = false; };
  }, [conversationId, studentName]);
  useFocusEffect(useCallback(() => {
    active.current = true;
    let live = true;
    const sync = createConversationSync({
      now: Date.now,
      fetchPage: async () => {
        const latest = fetchedCursor.current;
        let cursor = latest;
        let incoming: ChatMessage[] = [];
        for (;;) {
          const page = await chatRepository.messages(conversationId, cursor ? { since_seq: cursor } : {});
          incoming = mergeMessages(incoming, page.messages);
          if (!live) return [];
          if (!latest) setHasOlder(page.meta.has_more);
          const next = incoming.at(-1)?.seq;
          if (!latest || !page.meta.has_more || !next || next === cursor) break;
          cursor = next;
        }
        const merged = mergeMessages(messagesRef.current, incoming);
        fetchedCursor.current = incoming.at(-1)?.seq ?? latest;
        messagesRef.current = merged;
        setMessages(merged);
        return merged;
      },
      markRead: async id => {
        const read = await chatRepository.read(conversationId, id);
        const queryKey = receivingKeys.chats(userID);
        await client.cancelQueries({ queryKey });
        client.setQueryData<{ conversations: Conversation[] }>(queryKey, previous => previous && { conversations: applyReadState(previous.conversations, conversationId, read) });
      },
    });
    const run = (force = false) => {
      if (AppState.currentState !== 'active' && !force) return;
      void sync.refresh(force).then(() => { if (active.current) setError(previous => previous === 'load' ? null : previous); }).catch(() => { if (active.current) setError('load'); }).finally(() => { if (active.current) setLoading(false); });
    };
    refresh.current = () => run(true);
    run(true);
    const timer = setInterval(() => run(), CHAT_POLL_MS);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') run(); });
    return () => { live = false; active.current = false; sync.stop(); clearInterval(timer); subscription.remove(); };
  }, [client, conversationId, userID]));
  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const intent = retryIntent.current?.text === text ? retryIntent.current : { text, clientID: createUUID() };
    retryIntent.current = intent;
    setSending(true);
    try {
      const { message } = await chatRepository.send(conversationId, text, intent.clientID);
      if (!active.current) return;
      messagesRef.current = mergeMessages(messagesRef.current, [message]);
      followLatest.current = true;
      setMessages(messagesRef.current); setDraft(''); setError(null); retryIntent.current = null;
      void client.invalidateQueries({ queryKey: receivingKeys.chats(userID) });
      scroll.current?.scrollToEnd({ animated: true });
    } catch { if (active.current) setError('send'); }
    finally { if (active.current) setSending(false); }
  }
  async function loadOlder() {
    if (olderLoading || !messages[0]) return;
    followLatest.current = false;
    setOlderLoading(true);
    try {
      const page = await chatRepository.messages(conversationId, { before_seq: messages[0].seq });
      if (!active.current) return;
      messagesRef.current = mergeMessages(messagesRef.current, page.messages);
      setMessages(messagesRef.current); setHasOlder(page.meta.has_more);
    } catch { if (active.current) setError('load'); }
    finally { if (active.current) setOlderLoading(false); }
  }
  const subtitleKey = conversationSubtitle(status);
  const subtitle = subtitleKey ? t(subtitleKey) : null;
  return <FullScreenDestination><Screen><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderColor: colors.borderDefault }}><Pill label={t('chat.back')} onPress={() => router.back()} /><View style={{ flex: 1 }}><Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{name || t('coach.chat.messages')}</Text>{subtitle !== null ? <Text testID="coach.chat.subtitle" style={{ ...font.body(12), color: status === 'abnormal' ? colors.danger : colors.success }}>{subtitle}</Text> : null}</View></View>
    {loading ? <ActivityIndicator accessibilityLabel={t('chat.loadingMessages')} /> : null}
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" scrollEventThrottle={100} onScroll={({ nativeEvent: event }) => { followLatest.current = event.contentSize.height - event.layoutMeasurement.height - event.contentOffset.y < 80; }} onContentSizeChange={() => { if (followLatest.current) scroll.current?.scrollToEnd({ animated: false }); }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {hasOlder ? <Pill disabled={olderLoading} label={t('chat.loadOlder')} onPress={() => void loadOlder()} /> : null}
      {!loading && !messages.length && !error ? <View style={{ padding: 32, gap: 8 }}><Text style={{ color: colors.textPrimary, textAlign: 'center' }}>{t('chat.noMessages')}</Text><Text style={{ color: colors.textDisabled, textAlign: 'center' }}>{t('chat.noMessagesDescription')}</Text></View> : null}
      {messages.map(message => {
        const outgoing = message.sender_id === userID;
        return <View key={message.id} style={{ maxWidth: '85%', alignSelf: outgoing ? 'flex-end' : 'flex-start', padding: 12, borderRadius: radius.card, backgroundColor: outgoing ? colors.textPrimary : colors.borderHairline }}>
          {message.kind === 'image' && message.image_url ? <Image source={{ uri: message.image_url }} accessibilityLabel={t('chat.image')} style={{ width: 200, height: 200, borderRadius: radius.card }} /> : null}
          <Text selectable style={{ ...font.body(15), color: outgoing ? colors.bgBase : colors.textPrimary }}>{message.body ?? t(message.kind === 'image' ? 'chat.imageUnavailable' : 'chat.trainingShare')}</Text>
        </View>;
      })}
    </ScrollView>
    {error ? <View style={{ paddingHorizontal: 16, gap: 8 }}><Text style={{ color: colors.danger }}>{t(error === 'send' ? 'chat.sendFailed' : 'chat.loadMessagesFailed')}</Text><Pill label={t('chat.retry')} disabled={sending} onPress={() => error === 'send' ? void send() : refresh.current()} /></View> : null}
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12 }}><TextInput accessibilityLabel={t('chat.composerPlaceholder')} placeholder={t('chat.composerPlaceholder')} placeholderTextColor={colors.textDisabled} multiline maxLength={4000} editable={!sending} value={draft} onChangeText={setDraft} style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceCard, color: colors.textPrimary, ...font.body(15) }} /><Pill label={t(sending ? 'chat.sending' : 'chat.send')} disabled={sending || !draft.trim()} onPress={() => void send()} /></View>
  </KeyboardAvoidingView></Screen></FullScreenDestination>;
}
