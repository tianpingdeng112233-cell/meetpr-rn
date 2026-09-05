import { useStudentVideos, type StudentVideo } from '@/api/domains/videos';
import { sortedMarkers, videoMarkersRepository } from '@/api/domains/video-markers';
import { FeedbackPlaybackSession } from '@/features/feedback/playback-session';
import { FeedbackPlaybackModal } from '@/features/feedback/FeedbackPlaybackModal';
import { freshPlaybackURL } from '@/features/feedback/use-feedback-playback';
import { PlaybackLinkError } from '@/features/feedback/FeedbackComponents';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { chatRepository, ChatSetRefSchema, type ChatSetRef, type ChatMessage, type Conversation } from '@/api/domains/chat';
import { useFeedbackInboxViewModel } from '@/features/dashboard/feedback-inbox';
import { feedbackKeys, feedbackRepository, type FeedbackResponse, type FeedbackItem } from '@/api/domains/feedback';
import { useQueryClient } from '@tanstack/react-query';
import { markDashboardPlanSeen } from '@/features/dashboard/plan-seen';
import { studentChatKeys, useStudentPlanNotice } from './open-coach-chat';
import { mergeStudentTimeline, visibleFraction, videoLabel, videoDuration, type VerticalFrame, type StudentPlanNotice } from './student-timeline';
import { useSessionStore } from '@/api/session';
import { font, GradientFill, Screen, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import { createUUID } from '@/analytics/uuid';
import { applyReadState, CHAT_POLL_MS, createConversationSync, mergeMessages } from './conversation-model';

export function StudentConversationScreen({ conversationId, coachName }: { conversationId: string; coachName: string }) {
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const client = useQueryClient();
  const plan = useStudentPlanNotice(studentId);
  const inbox = useFeedbackInboxViewModel(studentId);
  const videos = useStudentVideos(studentId);
  const playback = useStudentChatPlayback();
  // The route param can arrive empty (blank coach display name); fall back to the conversation's other party.
  const [fetchedName, setFetchedName] = useState('');
  const resolvedName = coachName || fetchedName;
  useEffect(() => {
    if (coachName) return;
    let live = true;
    void chatRepository.list().then(result => { if (live) setFetchedName(result.conversations.find(item => item.id === conversationId)?.other_party.display_name ?? ''); }).catch(() => {});
    return () => { live = false; };
  }, [coachName, conversationId]);
  const [selectedShare, setSelectedShare] = useState<ChatMessage | null>(null);
  const [shareVideoError, setShareVideoError] = useState(false);
  const frames = useRef(new Map<string, VerticalFrame>());
  const viewport = useRef<VerticalFrame>({ y: 0, height: 0 });
  const contentHeight = useRef(0);
  const initialPosition = useRef(false);
  const historyAnchor = useRef<{ id: string; offset: number } | null>(null);
  const [otherReadSeq, setOtherReadSeq] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const fetchedCursor = useRef<number | undefined>(undefined);
  const [hasOlder, setHasOlder] = useState(false);
  const olderLoading = useRef(false);
  const [historyError, setHistoryError] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const followLatest = useRef(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  const [pending, setPending] = useState<{ clientId: string; text: string; failed: boolean }[]>([]);
  const sending = useRef(new Set<string>());
  const mounted = useRef(false);
  const focusGeneration = useRef(0);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useRef<() => void>(() => {});
  useFocusEffect(useCallback(() => {
    let live = true;
    mounted.current = true;
    focusGeneration.current += 1;
    const sync = createConversationSync({
      now: Date.now,
      fetchPage: async () => {
        const latest = fetchedCursor.current;
        let cursor = latest;
        let incoming: ChatMessage[] = [];
        for (;;) {
          const page = await chatRepository.messages(conversationId, cursor ? { since_seq: cursor } : {});
          if (!live) return [];
          setOtherReadSeq(previous => Math.max(previous, page.meta.other_last_read?.seq ?? 0));
          incoming = mergeMessages(incoming, page.messages);
          if (!latest) setHasOlder(page.meta.has_more);
          const next = incoming.at(-1)?.seq;
          if (!latest || !page.meta.has_more || !next || next === cursor) break;
          cursor = next;
        }
        messagesRef.current = mergeMessages(messagesRef.current, incoming);
        fetchedCursor.current = incoming.at(-1)?.seq ?? latest;
        setPending(previous => previous.filter(item => !messagesRef.current.some(message => message.client_id === item.clientId)));
        setMessages(messagesRef.current);
        return messagesRef.current;
      },
      markRead: async id => {
        const read = await chatRepository.read(conversationId, id);
        const queryKey = studentChatKeys.conversations(studentId);
        await client.cancelQueries({ queryKey });
        client.setQueryData<{ conversations: Conversation[] }>(queryKey, previous => previous && ({ conversations: applyReadState(previous.conversations, conversationId, read) }));
      },
    });
    const run = (force = false) => {
      if (!force && AppState.currentState !== 'active') return;
      void sync.refresh(force).then(() => { if (live) setLoadError(false); }).catch(() => { if (live) setLoadError(true); }).finally(() => { if (live) setLoading(false); });
    };
    refresh.current = () => run(true);
    run(true);
    const timer = setInterval(run, CHAT_POLL_MS);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') run(true); });
    return () => { live = false; mounted.current = false; focusGeneration.current += 1; historyAnchor.current = null; olderLoading.current = false; setSelectedShare(null); sync.stop(); clearInterval(timer); subscription.remove(); };
  }, [client, conversationId, studentId]));
  async function loadOlder() {
    const generation = focusGeneration.current;
    const first = messagesRef.current[0];
    if (!hasOlder || olderLoading.current || !first) return;
    const anchor = items.find(item => {
      const frame = frames.current.get(item.id);
      return frame && frame.y + frame.height > viewport.current.y;
    }) ?? items[0];
    if (anchor) historyAnchor.current = { id: anchor.id, offset: viewport.current.y - (frames.current.get(anchor.id)?.y ?? 0) };
    olderLoading.current = true;
    followLatest.current = false;
    try {
      const page = await chatRepository.messages(conversationId, { before_seq: first.seq });
      if (!mounted.current || generation !== focusGeneration.current) return;
      messagesRef.current = mergeMessages(messagesRef.current, page.messages);
      setMessages(messagesRef.current);
      setHasOlder(page.meta.has_more);
      setHistoryError(false);
    } catch { if (generation === focusGeneration.current) { historyAnchor.current = null; if (mounted.current) setHistoryError(true); } }
    finally { if (generation === focusGeneration.current) olderLoading.current = false; }
  }
  async function send(intent: { clientId: string; text: string }) {
    if (sending.current.has(intent.clientId)) return;
    sending.current.add(intent.clientId);
    setPending(previous => [...previous.filter(item => item.clientId !== intent.clientId), { ...intent, failed: false }]);
    try {
      const { message } = await chatRepository.send(conversationId, intent.text, intent.clientId);
      if (!alive.current) return;
      messagesRef.current = mergeMessages(messagesRef.current, [message]);
      setMessages(messagesRef.current);
      setPending(previous => previous.filter(item => item.clientId !== intent.clientId));
      if (mounted.current) refresh.current();
    } catch {
      if (alive.current) setPending(previous => previous.map(item => item.clientId === intent.clientId ? { ...item, failed: true } : item));
    } finally { sending.current.delete(intent.clientId); }
  }
  function sendDraft() {
    const text = draftRef.current.trim();
    if (!text) return;
    draftRef.current = '';
    setDraft('');
    return send({ text, clientId: createUUID() });
  }
  const items = useMemo(() => mergeStudentTimeline(messages, plan.planNotice, inbox.items), [messages, plan.planNotice, inbox.items]);
  const ready = !loading && !inbox.isLoading && !plan.isLoading;
  function markVisibleFeedback() {
    if (!initialPosition.current || !mounted.current || viewport.current.height <= 0) return;
    for (const item of items) {
      const frame = frames.current.get(item.id);
      if (item.kind === 'feedback' && item.feedback.read_at == null && frame && visibleFraction(frame, viewport.current) >= 0.55) {
        void playback.markRead(item.feedback.id);
      }
    }
  }
  function positionTimeline() {
    if (!ready || viewport.current.height <= 0 || contentHeight.current <= 0 || !mounted.current) return;
    const maxY = Math.max(0, contentHeight.current - viewport.current.height);
    const move = (y: number) => {
      viewport.current.y = Math.max(0, Math.min(maxY, y));
      scroll.current?.scrollTo({ y: viewport.current.y, animated: false });
      followLatest.current = maxY - viewport.current.y < 80;
    };
    if (historyAnchor.current) {
      const anchor = frames.current.get(historyAnchor.current.id);
      if (!anchor || olderLoading.current) return;
      move(anchor.y + historyAnchor.current.offset);
      historyAnchor.current = null;
    } else if (!initialPosition.current) {
      const target = items.find(item => item.kind === 'feedback' && item.feedback.read_at == null) ?? items.at(-1);
      const frame = target && frames.current.get(target.id);
      if (target && !frame) return;
      initialPosition.current = true;
      move(frame ? frame.y + frame.height + 18 - viewport.current.height : maxY);
    } else if (followLatest.current && !olderLoading.current) move(maxY);
    markVisibleFeedback();
    if (hasOlder && viewport.current.y < 50 && !historyError) void loadOlder();
  }
  useEffect(() => {
    const frame = requestAnimationFrame(positionTimeline);
    return () => cancelAnimationFrame(frame);
  });
  async function refreshShareURL(message: ChatMessage) {
    const page = await chatRepository.messages(conversationId, { since_seq: message.seq - 1, limit: 1 });
    const url = page.messages.find(item => item.id === message.id)?.video_url;
    if (!url) throw new Error('Playback unavailable');
    return url;
  }
  async function openShareVideo(message: ChatMessage) {
    const generation = focusGeneration.current;
    setShareVideoError(false);
    try {
      const video_url = await refreshShareURL(message);
      if (mounted.current && generation === focusGeneration.current) setSelectedShare({ ...message, video_url });
    } catch { if (mounted.current && generation === focusGeneration.current) setShareVideoError(true); }
  }
  const empty = !loading && !inbox.isLoading && !plan.isLoading && !loadError && !items.length && !pending.length;
  return <Screen><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.borderHairline, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy001')} onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="chevron-left" size={20} color={colors.textPrimary} /></Pressable>
      <View style={{ gap: 2 }}><Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{resolvedName}</Text><Text style={{ ...font.body(11), color: colors.success }}>{t(empty ? 'student.studentBlackGoldChatView.copy002' : 'student.studentBlackGoldChatView.copy003')}</Text></View>
    </View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEventThrottle={16}
      onScrollBeginDrag={() => { initialPosition.current = true; }}
      onLayout={({ nativeEvent: { layout } }) => { viewport.current.height = layout.height; }}
      onContentSizeChange={(_, height) => { contentHeight.current = height; requestAnimationFrame(positionTimeline); }}
      onScroll={({ nativeEvent: event }) => {
        viewport.current = { y: event.contentOffset.y, height: event.layoutMeasurement.height };
        markVisibleFeedback();
        followLatest.current = event.contentSize.height - event.layoutMeasurement.height - event.contentOffset.y < 80;
        if (initialPosition.current && event.contentOffset.y < 50 && hasOlder && !historyError) void loadOlder();
      }} contentContainerStyle={{ flexGrow: 1, padding: 18, gap: 10 }}>
      {loadError && !items.length && !pending.length ? <StudentConversationLoadErrorState retry={() => refresh.current()} /> : empty ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="message-outline" size={23} color={colors.textMuted} /></View>
        <Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary, textAlign: 'center' }}>{t('student.studentBlackGoldChatView.copy014', [resolvedName])}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Text style={{ ...font.body(13), color: colors.textMuted }}>{t('student.studentBlackGoldChatView.copy015')}</Text><MaterialCommunityIcons name="arrow-down" size={14} color={colors.gold500} /></View>
      </View> : !ready && !items.length && !pending.length ? <ActivityIndicator color={colors.gold500} style={{ flex: 1 }} /> : null}
      {hasOlder ? historyError ? <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy013')} onPress={() => void loadOlder()}><Text style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center' }}>{t('student.studentBlackGoldChatView.copy013')}</Text></Pressable> : <ActivityIndicator accessibilityLabel={t('student.studentBlackGoldChatView.copy024')} size="small" color={colors.gold500} style={{ paddingVertical: 8 }} /> : null}
      {items[0] ? <Text style={{ ...font.body(11), color: colors.textDim, textAlign: 'center', paddingBottom: 4 }}>{chatTimestamp(items[0].occurredAt)}</Text> : null}
      {items.map(item => <View key={item.id} testID={`student-chat-item-${item.id}`} onLayout={({ nativeEvent: { layout } }) => { frames.current.set(item.id, { y: layout.y, height: layout.height }); }}>
        {item.kind === 'message' ? <StudentChatMessageRow message={item.message} outgoing={item.message.sender_id === studentId} read={otherReadSeq >= item.message.seq} openVideo={() => void openShareVideo(item.message)} />
          : item.kind === 'feedback' ? <StudentFeedbackChatCard feedback={item.feedback} video={videos.data?.videos.find(video => video.id === item.feedback.video_id)} onPlay={() => { if (item.feedback.video_id) void playback.session.open(item.feedback.id, item.feedback.video_id); }} />
          : <StudentPlanChatCard notice={item.notice} onPress={async () => { await markDashboardPlanSeen(studentId, item.notice.signature); await client.cancelQueries({ queryKey: plan.queryKey }); client.setQueryData(plan.queryKey, true); router.navigate('/(student)/training'); }} />}
        {item.kind === 'feedback' && playback.errorFeedbackId === item.feedback.id ? <PlaybackLinkError /> : null}
      </View>)}
      {shareVideoError ? <PlaybackLinkError /> : null}
      {pending.map(item => <View key={item.clientId} style={{ maxWidth: '76%', alignSelf: 'flex-end', alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ ...font.body(14, 'medium'), color: colors.bgBase, backgroundColor: `${colors.textPrimary}B8`, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderBottomRightRadius: 5 }}>{item.text}</Text>
        <Pressable accessibilityRole="button" disabled={!item.failed} onPress={() => send(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name={item.failed ? 'refresh' : 'clock-outline'} size={10} color={item.failed ? colors.danger : colors.textDim} />
          <Text style={{ ...font.mono(10, item.failed ? 'bold' : 'regular'), color: item.failed ? colors.danger : colors.textDim }}>{t(item.failed ? 'student.studentBlackGoldChatView.copy026' : 'student.studentBlackGoldChatView.copy025')}</Text>
        </Pressable>
      </View>)}
    </ScrollView>
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderColor: colors.borderHairline }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard, paddingLeft: 16, paddingRight: 6 }}>
        <TextInput accessibilityLabel={t('student.studentBlackGoldChatView.copy008')} placeholder={t('student.studentBlackGoldChatView.copy008')} placeholderTextColor={colors.textGhost} multiline maxLength={4000} value={draft} onChangeText={text => { draftRef.current = text.slice(0, 4000); setDraft(draftRef.current); }} style={{ ...font.body(14), color: colors.textPrimary, flex: 1, lineHeight: 20, maxHeight: 122, paddingVertical: 11 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy007')} disabled={!draft.trim()} onPress={sendDraft} style={{ width: 34, height: 34, marginVertical: 6, borderRadius: 17, backgroundColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', opacity: draft.trim() ? 1 : 0.55 }}><MaterialCommunityIcons name="arrow-up" size={18} color={colors.ctaTopHighlight} /></Pressable>
      </View>
    </View>
    <FeedbackPlaybackModal item={playback.playbackItem} session={playback.session} />
    {selectedShare?.video_url ? <Modal visible animationType="slide" onRequestClose={() => setSelectedShare(null)}><FeedbackVideoPlayer videoId={selectedShare.id} url={selectedShare.video_url} refreshURL={() => refreshShareURL(selectedShare)} onClose={() => setSelectedShare(null)} /></Modal> : null}
  </KeyboardAvoidingView></Screen>;
}

function StudentChatMessageRow({ message, outgoing, read, openVideo }: { message: ChatMessage; outgoing: boolean; read: boolean; openVideo?: () => void }) {
  const colors = useColors();
  const reference = ChatSetRefSchema.safeParse(message.set_ref);
  if (message.kind !== 'image' && reference.success) return <StudentSetChatCard reference={reference.data} message={message} outgoing={outgoing} read={read} openVideo={openVideo} />;
  return <View style={{ maxWidth: '76%', alignSelf: outgoing ? 'flex-end' : 'flex-start', alignItems: outgoing ? 'flex-end' : 'flex-start', gap: 4 }}>
    <View style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderBottomRightRadius: outgoing ? 5 : 16, borderBottomLeftRadius: outgoing ? 16 : 5, backgroundColor: outgoing ? colors.textPrimary : colors.surfaceElevated, flexDirection: 'row', gap: 6 }}>
      {message.kind === 'image' ? <MaterialCommunityIcons name="image" size={18} color={outgoing ? colors.bgBase : colors.textPrimary} /> : null}
      <Text selectable style={{ flexShrink: 1, ...font.body(14, outgoing ? 'medium' : 'regular'), lineHeight: 14 * 1.45, color: outgoing ? colors.bgBase : colors.textPrimary }}>{message.kind === 'image' ? t('student.studentBlackGoldChatView.copy018') : message.kind === 'set_ref' ? t('chat.trainingShare') : message.body}</Text>
    </View>
    {outgoing ? <Text style={{ ...font.mono(10), color: colors.textDim }}>{t(read ? 'student.studentBlackGoldChatView.copy016' : 'student.studentBlackGoldChatView.copy017')}</Text> : null}
  </View>;
}

function StudentFeedbackChatCard({ feedback, video, onPlay }: { feedback: FeedbackItem; video?: StudentVideo; onPlay: () => void }) {
  const colors = useColors();
  return <View style={{ width: '88%', alignSelf: 'flex-start', backgroundColor: colors.surfaceCard, borderRadius: 16, borderTopLeftRadius: 5, borderBottomLeftRadius: 5, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 12, gap: 9 }}>
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.gold500 }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold500 }} />
      <Text style={{ ...font.body(13, 'bold'), color: colors.textPrimary, flex: 1 }}>{t('student.studentBlackGoldChatView.copy022')}</Text>
      {feedback.read_at == null ? <Text style={{ ...font.mono(9, 'bold'), letterSpacing: 0.72, color: colors.inkOnGold, backgroundColor: colors.goldText, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 }}>{t('student.studentBlackGoldChatView.copy023')}</Text> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><MaterialCommunityIcons name="check" size={11} color={colors.goldText} /><Text style={{ ...font.mono(11), color: colors.goldText }}>{t('student.studentBlackGoldChatView.copy016')}</Text></View>}
    </View>
    {feedback.video_id ? <Pressable accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} onPress={onPlay} style={{ height: 150, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <GradientFill direction="diagonal" stops={[{ color: colors.borderStrong, offset: 0 }, { color: colors.surfaceCard, offset: 1 }]} />
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.modalShadow.replace(/,[^,]+\)$/, ',0.45)'), borderWidth: 1.5, borderColor: `${colors.ctaTopHighlight}BF`, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="play" size={15} color={colors.ctaTopHighlight} /></View>
      <Text style={{ position: 'absolute', top: 8, left: 9, ...font.mono(11), color: colors.textPrimary, backgroundColor: colors.modalShadow, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>{videoLabel(video)}</Text>
      <Text style={{ position: 'absolute', bottom: 8, right: 9, ...font.mono(10), color: colors.ctaTopHighlight, backgroundColor: colors.modalShadow.replace(/,[^,]+\)$/, ',0.6)'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>{videoDuration(null)}</Text>
    </Pressable> : null}
    <Text style={{ ...font.body(14), color: colors.textPrimary, lineHeight: 21 }}>{feedback.text}</Text>
  </View>;
}

function StudentPlanChatCard({ notice, onPress }: { notice: StudentPlanNotice; onPress: () => Promise<void> }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy020')} onPress={onPress} style={{ width: '88%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.surfaceCard, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 16, borderBottomLeftRadius: 5 }}>
    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="calendar" size={20} color={colors.textSecondary} /></View>
    <View style={{ flex: 1, gap: 2, alignItems: 'flex-start' }}>
      <Text style={{ ...font.mono(9, 'bold'), letterSpacing: 0.9, color: colors.goldText, backgroundColor: colors.chatPlanBadgeFill, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>{t('student.studentBlackGoldChatView.copy019')}</Text>
      <Text style={{ ...font.body(14.5, 'bold'), color: colors.textPrimary, marginTop: 3 }}>{t('student.studentBlackGoldChatView.copy020')}</Text>
      <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('student.studentBlackGoldChatView.copy021', [notice.weekIndex])}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textDim} />
  </Pressable>;
}

function StudentConversationLoadErrorState({ retry }: { retry: () => void }) {
  const colors = useColors();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 13 }}>
    <MaterialCommunityIcons name="alert-outline" size={24} color={colors.textMuted} />
    <Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{t('student.studentBlackGoldChatView.copy011')}</Text>
    <Text style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center' }}>{t('student.studentBlackGoldChatView.copy012')}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy013')} onPress={retry} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong }}><Text style={{ ...font.body(13, 'bold'), color: colors.textPrimary }}>{t('student.studentBlackGoldChatView.copy013')}</Text></Pressable>
  </View>;
}

function StudentSetChatCard({ reference, message, outgoing, read, openVideo }: { reference: ChatSetRef; message: ChatMessage; outgoing: boolean; read: boolean; openVideo?: () => void }) {
  const colors = useColors();
  const reps = reference.repsMax != null ? `${reference.reps}-${reference.repsMax}` : reference.reps ?? '-';
  // Canonical wire bodies begin with a generated snapshot line; only the remainder is a note.
  const body = message.body ?? '';
  const firstLine = body.split('\n')[0];
  const note = firstLine.startsWith('[') && firstLine.includes(reference.exerciseName) && firstLine.includes(reference.dayDate)
    ? body.slice(firstLine.length + 1) : body;
  return <View style={{ width: '76%', alignSelf: outgoing ? 'flex-end' : 'flex-start', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 16, overflow: 'hidden' }}>
    <View style={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name="dumbbell" size={13} color={colors.goldText} />
        <Text style={{ ...font.body(12, 'bold'), color: colors.goldText, flex: 1 }}>{t(reference.source === 'logged' ? 'chat.loggedSetCardLabel' : 'chat.plannedSetCardLabel')}</Text>
        <Text style={{ ...font.mono(11), color: colors.textTertiary }}>{new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Text style={{ ...font.body(20, 'bold'), color: colors.textPrimary, flex: 1 }}>{reference.exerciseName}</Text><Text style={{ ...font.mono(11), color: colors.textTertiary }}>{reference.setTotal != null ? t('chat.setPosition %@ of %@', [reference.setNumber, reference.setTotal]) : t('chat.setPosition %@', [reference.setNumber])}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ ...font.body(11), letterSpacing: 1.1, color: colors.textTertiary }}>{t('chat.weightRepsMetric')}</Text><Text style={{ ...font.body(22, 'bold'), color: colors.textPrimary }}>{`${reference.weightKg ?? '-'}kg × ${reps}`}</Text></View>
        <View style={{ height: 52, width: 1, backgroundColor: colors.borderDefault }} />
        <View style={{ gap: 4 }}><Text style={{ ...font.body(11), letterSpacing: 1.1, color: colors.textTertiary }}>{t('chat.rpeMetric')}</Text><Text style={{ ...font.mono(22, 'bold'), color: colors.goldText }}>{reference.rpe ?? '-'}</Text></View>
      </View>
      {message.video_url ? <Pressable accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} onPress={openVideo} style={{ minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong }}><Text style={{ ...font.body(14, 'bold'), color: colors.goldText }}>{t('chat.playVideo')}</Text></Pressable> : null}
      {note ? <Text style={{ ...font.body(16), color: colors.textPrimary, backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 8 }}>{note}</Text> : null}
    </View>
    {outgoing ? <Text style={{ ...font.body(12), color: colors.textTertiary, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 16, paddingVertical: 8 }}>{t(read ? 'chat.setCardRead' : 'chat.setCardDelivered')}</Text> : null}
    <View style={{ position: 'absolute', top: 0, bottom: 0, [outgoing ? 'right' : 'left']: 0, width: 3, backgroundColor: colors.gold500 }} />
  </View>;
}

function chatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const time = new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return date.toDateString() === new Date().toDateString() ? t('student.studentBlackGoldChatView.copy010', [time])
    : `${new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(date)} ${time}`;
}

function useStudentChatPlayback() {
  const client = useQueryClient();
  const { session, markRead } = useMemo(() => {
    const readRequests = new Map<string, Promise<void>>();
    const markRead = (id: string) => {
      if (client.getQueriesData<FeedbackResponse>({ queryKey: feedbackKeys.all }).some(([, data]) => data?.items.some(item => item.id === id && item.read_at != null))) return Promise.resolve();
      const existing = readRequests.get(id);
      if (existing) return existing;
      const request = feedbackRepository.markRead(id).then(async () => {
        await client.cancelQueries({ queryKey: feedbackKeys.all });
        client.setQueriesData<FeedbackResponse>({ queryKey: feedbackKeys.all }, previous => previous && ({ ...previous, items: previous.items.map(item => item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item) }));
      }).catch(() => {});
      readRequests.set(id, request);
      return request;
    };
    return { markRead, session: new FeedbackPlaybackSession({
      markRead, url: freshPlaybackURL,
      markers: async id => ({ kind: 'loaded', markers: sortedMarkers((await videoMarkersRepository.list(id)).markers).map(marker => ({ id: marker.id, timeMs: marker.time_ms, note: marker.note, annotationURL: marker.annotation_url })) }),
    }) };
  }, [client]);
  useFocusEffect(useCallback(() => () => session.close(), [session]));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { ...state, session, markRead };
}
