import { t } from '@/i18n';
import { ChatSetRefSchema, type ChatMessage, type ChatSetRef } from '@/api/domains/chat';

// Frozen cross-client message wire copy. Never translate this protocol constant.
const CANONICAL = { logged: '[训练分享]', planned: '[训练计划]', ordinal: '第', set: '组', plannedMarker: ' 计划' };
function repsText(ref: ChatSetRef): string {
  return ref.repsMax != null ? `${ref.reps}-${ref.repsMax}` : String(ref.reps ?? '-');
}
function metrics(ref: ChatSetRef): string {
  return `${ref.weightKg ?? '-'}kg×${repsText(ref)}${ref.rpe == null ? '' : ` @RPE${ref.rpe}`} (${ref.dayDate})`;
}
export function canonicalFirstLine(ref: ChatSetRef): string {
  return `${CANONICAL[ref.source]} ${ref.exerciseName} ${CANONICAL.ordinal}${ref.setNumber}${CANONICAL.set}${ref.setTotal == null ? '' : `/${ref.setTotal}`}${ref.source === 'planned' ? CANONICAL.plannedMarker : ''} ${metrics(ref)}`;
}

export function canonicalBody(ref: ChatSetRef, note?: string | null): string {
  return canonicalFirstLine(ref) + (note ? `\n${note}` : '');
}
export function displayFirstLine(ref: ChatSetRef): string {
  const position = ref.setTotal == null ? t('chat.setPosition %@', [ref.setNumber]) : t('chat.setPosition %@ of %@', [ref.setNumber, ref.setTotal]);
  return `${t(ref.source === 'logged' ? 'chat.setReference.loggedTag' : 'chat.setReference.plannedTag')} ${ref.exerciseName} ${position}${ref.source === 'planned' ? t('chat.setReference.plannedMarker') : ''} ${metrics(ref)}`;
}
export type SetRefSource = Omit<ChatSetRef, 'v'> & { v?: 1 };
export function normalizeSetRef(source: SetRefSource): ChatSetRef {
  const decimal = (value: string | null | undefined, pattern: RegExp) => {
    if (value == null) return value;
    if (!pattern.test(value)) throw new Error('Invalid decimal source');
    return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
  };
  return ChatSetRefSchema.parse({ ...source, v: 1,
    weightKg: decimal(source.weightKg, /^(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,2})?$/),
    rpe: decimal(source.rpe, /^(?:0|[1-9][0-9]?)(?:\.[0-9])?$/),
  });
}
export function setRefBodyAllowed(body: string): boolean { return body.length <= 4000; }
export function ChatSetCardPresentation(message: Pick<ChatMessage, 'kind' | 'set_ref' | 'body'>): { setRef: ChatSetRef; note: string | null } | null {
  const parsed = ChatSetRefSchema.safeParse(message.set_ref);
  if (message.kind === 'image' || !parsed.success || message.body == null) return null;
  const first = canonicalFirstLine(parsed.data);
  if (message.body === first) return { setRef: parsed.data, note: null };
  if (message.body.startsWith(`${first}\n`)) return { setRef: parsed.data, note: message.body.slice(first.length + 1) };
  return null;
}

export type SetRefVideo =
  | { state: 'ready'; videoId: string }
  | { state: 'uploading'; attachmentId: string | null; recordKey: string; createdAt: number }
  | { state: 'failed' };
export type SetRefCandidate = { id: string; source: SetRefSource; video?: SetRefVideo };
export function buildCandidates({ planDay, drafts, dayDate, exerciseNames, videos }: {
  planDay: import('@/api/domains/plans').PlanDay;
  drafts: readonly Pick<import('@/features/training/model').WorkoutSetDraft, 'exercise' | 'setIndex' | 'sourceLog'>[];
  dayDate: string;
  exerciseNames: ReadonlyMap<string, string>;
  videos: Readonly<Record<string, import('@/features/training/video-upload/model').VideoUploadRecord>>;
}): SetRefCandidate[] {
  const logged = drafts.filter(draft => draft.sourceLog && planDay.exercises.some(exercise => exercise.id === draft.exercise.id))
    .sort((a, b) => Date.parse(b.sourceLog!.logged_at) - Date.parse(a.sourceLog!.logged_at) || b.exercise.sort_order - a.exercise.sort_order || b.setIndex - a.setIndex);
  const recorded = new Set(logged.map(draft => `${draft.exercise.id}:${draft.setIndex}`));
  const uploads = Object.entries(videos).sort((a, b) => b[1].createdAt - a[1].createdAt);
  const candidates: SetRefCandidate[] = logged.map(draft => {
    const log = draft.sourceLog!;
    const match = uploads.find(([, record]) => record.setLogId === log.id && record.status !== 'none');
    let video: SetRefVideo | undefined;
    if (match) {
      const [recordKey, record] = match;
      video = record.status === 'uploaded' && record.attachmentId ? { state: 'ready', videoId: record.attachmentId }
        : record.status === 'failed' || record.status === 'uploaded' ? { state: 'failed' }
        : { state: 'uploading', attachmentId: record.attachmentId, recordKey, createdAt: record.createdAt };
    }
    return { id: log.id, video, source: { source: 'logged', exerciseName: exerciseNames.get(draft.exercise.exercise_id) ?? t('student.todayWorkoutView.copy011'),
      setNumber: draft.setIndex + 1, setTotal: draft.exercise.sets.length >= draft.setIndex + 1 ? draft.exercise.sets.length : null,
      weightKg: log.weight_kg, reps: log.reps, repsMax: null, rpe: log.rpe, dayDate, setLogId: log.id, planSetId: null } };
  });
  for (const exercise of [...planDay.exercises].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const set of [...exercise.sets].sort((a, b) => a.set_number - b.set_number)) {
      if (recorded.has(`${exercise.id}:${set.set_number - 1}`)) continue;
      const source: SetRefSource = { source: 'planned', exerciseName: exerciseNames.get(exercise.exercise_id) ?? t('student.todayWorkoutView.copy011'),
        setNumber: set.set_number, setTotal: exercise.sets.length,
        weightKg: set.load_mode == null ? (set.intensity_mode === 'weight' ? set.target_value : null) : set.target_weight ?? null,
        rpe: set.load_mode == null ? (set.intensity_mode === 'rpe' ? set.target_value : null) : set.load_mode === 'rpe' ? set.target_rpe ?? null : null,
        reps: set.target_reps, repsMax: set.target_reps_max, dayDate, setLogId: null, planSetId: set.id };
      try { normalizeSetRef(source); candidates.push({ id: set.id, source }); } catch { /* iOS excludes invalid prescriptions. */ }
    }
  }
  return candidates;
}
export class SetRefPickerPresentation {
  candidates: SetRefCandidate[] = [];
  selectedCandidateID?: string;
  page: 'selection' | 'confirmation' = 'selection';
  get selectedCandidate() { return this.candidates.find(item => item.id === this.selectedCandidateID); }
  load(candidates: SetRefCandidate[], initialSetLogID?: string | null) {
    this.candidates = candidates;
    this.selectedCandidateID = candidates.find(item => item.id === initialSetLogID)?.id ?? candidates[0]?.id;
    this.page = 'selection';
  }
  select(id: string) { if (this.candidates.some(item => item.id === id)) this.selectedCandidateID = id; }
  proceed() { if (!this.selectedCandidate) return false; this.page = 'confirmation'; return true; }
  showSelection() { this.page = 'selection'; }
}

export const SetRefEntryVisibility = {
  shouldShow: ({ isEditable, hasAvailableSet, hasActiveCoach, hasSharingContext }: {
    isEditable: boolean; hasAvailableSet: boolean; hasActiveCoach: boolean; hasSharingContext: boolean;
  }) => isEditable && hasAvailableSet && hasActiveCoach && hasSharingContext,
};
