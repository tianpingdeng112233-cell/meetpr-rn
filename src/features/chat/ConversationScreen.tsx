import { startConversationRealtime, useChatRealtime } from './realtime';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { PlaybackLinkError } from '@/features/feedback/FeedbackComponents';
import { ChatSetCard, useChatSetPlayback } from './ChatSetCard';
import { ChatSetCardPresentation } from './set-ref';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, AppState, Image, Modal, KeyboardAvoidingView, ScrollView, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { font, radius, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { useSessionStore } from '@/api/session';
import { chatRepository, type ChatMessage, type Conversation } from '@/api/domains/chat';
import { createUUID } from '@/analytics/uuid';
import { CoachNavHeader } from '@/features/coach/CoachNavHeader';
import { receivingKeys } from '@/features/coach/receiving/use-coach-receiving';
import { FullScreenDestination } from '@/features/coach/receiving/FullScreenDestination';
import { applyReadState, feedbackVideoBadge, CONVERSATION_POLL_MS, conversationSubtitle, createConversationSync, mergeMessages } from './conversation-model';
// Bubble colors follow CoachConversationDestination (outgoing textPrimary, incoming borderHairline), not ConversationView's defaults.
type PendingMessage = { text: string; clientID: string; failed: boolean };

export function ConversationScreen({ conversationId, studentName, status, initialDraft }: { conversationId: string; studentName?: string; status?: string; initialDraft?: string }) {
  const { subscribe } = useChatRealtime();
  const colors = useColors();
  const [selectedImage, setSelectedImage] = useState<ChatMessage | null>(null);
  const { selectedShare, setSelectedShare, shareVideoError, refreshShareURL, openShareVideo } = useChatSetPlayback(conversationId);
  const userID = useSessionStore(state => state.user?.id ?? '');
  const client = useQueryClient();
  const [otherReadSeq, setOtherReadSeq] = useState(0);
  const otherReadRef = useRef(0);
  const updateOtherRead = useCallback((seq: number) => {
    otherReadRef.current = Math.max(otherReadRef.current, seq);
    setOtherReadSeq(otherReadRef.current);
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const fetchedCursor = useRef<number | undefined>(undefined);
  const [name, setName] = useState(studentName);
  const [draft, setDraft] = useState((initialDraft ?? '').slice(0, 4000));
  const [loading, setLoading] = useState(true);
  const [hasOlder, setHasOlder] = useState(false);
  const olderLoading = useRef(false);
  const historyAnchor = useRef<{ id: string; offset: number } | null>(null);
  const frames = useRef(new Map<string, { y: number; height: number }>());
  const viewport = useRef({ y: 0, height: 0 });
  const contentHeight = useRef(0);
  const focusGeneration = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [sending, setSending] = useState(false);
  const sendingLock = useRef(false);
  const active = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const followLatest = useRef(true);
  const initialPosition = useRef(false);
  useEffect(() => {
    let live = true;
    if (!studentName) void chatRepository.list().then(result => { if (live) setName(result.conversations.find(item => item.id === conversationId)?.other_party.display_name); }).catch(() => {});
    return () => { live = false; };
  }, [conversationId, studentName]);
  useFocusEffect(useCallback(() => {
    active.current = true;
    focusGeneration.current += 1;
    let live = true;
    const sync = createConversationSync({
      now: Date.now,
      pollInterval: CONVERSATION_POLL_MS,
      realtime: { conversationId, userId: userID, messages: () => messagesRef.current, otherReadSeq: () => otherReadRef.current, updateOtherRead },
      fetchPage: async () => {
        const latest = fetchedCursor.current;
        let cursor = latest;
        let incoming: ChatMessage[] = [];
        for (;;) {
          const page = await chatRepository.messages(conversationId, cursor ? { since_seq: cursor } : {});
          incoming = mergeMessages(incoming, page.messages);
          if (!live) return [];
          updateOtherRead(page.meta.other_last_read?.seq ?? 0);
          if (!latest) setHasOlder(page.meta.has_more);
          const next = incoming.at(-1)?.seq;
          if (!latest || !page.meta.has_more || !next || next === cursor) break;
          cursor = next;
        }
        const merged = mergeMessages(messagesRef.current, incoming);
        fetchedCursor.current = incoming.at(-1)?.seq ?? latest;
        messagesRef.current = merged;
        setMessages(merged);
        setPending(previous => previous.filter(item => !merged.some(message => message.client_id === item.clientID)));
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
      void sync.refresh(force).then(() => { if (live) setLoadError(false); }).catch(() => { if (live) setLoadError(true); }).finally(() => { if (live) setLoading(false); });
    };
    run(true);
    const stopRealtime = startConversationRealtime({ subscribe, refresh: run, receive: async event => {
      const result = await sync.receive(event);
      if (live && result) { setLoadError(false); setLoading(false); }
    } });
    return () => { live = false; active.current = false; focusGeneration.current += 1; historyAnchor.current = null; olderLoading.current = false; sync.stop(); stopRealtime(); };
  }, [client, conversationId, userID, subscribe, updateOtherRead]));
  async function send(retryIntent?: PendingMessage) {
    const text = retryIntent?.text ?? draft.trim();
    if (!text || sendingLock.current) return;
    const intent = retryIntent ?? { text, clientID: createUUID(), failed: false };
    sendingLock.current = true;
    followLatest.current = true;
    setPending(previous => [...previous.filter(item => item.clientID !== intent.clientID), { ...intent, failed: false }]);
    if (!retryIntent) setDraft('');
    setSending(true);
    try {
      const { message } = await chatRepository.send(conversationId, text, intent.clientID);
      if (!active.current) return;
      messagesRef.current = mergeMessages(messagesRef.current, [message]);
      setMessages(messagesRef.current);
      setPending(previous => previous.filter(item => item.clientID !== intent.clientID));
      void client.invalidateQueries({ queryKey: receivingKeys.chats(userID) });
    } catch { if (active.current) setPending(previous => previous.map(item => item.clientID === intent.clientID ? { ...item, failed: true } : item)); }
    finally { sendingLock.current = false; if (active.current) setSending(false); }
  }
  async function loadOlder() {
    const first = messagesRef.current[0];
    if (!hasOlder || olderLoading.current || historyAnchor.current || !first) return;
    const generation = focusGeneration.current;
    const anchor = messagesRef.current.find(message => {
      const frame = frames.current.get(message.id);
      return frame && frame.y + frame.height > viewport.current.y;
    }) ?? first;
    historyAnchor.current = { id: anchor.id, offset: viewport.current.y - (frames.current.get(anchor.id)?.y ?? 0) };
    followLatest.current = false;
    olderLoading.current = true;
    try {
      const page = await chatRepository.messages(conversationId, { before_seq: first.seq });
      if (!active.current || generation !== focusGeneration.current) return;
      const merged = mergeMessages(messagesRef.current, page.messages);
      if (merged.length === messagesRef.current.length) historyAnchor.current = null;
      else if (historyAnchor.current) frames.current.delete(historyAnchor.current.id);
      messagesRef.current = merged;
      updateOtherRead(page.meta.other_last_read?.seq ?? 0);
      setMessages(merged); setHasOlder(page.meta.has_more);
    } catch { if (active.current && generation === focusGeneration.current) { historyAnchor.current = null; setLoadError(true); } }
    finally { if (generation === focusGeneration.current) olderLoading.current = false; }
  }
  function positionTimeline() {
    if (!active.current || olderLoading.current || contentHeight.current <= 0 || viewport.current.height <= 0) return;
    if (historyAnchor.current) {
      const frame = frames.current.get(historyAnchor.current.id);
      if (!frame) return;
      const y = Math.max(0, frame.y + historyAnchor.current.offset);
      scroll.current?.scrollTo({ y, animated: false });
      viewport.current.y = y;
      historyAnchor.current = null;
    } else if (followLatest.current) {
      initialPosition.current = true;
      scroll.current?.scrollToEnd({ animated: false });
      viewport.current.y = Math.max(0, contentHeight.current - viewport.current.height);
    }
    if (hasOlder && viewport.current.y < 50 && !loadError) void loadOlder();
  }
  useEffect(() => {
    const frame = requestAnimationFrame(positionTimeline);
    return () => cancelAnimationFrame(frame);
  });
  const subtitleKey = conversationSubtitle(status);
  const subtitle = subtitleKey ? t(subtitleKey) : null;
  return <FullScreenDestination><Screen><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <View style={{ borderBottomWidth: 1, borderColor: colors.borderDefault }}>
      <CoachNavHeader title={name || t('coach.chat.messages')} subtitle={subtitle ?? undefined} subtitleTone={status === 'abnormal' ? 'danger' : 'success'} subtitleTestID="coach.chat.subtitle" onBack={() => router.back()} />
    </View>
    {pending.some(item => item.failed) ? <Text style={{ ...font.body(13), color: colors.goldCTA, backgroundColor: colors.goldSoft, textAlign: 'center', paddingVertical: 8 }}>{t('chat.sendFailed')}</Text> : null}
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEventThrottle={16}
      onScrollBeginDrag={() => { initialPosition.current = true; }}
      onLayout={({ nativeEvent: { layout } }) => { viewport.current.height = layout.height; positionTimeline(); }}
      onScroll={({ nativeEvent: event }) => {
        viewport.current = { y: event.contentOffset.y, height: event.layoutMeasurement.height };
        if (initialPosition.current && !historyAnchor.current) followLatest.current = event.contentSize.height - event.layoutMeasurement.height - event.contentOffset.y < 80;
        if (initialPosition.current && event.contentOffset.y < 50) void loadOlder();
      }}
      onContentSizeChange={(_, height) => { contentHeight.current = height; requestAnimationFrame(positionTimeline); }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 16, gap: 8 }}>
      {hasOlder ? <ActivityIndicator accessibilityLabel={t('chat.loadOlder')} size="small" color={colors.textTertiary} style={{ paddingVertical: 8 }} /> : null}
      {!messages.length && !pending.length ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><ActivityIndicator color={colors.textTertiary} /><Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('chat.loadingMessages')}</Text></> : <>
          <MaterialCommunityIcons name={loadError ? 'alert-outline' : 'chat-outline'} size={44} color={colors.textTertiary} />
          <Text style={{ ...font.body(20, 'bold'), color: colors.textPrimary, textAlign: 'center' }}>{t(loadError ? 'chat.loadMessagesFailed' : 'chat.noMessages')}</Text>
          {!loadError ? <Text style={{ ...font.body(15), color: colors.textSecondary, textAlign: 'center' }}>{t('chat.noMessagesDescription')}</Text> : null}
        </>}
      </View> : null}
      {messages.map(message => <View key={message.id} testID={`chat.message.${message.id}`} onLayout={({ nativeEvent: { layout } }) => { frames.current.set(message.id, { y: layout.y, height: layout.height }); }}><ChatMessageRow message={message} outgoing={message.sender_id === userID} read={otherReadSeq >= message.seq} openImage={() => setSelectedImage(message)} openVideo={() => openShareVideo(message)} /></View>)}
      {shareVideoError ? <PlaybackLinkError /> : null}
      {pending.map(item => <View key={item.clientID} style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingLeft: 32 }}>
        <View style={{ flexShrink: 1, alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ ...font.body(14, 'medium'), color: colors.inkOnCTAFill, backgroundColor: colors.textPrimary, opacity: 0.72, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.xl, borderBottomRightRadius: 5, textAlign: 'right' }}>{item.text}</Text>
          {item.failed ? <Pressable accessibilityRole="button" accessibilityLabel={t('chat.retry')} accessibilityHint={t('chat.sendFailed')} disabled={sending} onPress={() => send(item)}><Text style={{ ...font.body(12, 'bold'), color: colors.goldCTA }}>{t('chat.retry')}</Text></Pressable> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="clock-outline" size={12} color={colors.textTertiary} /><Text style={{ ...font.body(12), color: colors.textTertiary }}>{t('chat.sending')}</Text></View>}
        </View>
      </View>)}
    </ScrollView>

    <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderColor: colors.borderDefault }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderDefault, overflow: 'hidden' }}>
        <TextInput accessibilityLabel={t('chat.composerPlaceholder')} placeholder={t('chat.composerPlaceholder')} placeholderTextColor={colors.textDisabled} multiline maxLength={4000} value={draft} onChangeText={text => setDraft(text.slice(0, 4000))} style={{ flex: 1, paddingLeft: 10, paddingRight: 0, paddingVertical: 10, minHeight: 40, maxHeight: 120, lineHeight: 20, color: colors.textPrimary, ...font.body(14) }} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('chat.send')} disabled={sending || !draft.trim()} onPress={() => send()} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.borderStrong, opacity: sending || !draft.trim() ? 0.65 : 1, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="arrow-up" size={18} color={colors.textPrimary} />
          {sending ? <ActivityIndicator size="small" color={colors.textPrimary} style={{ position: 'absolute', transform: [{ scale: 0.6 }] }} /> : null}
        </Pressable>
      </View>
    </View>
    {selectedShare?.video_url ? <Modal visible animationType="slide" onRequestClose={() => setSelectedShare(null)}><FeedbackVideoPlayer videoId={selectedShare.id} url={selectedShare.video_url} badge={feedbackVideoBadge(selectedShare.set_ref, false)} refreshURL={() => refreshShareURL(selectedShare)} onClose={() => setSelectedShare(null)} /></Modal> : null}
    {selectedImage ? <Modal visible animationType="fade" onRequestClose={() => setSelectedImage(null)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.chatImageBackground }}>
      <ChatImage key={selectedImage.image_url} url={selectedImage.image_url} fullScreen />
      <Pressable accessibilityRole="button" accessibilityLabel={t('chat.close')} onPress={() => setSelectedImage(null)} style={{ position: 'absolute', top: 16, right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="close-circle" size={30} color={colors.inkOnCTAFill} /></Pressable>
    </SafeAreaView></Modal> : null}
  </KeyboardAvoidingView></Screen></FullScreenDestination>;
}

function ChatMessageRow({ message, outgoing, read, openImage, openVideo }: { message: ChatMessage; outgoing: boolean; read: boolean; openImage: () => void; openVideo: () => Promise<void> }) {
  const colors = useColors();
  const presentation = message.kind === 'text' ? ChatSetCardPresentation(message) : null;
  if (presentation) return <ChatSetCard reference={presentation.setRef} note={presentation.note} message={message} outgoing={false} read={false} openVideo={openVideo} />;
  if (message.kind === 'image') return <Pressable accessibilityRole="button" accessibilityLabel={t('chat.image')} onPress={openImage} style={{ width: '75%', aspectRatio: 4 / 3, alignSelf: outgoing ? 'flex-end' : 'flex-start', borderRadius: radius.xl, borderBottomRightRadius: outgoing ? 5 : radius.xl, borderBottomLeftRadius: outgoing ? radius.xl : 5, overflow: 'hidden' }}><ChatImage key={message.image_url} url={message.image_url} /></Pressable>;
  return <View style={{ flexDirection: 'row', justifyContent: outgoing ? 'flex-end' : 'flex-start', paddingLeft: outgoing ? 32 : 0, paddingRight: outgoing ? 0 : 32 }}>
    <View style={{ flexShrink: 1, alignItems: outgoing ? 'flex-end' : 'flex-start', gap: 4 }}>
      <Text selectable style={{ ...font.body(14, outgoing ? 'medium' : 'regular'), color: outgoing ? colors.inkOnCTAFill : colors.textPrimary, backgroundColor: outgoing ? colors.textPrimary : colors.borderHairline, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.xl, borderBottomRightRadius: outgoing ? 5 : radius.xl, borderBottomLeftRadius: outgoing ? radius.xl : 5, textAlign: outgoing ? 'right' : 'left' }}>{message.body}</Text>
      {outgoing && message.kind === 'text' ? <Text style={{ ...font.body(12), color: colors.textTertiary }}>{t(read ? 'chat.read' : 'chat.delivered')}</Text> : null}
    </View>
  </View>;
}

function ChatImage({ url, fullScreen = false }: { url?: string | null; fullScreen?: boolean }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: fullScreen ? colors.chatImageBackground : colors.surfaceElevated }}>
    {url && !failed ? <>
      <Image source={{ uri: url }} resizeMode={fullScreen ? 'contain' : 'cover'} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      {!loaded ? <ActivityIndicator size="small" color={colors.textTertiary} /> : null}
    </> : <><MaterialCommunityIcons name="image-outline" size={24} color={colors.textTertiary} /><Text style={{ ...font.body(12), color: colors.textTertiary }}>{t('chat.imageUnavailable')}</Text></>}
  </View>;
}
