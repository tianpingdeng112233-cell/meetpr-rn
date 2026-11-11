import { createUUID } from '@/analytics/uuid';
import { chatRepository, type ChatMessage, type Conversation } from '@/api/domains/chat';
import { feedbackKeys, feedbackRepository, type FeedbackItem, type FeedbackResponse } from '@/api/domains/feedback';
import { sortedMarkers, videoMarkersRepository } from '@/api/domains/video-markers';
import { useStudentVideos, type StudentVideo } from '@/api/domains/videos';
import { useSessionStore } from '@/api/session';
import { font, GradientFill, Screen, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { useFeedbackInboxViewModel } from '@/features/feedback/feedback-inbox';
import { markDashboardPlanSeen } from '@/features/chat/plan-seen';
import { FeedbackVideoUnavailable, PlaybackLinkError } from '@/features/feedback/FeedbackComponents';
import { FeedbackPlaybackModal } from '@/features/feedback/FeedbackPlaybackModal';
import { FeedbackPlaybackSession } from '@/features/feedback/playback-session';
import { freshPlaybackURL } from '@/features/feedback/use-feedback-playback';
import { feedbackVideoAssociation } from '@/features/feedback/video-presentation';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { localDate } from '@/domain/coach/detail-week';
import { getLocale, t } from '@/i18n';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useChatPhotos } from './chat-photos';
import { SetRefSharePicker, loadTodaySetRefCandidates } from './SetRefSharePicker';
import { ChatExerciseNoteCard } from './ChatExerciseNoteCard';
import { ChatSetCard, useChatSetPlayback } from './ChatSetCard';
import { chatTimeLocale, ChatTimeSeparator } from './ChatTimeSeparator';
import { ChatVideoCover, type PosterSize } from './ChatVideoCover';
import { applyReadState, CONVERSATION_POLL_MS, createConversationSync, mergeMessages } from './conversation-model';
import { flushExerciseNotes, useExerciseNoteOutbox } from './exercise-note-outbox';
import { studentChatKeys, useStudentPlanNotice } from './open-coach-chat';
import { startConversationRealtime, useChatRealtime } from './realtime';
import { canonicalBody, ChatSetCardPresentation, displayFirstLine, setRefBodyAllowed } from './set-ref';
import { useSetRefStagingStore, waitForSetRefVideo, type SetRefSendIntent } from './set-ref-staging';
import {
  chatTimeSeparators,
  feedbackCoverSize,
  mergeStudentTimeline,
  videoLabel,
  visibleFraction,
  type StudentPlanNotice,
  type VerticalFrame,
} from './student-timeline';

export function StudentConversationScreen({ conversationId, coachName }: { conversationId: string; coachName: string }) {
  const { subscribe } = useChatRealtime();
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const client = useQueryClient();
  const exerciseNotes = useExerciseNoteOutbox(state => state.notes);
  const [coachId, setCoachId] = useState('');
  useEffect(() => { let live = true; void chatRepository.list().then(result => { if (live) setCoachId(result.conversations.find(item => item.id === conversationId)?.other_party.id ?? ''); }).catch(() => {}); return () => { live = false; }; }, [conversationId]);
  const plan = useStudentPlanNotice(studentId);
  const inbox = useFeedbackInboxViewModel(studentId);
  const videos = useStudentVideos(studentId);
  const playback = useStudentChatPlayback();
  // The route param can arrive empty (blank coach display name); fall back to the conversation's other party.
  const [fetchedName, setFetchedName] = useState('');
  const resolvedName = coachName.trim() || fetchedName.trim() || t('student.dashboardView.copy003');
  useEffect(() => {
    if (coachName.trim()) return;
    let live = true;
    void chatRepository.list().then(result => { if (live) setFetchedName(result.conversations.find(item => item.id === conversationId)?.other_party.display_name ?? ''); }).catch(() => {});
    return () => { live = false; };
  }, [coachName, conversationId]);
  const { selectedShare, setSelectedShare, shareVideoError, refreshShareURL, openShareVideo } = useChatSetPlayback(conversationId, message => {
    messagesRef.current = mergeMessages(messagesRef.current, [message]);
    setMessages(messagesRef.current);
  });
  const [showActions, setShowActions] = useState(false);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const loadCandidates = useCallback(() => loadTodaySetRefCandidates(studentId), [studentId]);
  const photos = useChatPhotos(studentId, conversationId, message => {
    messagesRef.current = mergeMessages(messagesRef.current, [message]);
    setMessages(messagesRef.current);
    if (mounted.current) refresh.current();
  });
  const frames = useRef(new Map<string, VerticalFrame>());
  const viewport = useRef<VerticalFrame>({ y: 0, height: 0 });
  const contentHeight = useRef(0);
  const initialPosition = useRef(false);
  const historyAnchor = useRef<{ id: string; offset: number } | null>(null);
  const [otherReadSeq, setOtherReadSeq] = useState(0);
  const otherReadRef = useRef(0);
  const updateOtherRead = useCallback((seq: number) => {
    otherReadRef.current = Math.max(otherReadRef.current, seq);
    setOtherReadSeq(otherReadRef.current);
  }, []);
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
  const staged = useSetRefStagingStore(state => state.intents[conversationId]);
  const [sendError, setSendError] = useState('');
  const setOperations = useRef(new Map<string, { intent: SetRefSendIntent; note: string; controller: AbortController }>());
  useEffect(() => () => { for (const operation of setOperations.current.values()) operation.controller.abort(); }, []);
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  const [pending, setPending] = useState<{ clientId: string; text: string; createdAt: string; failed: boolean; setIntent?: SetRefSendIntent }[]>([]);
  const sending = useRef(new Set<string>());
  const localSentAt = useRef(new Map<string, string>());
  const mounted = useRef(false);
  const focusGeneration = useRef(0);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useRef<() => void>(() => {});
  const acknowledgeSetRef = useCallback((clientId: string) => {
    const operation = setOperations.current.get(clientId);
    const current = useSetRefStagingStore.getState().intents[conversationId];
    if (current?.clientId === clientId) {
      useSetRefStagingStore.getState().discard(conversationId, clientId);
      if (alive.current) {
        if (draftRef.current === operation?.note) { draftRef.current = ''; setDraft(''); }
        setSendError('');
      }
    }
    setOperations.current.delete(clientId);
  }, [conversationId]);
  useFocusEffect(useCallback(() => {
    let live = true;
    mounted.current = true;
    focusGeneration.current += 1;
    const sync = createConversationSync({
      now: Date.now,
      pollInterval: CONVERSATION_POLL_MS,
      realtime: { conversationId, userId: studentId, messages: () => messagesRef.current, otherReadSeq: () => otherReadRef.current, updateOtherRead },
      fetchPage: async () => {
        const latest = fetchedCursor.current;
        let cursor = latest;
        let incoming: ChatMessage[] = [];
        for (;;) {
          const page = await chatRepository.messages(conversationId, cursor ? { since_seq: cursor } : {});
          if (!live) return [];
          updateOtherRead(page.meta.other_last_read?.seq ?? 0);
          incoming = mergeMessages(incoming, page.messages);
          if (!latest) setHasOlder(page.meta.has_more);
          const next = incoming.at(-1)?.seq;
          if (!latest || !page.meta.has_more || !next || next === cursor) break;
          cursor = next;
        }
        messagesRef.current = mergeMessages(messagesRef.current, incoming);
        fetchedCursor.current = incoming.at(-1)?.seq ?? latest;
        incoming.forEach(message => acknowledgeSetRef(message.client_id));
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
    const stopRealtime = startConversationRealtime({ subscribe, refresh: run, receive: async event => {
      const result = await sync.receive(event);
      if (live && result) { setLoadError(false); setLoading(false); }
    } });
    return () => { live = false; mounted.current = false; focusGeneration.current += 1; historyAnchor.current = null; olderLoading.current = false; sync.stop(); stopRealtime(); };
  }, [acknowledgeSetRef, client, conversationId, studentId, subscribe, updateOtherRead]));
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
  async function send(intent: { clientId: string; text: string; createdAt?: string; setIntent?: SetRefSendIntent }) {
    if (sending.current.has(intent.clientId)) return;
    sending.current.add(intent.clientId);
    const createdAt = localSentAt.current.get(intent.clientId) ?? intent.createdAt ?? new Date().toISOString();
    localSentAt.current.set(intent.clientId, createdAt);
    setPending(previous => [...previous.filter(item => item.clientId !== intent.clientId), { ...intent, createdAt, failed: false }]);
    try {
      const operation = setOperations.current.get(intent.clientId);
      let videoId: string | undefined;
      if (intent.setIntent) {
        videoId = await waitForSetRefVideo(intent.setIntent.video, operation?.controller.signal);
        // Freeze the resolved upload across HTTP retries, even if it is later removed locally.
        intent.setIntent.video = videoId ? { state: 'ready', videoId } : null;
      }
      const { message } = intent.setIntent
        ? await chatRepository.sendSetRef(conversationId, { body: intent.text, clientID: intent.clientId, setRef: intent.setIntent.setRef, ...(videoId ? { videoId } : {}) })
        : await chatRepository.send(conversationId, intent.text, intent.clientId);
      if (intent.setIntent) acknowledgeSetRef(intent.clientId);
      if (!alive.current) return;
      messagesRef.current = mergeMessages(messagesRef.current, [message]);
      setMessages(messagesRef.current);
      setPending(previous => previous.filter(item => item.clientId !== intent.clientId));
      if (mounted.current) refresh.current();
    } catch (error) {
      if (intent.setIntent && alive.current && useSetRefStagingStore.getState().intents[conversationId]?.clientId === intent.clientId) {
        const key = error instanceof Error && (error.message === 'chat.videoFailed' || error.message === 'chat.videoUnavailable') ? error.message : 'chat.trainingShareFailed';
        setSendError(t(key));
      }
      if (alive.current) setPending(previous => previous.map(item => item.clientId === intent.clientId ? { ...item, failed: true } : item));
    } finally { sending.current.delete(intent.clientId); }
  }
  function sendDraft() {
    if (staged && !staged.autoSend) {
      const existing = setOperations.current.get(staged.clientId);
      const body = canonicalBody(staged.setRef, draftRef.current);
      if (!setRefBodyAllowed(body)) return;
      const operation = existing ?? { intent: { ...staged, body }, note: draftRef.current, controller: new AbortController() };
      setOperations.current.set(staged.clientId, operation);
      setSendError('');
      return send({ text: operation.intent.body, clientId: staged.clientId, setIntent: operation.intent });
    }
    const text = draftRef.current.trim();
    if (!text) return;
    draftRef.current = '';
    setDraft('');
    return send({ text, clientId: createUUID() });
  }
  const sendPickerIntent = useEffectEvent((intent: SetRefSendIntent) => {
    const operation = { intent: { ...intent }, note: '', controller: new AbortController() };
    setOperations.current.set(intent.clientId, operation);
    void send({ text: intent.body, clientId: intent.clientId, setIntent: operation.intent });
  });
  const attemptedPickerIntents = useRef(new Set<string>());
  useEffect(() => {
    if (!staged?.autoSend || attemptedPickerIntents.current.has(staged.clientId)) return;
    attemptedPickerIntents.current.add(staged.clientId);
    sendPickerIntent(staged);
  }, [staged]);
  const items = useMemo(() => mergeStudentTimeline(messages, plan.planNotice, inbox.items, localSentAt.current), [messages, plan.planNotice, inbox.items]);
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
  const stagedBody = staged ? staged.autoSend ? staged.body : canonicalBody(staged.setRef, draft) : '';
  const canSend = staged && !staged.autoSend ? setRefBodyAllowed(stagedBody) && !pending.some(item => item.clientId === staged.clientId && !item.failed) : Boolean(draft.trim());
  function discardStaged() {
    if (!staged) return;
    setOperations.current.get(staged.clientId)?.controller.abort();
    setOperations.current.delete(staged.clientId);
    setPending(previous => previous.filter(item => item.clientId !== staged.clientId));
    useSetRefStagingStore.getState().discard(conversationId); setSendError('');
  }
  const separators = new Map(chatTimeSeparators(
    [...items.map(item => item.kind === 'message' ? item.message.created_at : item.occurredAt), ...pending.map(item => item.createdAt)],
    new Date(), chatTimeLocale(), [...items.map(item => item.occurredAt), ...pending.map(item => item.createdAt)],
  ).map(item => [item.index, item.label]));
  const empty = !loading && !inbox.isLoading && !plan.isLoading && !loadError && !items.length && !pending.length;
  return <Screen edges={['top', 'left', 'right']}><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.borderHairline, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><GradientFill direction="diagonal" stops={[{ color: colors.gold400, offset: 0 }, { color: colors.gold500, offset: 1 }]} /><Text style={{ ...font.body(20, 'bold'), color: colors.inkOnGold }}>{resolvedName.slice(0, 1)}</Text></View>
      <View style={{ gap: 3, flex: 1 }}><Text style={{ ...font.body(22, 'bold'), color: colors.textPrimary }}>{resolvedName}</Text><Text style={{ ...font.body(12), color: colors.textSecondary }}>{t('student.coachTab.subtitle')}</Text></View>
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
      {items.map((item, index) => <Fragment key={item.id}><ChatTimeSeparator label={separators.get(index)} /><View testID={`student-chat-item-${item.id}`} onLayout={({ nativeEvent: { layout } }) => { frames.current.set(item.id, { y: layout.y, height: layout.height }); }}>
        {item.kind === 'message' ? <StudentChatMessageRow message={item.message} outgoing={item.message.sender_id === studentId} read={otherReadSeq >= item.message.seq} openImage={() => setSelectedImage(item.message.image_url ?? null)} openVideo={() => void openShareVideo(item.message)} />
          : item.kind === 'feedback' ? <StudentFeedbackChatCard feedback={item.feedback} videos={videos.data?.videos ?? []} onOpen={() => router.push(`/(student)/feedback/${item.feedback.id}`)} onPlay={() => { if (item.feedback.video_id) void playback.session.open(item.feedback.id, item.feedback.video_id); }} />
          : <StudentPlanChatCard notice={item.notice} onPress={async () => { await markDashboardPlanSeen(studentId, item.notice.signature); await client.cancelQueries({ queryKey: plan.queryKey }); client.setQueryData(plan.queryKey, true); router.navigate('/(student)/training'); }} />}
        {item.kind === 'feedback' && playback.errorFeedbackId === item.feedback.id ? <PlaybackLinkError /> : null}
      </View></Fragment>)}
      {shareVideoError ? <PlaybackLinkError /> : null}
      {exerciseNotes.filter(note => note.studentId === studentId && note.coachId === coachId && !messages.some(message => message.client_id === note.clientID)).map(note => <View key={note.clientID} style={{ gap: 4 }}>
        <ChatExerciseNoteCard student outgoing message={{ body: note.body, exercise_ref: note.exerciseRef, sender_id: studentId }} />
        <Pressable onPress={() => void flushExerciseNotes(studentId)}><Text style={{ color: colors.textMuted, textAlign: 'right', ...font.body(12) }}>{t(note.failed ? 'chat.sendFailed' : 'student.setSync.syncing')}</Text></Pressable>
      </View>)}
      {pending.map((item, index) => <Fragment key={item.clientId}><ChatTimeSeparator label={separators.get(items.length + index)} /><View style={{ maxWidth: '76%', alignSelf: 'flex-end', alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ ...font.body(14, 'medium'), color: colors.textPrimary, backgroundColor: colors.goldSoft, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderBottomRightRadius: 5 }}>{getLocale() === 'zh-Hant' && item.setIntent?.displayExerciseName
          ? displayFirstLine(item.setIntent.setRef, item.setIntent.displayExerciseName) + item.text.slice(canonicalBody(item.setIntent.setRef).length)
          : item.text}</Text>
        <Pressable accessibilityRole="button" disabled={!item.failed} onPress={() => send(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name={item.failed ? 'refresh' : 'clock-outline'} size={10} color={item.failed ? colors.danger : colors.textDim} />
          <Text style={{ ...font.mono(10, item.failed ? 'bold' : 'regular'), color: item.failed ? colors.danger : colors.textDim }}>{t(item.failed ? 'student.studentBlackGoldChatView.copy026' : 'student.studentBlackGoldChatView.copy025')}</Text>
        </Pressable>
      </View></Fragment>)}
      {photos.photos.filter(photo => !messages.some(message => message.client_id === photo.clientId)).map(photo => <View key={photo.clientId} style={{ alignSelf: 'flex-end', gap: 4 }}><PhotoBubble uri={photo.uri} width={photo.width} height={photo.height} onPress={() => setSelectedImage(photo.uri)} /><Pressable accessibilityRole="button" disabled={photos.sending !== null} onPress={() => void photos.send(photo)}><Text style={{ ...font.body(12), color: colors.textSecondary }}>{t(photos.sending === photo.clientId ? 'student.studentBlackGoldChatView.copy025' : 'student.studentBlackGoldChatView.copy026')}</Text></Pressable></View>)}
    </ScrollView>
    {showActions ? <Pressable feedback="none" accessibilityLabel={t('chat.close')} onPress={() => setShowActions(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 80, justifyContent: 'flex-end', padding: 16 }}>
      <View style={{ borderRadius: 16, backgroundColor: colors.surfaceCard, borderColor: colors.borderStrong, borderWidth: 1, padding: 8 }}>
        {(['camera', 'video'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityLabel={t(kind === 'camera' ? 'student.coachTab.takePhoto' : 'student.coachTab.shareVideo')} onPress={() => { setShowActions(false); if (kind === 'camera') void photos.takePhoto(); else setShowSetPicker(true); }} style={{ minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 12 }}><MaterialCommunityIcons name={kind === 'camera' ? 'camera-outline' : 'video-outline'} size={20} color={colors.textPrimary} /><Text style={{ ...font.body(15), color: colors.textPrimary }}>{t(kind === 'camera' ? 'student.coachTab.takePhoto' : 'student.coachTab.shareVideo')}</Text></Pressable>)}
      </View>
    </Pressable> : null}
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderColor: colors.borderHairline }}>
      {staged ? <View style={{ gap: 6, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="dumbbell" size={16} color={colors.gold500} />
          <Text numberOfLines={2} style={{ ...font.body(12, 'medium'), color: colors.textSecondary, flex: 1 }}>{displayFirstLine(staged.setRef, staged.displayExerciseName)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy004')} onPress={discardStaged} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={18} color={colors.textDim} /></Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ ...font.mono(10), color: setRefBodyAllowed(stagedBody) ? colors.textDim : colors.danger, flex: 1 }}>{!setRefBodyAllowed(stagedBody) ? t('student.studentBlackGoldChatView.copy005') : sendError}</Text><Text style={{ ...font.mono(10), color: colors.textDim }}>{stagedBody.length}/4000</Text></View>
      </View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.coachTab.add')} onPress={() => setShowActions(value => !value)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="plus" size={24} color={colors.textPrimary} /></Pressable>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard, paddingLeft: 16, paddingRight: 6 }}>
        <TextInput accessibilityLabel={t('student.studentBlackGoldChatView.copy008')} placeholder={staged && !staged.autoSend ? t('student.studentBlackGoldChatView.copy009') : t('student.coachTab.placeholder', [resolvedName])} placeholderTextColor={colors.textGhost} multiline maxLength={4000} value={draft} onChangeText={text => { draftRef.current = text.slice(0, 4000); setDraft(draftRef.current); }} style={{ ...font.body(14), color: colors.textPrimary, flex: 1, lineHeight: 20, maxHeight: 122, paddingVertical: 11 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy007')} disabled={!canSend} onPress={sendDraft} style={{ width: 34, height: 34, marginVertical: 6, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.gold500, alignItems: 'center', justifyContent: 'center', opacity: canSend ? 1 : 0.55 }}><GradientFill direction="vertical" stops={[{ color: colors.gold400, offset: 0 }, { color: colors.gold500, offset: 1 }]} /><MaterialCommunityIcons name="arrow-up" size={18} color={colors.ctaTopHighlight} /></Pressable>
      </View>
    </View>
    </View>
    {photos.failed ? <Text accessibilityRole="alert" style={{ paddingHorizontal: 16, ...font.body(12), color: colors.danger }}>{t('chat.sendFailed')}</Text> : null}
    {showSetPicker ? <SetRefSharePicker conversationId={conversationId} loadCandidates={loadCandidates} onClose={() => setShowSetPicker(false)} /> : null}
    {photos.preview ? <Modal visible animationType="slide" onRequestClose={photos.discardPreview}><Screen><View style={{ flex: 1, padding: 16, gap: 16 }}><Image source={{ uri: photos.preview.uri }} resizeMode="contain" style={{ flex: 1 }} /><View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>{[{ label: t('designSystem.action.cancel'), action: photos.discardPreview }, { label: t('student.coachTab.retake'), action: () => void photos.takePhoto() }, { label: t('student.studentBlackGoldChatView.copy007'), action: () => void photos.send(photos.preview!) }].map(item => <Pressable key={item.label} accessibilityRole="button" disabled={photos.sending !== null} onPress={item.action} style={{ minHeight: 48, justifyContent: 'center', padding: 12 }}><Text style={{ ...font.body(16, 'bold'), color: colors.goldText }}>{item.label}</Text></Pressable>)}</View></View></Screen></Modal> : null}
    {selectedImage ? <Modal visible onRequestClose={() => setSelectedImage(null)}><Screen><Pressable accessibilityRole="button" accessibilityLabel={t('chat.close')} onPress={() => setSelectedImage(null)} style={{ padding: 16, alignSelf: 'flex-end' }}><MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} /></Pressable><Image source={{ uri: selectedImage }} resizeMode="contain" style={{ flex: 1 }} /></Screen></Modal> : null}
    <FeedbackPlaybackModal item={playback.playbackItem} session={playback.session} />
    {selectedShare?.video_url ? <Modal visible animationType="slide" onRequestClose={() => setSelectedShare(null)}><FeedbackVideoPlayer videoId={selectedShare.id} url={selectedShare.video_url} refreshURL={() => refreshShareURL(selectedShare)} onClose={() => setSelectedShare(null)} /></Modal> : null}
  </KeyboardAvoidingView></Screen>;
}

function StudentChatMessageRow({ message, outgoing, read, openVideo, openImage }: { message: ChatMessage; outgoing: boolean; read: boolean; openImage: () => void; openVideo?: () => void }) {
  const colors = useColors();
  if (message.kind === 'image') return <View style={{ alignSelf: outgoing ? 'flex-end' : 'flex-start' }}><PhotoBubble uri={message.image_url} onPress={openImage} /></View>;
  if (message.exercise_ref) return <ChatExerciseNoteCard message={message} outgoing={outgoing} student />;
  const presentation = ChatSetCardPresentation(message);
  if (presentation) return <ChatSetCard note={presentation.note} reference={presentation.setRef} message={message} outgoing={outgoing} read={read} openVideo={openVideo} />;
  return <View style={{ maxWidth: '76%', alignSelf: outgoing ? 'flex-end' : 'flex-start', alignItems: outgoing ? 'flex-end' : 'flex-start', gap: 4 }}>
    <View style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderBottomRightRadius: outgoing ? 5 : 16, borderBottomLeftRadius: outgoing ? 16 : 5, backgroundColor: outgoing ? colors.goldSoft : colors.surfaceCard, flexDirection: 'row', gap: 6 }}>
      <Text selectable style={{ flexShrink: 1, ...font.body(14, outgoing ? 'medium' : 'regular'), lineHeight: 14 * 1.45, color: colors.textPrimary }}>{message.body}</Text>
    </View>
    {outgoing ? <Text style={{ ...font.mono(10), color: colors.textDim }}>{t(read ? 'student.studentBlackGoldChatView.copy016' : 'student.studentBlackGoldChatView.copy017')}</Text> : null}
  </View>;
}

// In-memory only: keep a video's ratio across card/screen remounts and signed URL renewal.
const feedbackPosterSizes = new Map<string, PosterSize>();

function StudentFeedbackChatCard({ feedback, videos, onPlay, onOpen }: { feedback: FeedbackItem; videos: readonly StudentVideo[]; onPlay: () => void; onOpen: () => void }) {
  const colors = useColors();
  const association = feedbackVideoAssociation(feedback.video_id, videos, feedback.video);
  const video = association.kind === 'available' ? association.video : null;
  const explicitlyUnavailable = feedback.video !== undefined && association.kind === 'unavailable';
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const markers = useQuery({ queryKey: ['chat-feedback-markers', studentId, feedback.video_id], queryFn: () => videoMarkersRepository.list(feedback.video_id!), enabled: Boolean(feedback.video_id) && !explicitlyUnavailable, staleTime: 60_000 });
  const date = new Intl.DateTimeFormat(getLocale(), { month: 'numeric', day: 'numeric', weekday: 'short' }).format(feedback.day_date ? localDate(feedback.day_date) : new Date(feedback.posted_at));
  const videoId = video?.id;
  const posterURL = video?.poster_url;
  const [posterResult, setPosterResult] = useState<{ videoId: string; url: string; size: PosterSize | null } | null>(null);
  const posterSize = videoId && posterURL
    ? posterResult?.videoId === videoId && posterResult.url === posterURL ? posterResult.size : feedbackPosterSizes.get(videoId)
    : null;
  const [availableWidth, setAvailableWidth] = useState(0);
  const coverSize = feedbackCoverSize(posterSize?.width, posterSize?.height, availableWidth);
  function onPosterSize(size: PosterSize | null) {
    if (!videoId || !posterURL) return;
    if (size && Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0) {
      feedbackPosterSizes.set(videoId, size);
    }
    setPosterResult({ videoId, url: posterURL, size });
  }
  return <Pressable testID={`feedback-detail-${feedback.id}`} accessibilityRole="button" onPress={onOpen} onLayout={({ nativeEvent: { layout } }) => setAvailableWidth(Math.max(0, layout.width - 26))}
    style={{ width: '88%', alignSelf: 'flex-start', backgroundColor: colors.surfaceCard, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 12, gap: 9 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      {feedback.read_at == null ? <View testID={`feedback-unread-${feedback.id}`} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dangerFill }} /> : null}
      <Text style={{ ...font.body(12), color: colors.textSecondary, flex: 1 }}>{[t('student.studentBlackGoldChatView.copy022'), date, video ? videoLabel(video) : null].filter(Boolean).join(' · ')}</Text>
    </View>
    <Text style={{ ...font.body(15), color: colors.textPrimary, lineHeight: 22 }}>{feedback.text}</Text>
    {explicitlyUnavailable ? <FeedbackVideoUnavailable /> : feedback.video_id ? <Pressable accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} onPress={event => { event?.stopPropagation(); onPlay(); }} style={{ height: coverSize.height, width: coverSize.width || '100%', alignSelf: 'flex-start', borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <GradientFill direction="diagonal" stops={[{ color: colors.borderStrong, offset: 0 }, { color: colors.surfaceCard, offset: 1 }]} />
      <ChatVideoCover posterURL={posterURL} durationSeconds={video?.duration_seconds} onPosterSize={onPosterSize} />
      {markers.data?.markers.length ? <Text style={{ position: 'absolute', right: 8, bottom: 8, ...font.body(12), color: colors.ctaTopHighlight, backgroundColor: colors.modalShadow, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>{t('student.coachTab.annotations', [markers.data.markers.length])}</Text> : null}
    </Pressable> : null}
  </Pressable>;
}

function StudentPlanChatCard({ notice, onPress }: { notice: StudentPlanNotice; onPress: () => Promise<void> }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={t('student.studentBlackGoldChatView.copy020')} onPress={onPress} style={{ alignSelf: 'center', maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: 14 }}>
    <Text style={{ ...font.body(13), color: colors.textSecondary, textAlign: 'center' }}>{t('student.coachTab.planPublished', [notice.weekIndex])}</Text>
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

function PhotoBubble({ uri, width = 4, height = 3, onPress }: { uri?: string | null; width?: number; height?: number; onPress: () => void }) {
  const colors = useColors();
  const [size, setSize] = useState({ width, height });
  const scale = 240 / Math.max(size.width, size.height, 1);
  return <Pressable accessibilityRole="button" accessibilityLabel={t('chat.image')} onPress={onPress} style={{ width: size.width * scale, height: size.height * scale, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceCard }}>
    {uri ? <Image source={{ uri }} resizeMode="contain" onLoad={({ nativeEvent: { source } }) => { if (source.width > 0 && source.height > 0) setSize({ width: source.width, height: source.height }); }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: colors.textSecondary }}>{t('chat.imageUnavailable')}</Text>}
  </Pressable>;
}
