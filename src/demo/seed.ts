import type { User } from '@/api/auth';
import type { Exercise } from '@/api/domains/exercises';
import type { PlanDetail, PlanExercise } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import type { BindRequest } from '@/api/domains/bind';
import type { FeedbackItem } from '@/api/domains/feedback';
import { toSetRefWire, type ChatSetRef, type Conversation, type SetRefWire } from '@/api/domains/chat';
import { recommendedDate } from '@/domain/plan/sequence';
import { canonicalBody } from '@/features/chat/set-ref';

export const demoId = (number: number) => `de000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
export function offsetDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export type DemoMessage = {
  id: string; conversation_id: string; seq: number; sender_id: string;
  kind: 'text' | 'set_ref'; body: string; client_id: string; created_at: string;
  set_ref?: SetRefWire; video_id?: string;
};

/** Synthetic wire DTOs. Every date except the athlete's birthday follows the supplied local day. */
export function buildDemoSeed(today: string) {
  let serial = 1;
  const id = () => demoId(serial++);
  const start = offsetDate(today, -21);
  const timestamp = `${start}T12:00:00Z`;
  const user: User = { id: id(), phone: null, email: 'alex@example.test', name: 'Alex Chen', role: 'coached_student', created_at: timestamp };
  const coach: User = { id: id(), phone: null, email: 'sam@example.test', name: 'Sam Carter', role: 'coach', created_at: timestamp };
  const profile: OnboardingProfile = {
    user_id: user.id, unit_preference: 'kg', gender: 'male', birth_date: '1996-05-14', height_cm: '178', weight_kg: '83.5', training_years: 5,
    squat_stance: 'low_bar', deadlift_style: 'conventional', bench_grip: 'standard', squat_1rm_kg: '190', bench_1rm_kg: '115', deadlift_1rm_kg: '225',
    training_days: ['mon', 'wed', 'fri', 'sun'], gym_tier: 'professional', equipment_overrides: [], daily_life_intensity: 2, life_stress: 2,
    recovery_speed: 3, sleep_hours: 8, muscle_groups_to_strengthen: ['back'], injury_areas: ['knee'],
    injury_notes: 'Left knee gets sore after heavy squats, so I warm up longer', is_competing: true, competition_date: offsetDate(today, 37),
    target_weight_class: 'IPF · 83 kg', note_to_coach: 'I would like to build confidence with my squat before the meet.',
    completed_at: timestamp, created_at: timestamp, updated_at: timestamp, upload_attachment_ids: [],
  };
  const catalog: [string, Exercise['main_lift_family'], string | null][] = [
    ['Squat', 'squat', 'low_bar'], ['Bench Press', 'bench', null], ['Deadlift', 'deadlift', 'conventional'],
    ['Paused Squat', 'squat', null], ['Close-grip Bench Press', 'bench', null], ['Paused Deadlift', 'deadlift', null],
    ['Leg Press', null, null], ['Cable Row', null, null], ['Pull-up', null, null],
    ['Leg Curl', null, null], ['Triceps Extension', null, null], ['Plank', null, null],
  ];
  const exercises: Exercise[] = catalog.map(([name, family, stance], index) => ({
    id: id(), name, name_en: name, exercise_type: index < 3 ? 'main_lift' : index < 6 ? 'variation' : 'accessory',
    main_lift_family: family, is_competition_lift: index < 3, competition_stance: stance,
    muscle_groups: [], equipment: index < 6 ? ['barbell'] : [], movement_pattern: [], created_by_coach_id: null, created_at: timestamp,
  }));
  const plan: PlanDetail = {
    id: id(), coach_id: coach.id, trainee_id: user.id, name: 'Strength block', start_date: start, end_date: offsetDate(start, 41), plan_weeks: 6,
    source: 'coach', source_template_id: null, status: 'published', kind: 'regular', published_at: timestamp,
    anchor_weekday: new Date(`${start}T12:00:00Z`).getUTCDay() || 7,
    created_at: timestamp, updated_at: timestamp, total_shift_days: 0, latest_shift_created_at: null, days: [],
  };
  const logs: SetLog[] = [];
  const mainPairs = [[0, 1], [2, 1], [0, 2], [1, 2]];
  // Historical sessions include a lighter day and a repeat before progressing again.
  const mainHistoryIncreases = [0, 2.5, 0, 5, 7.5, 7.5, 10, 12.5, 15];
  const mainAppearances = [0, 0, 0];
  const mainEfforts = [[7.5, 8, 8.5], [8, 7.5, 9], [7.5, 8.5, 8], [8, 8.5, 7.5]];
  const accessoryEfforts = [6.5, 7.5, 8, 7, 8.5, 9];
  for (let week = 1; week <= 6; week++) {
    for (let slot = 0; slot < 4; slot++) {
      const day = { id: id(), plan_id: plan.id, day_of_week: slot * 2 + 1, week_number: week, sort_order: slot,
        shifted_to_date: null, completed_at: null as string | null, completion_source: null as 'manual' | null, exercises: [] as PlanExercise[] };
      const date = recommendedDate(plan, day);
      if (date < today) { day.completed_at = `${date}T15:00:00Z`; day.completion_source = 'manual'; }
      const indexes = [...mainPairs[slot], ...(slot % 2 === 0 ? [6, 7, 8] : [9, 10, 11])];
      indexes.forEach((index, order) => {
        const main = index < 3;
        const mode = main || order === 2 ? 'fixed_weight' : order === 3 ? 'rpe' : 'rir';
        const weight = main ? [130, 75, 160][index] + (week - 1) * 5 + slot * 2.5 : [170, 60, 0, 40, 25, 0][index - 6];
        const exercise: PlanExercise = {
          id: id(), plan_day_id: day.id, exercise_id: exercises[index].id, is_main_lift: main, sort_order: order,
          notes: index === 0 ? 'Brace before each rep. Keep your upper back tight throughout the set.' : order === 2 ? 'Control the lowering phase and keep every rep smooth.' : null, sets: [],
        };
        // The escaped coach-note token is fixture wire data matching the existing bodyweight parser.
        for (let setIndex = 0; setIndex < 3; setIndex++) {
          exercise.sets.push({ id: id(), plan_exercise_id: exercise.id, set_number: setIndex + 1, target_reps: main ? 5 : 10,
            target_reps_max: null, load_mode: mode, target_weight: mode === 'fixed_weight' ? String(weight) : null,
            target_rpe: mode === 'rpe' ? '8' : null, rir_target: mode === 'rir' ? 2 : null,
            intensity_mode: mode === 'fixed_weight' ? 'weight' : 'rpe', target_value: mode === 'fixed_weight' ? String(weight) : '8',
            set_type: 'working', rest_seconds: main ? 180 : null, coach_note: mode === 'rir' ? '\u81ea\u91cd' : null, created_at: timestamp });
          if (date < today) logs.push({ id: id(), student_id: user.id, plan_exercise_id: exercise.id, exercise_id: exercise.exercise_id,
            set_index: setIndex, weight_kg: String(main ? [130, 75, 160][index] + mainHistoryIncreases[mainAppearances[index]] : weight),
            reps: main ? 5 : 10 - (setIndex === 2 && (week + slot + order) % 7 === 0 ? 1 + (week + slot) % 2 : 0),
            rpe: String(main ? mainEfforts[mainAppearances[index] % mainEfforts.length][setIndex]
              : accessoryEfforts[(week + slot + order + setIndex) % accessoryEfforts.length]), coach_rpe: null,
            completed: true, failed: false, assumed: false, adhoc: false, logged_date: date, logged_at: `${date}T12:00:00Z` });
        }
        day.exercises.push(exercise);
        if (main && date < today) mainAppearances[index]++;
      });
      plan.days.push(day);
    }
  }
  const binding: BindRequest = { id: id(), student_id: user.id, coach_id: coach.id, coach_display_name: coach.name!, invite_code_id: null,
    status: 'accepted', submitted_at: timestamp, responded_at: timestamp, expired_at: `${offsetDate(today, 60)}T12:00:00Z`, skip_evaluation: true, skip_reason: null };
  const feedback: FeedbackItem[] = ['Your squat depth looks consistent. Keep the same setup.', 'Good control on the bench press. Keep your feet steady.', 'Strong work this week. Take your time with the warm-up.'].map((text, index) => ({
    id: id(), coach_id: coach.id, student_id: user.id, day_date: offsetDate(today, -6 + index * 2), plan_exercise_id: null, video_id: null,
    text, posted_at: `${offsetDate(today, -6 + index * 2)}T16:00:00Z`, read_at: index < 2 ? `${offsetDate(today, -5 + index * 2)}T12:00:00Z` : null,
  }));
  const conversationId = id();
  const current = plan.days.find(day => recommendedDate(plan, day) === today)!;
  const set = current.exercises[0].sets[0];
  const sharedSet: ChatSetRef = { v: 1, source: 'planned', exerciseName: 'Squat', setNumber: set.set_number,
    setTotal: current.exercises[0].sets.length, weightKg: set.target_weight, reps: set.target_reps,
    repsMax: set.target_reps_max, rpe: null, dayDate: today, setLogId: null, planSetId: set.id };
  const messages: DemoMessage[] = ['Your new training week is ready.', 'Thanks, the last session felt good.',
    canonicalBody(sharedSet, 'Should I keep this weight for today’s squat?'),
    'Yes. Focus on keeping your upper back tight.', 'Let me know how the warm-up feels.'].map((body, index) => ({
    id: id(), conversation_id: conversationId, seq: index + 1, sender_id: index === 1 || index === 2 ? user.id : coach.id,
    kind: 'text', body, client_id: `demo-seed-${index}`, created_at: `${today}T${String(7 + index).padStart(2, '0')}:00:00Z`,
    ...(index === 2 ? { set_ref: toSetRefWire(sharedSet) } : {}),
  }));
  const last = messages[4];
  const conversation: Conversation = { id: conversationId, other_party: { id: coach.id, display_name: coach.name! },
    last_message: { id: last.id, seq: last.seq, kind: last.kind, preview: last.body, preview_kind: 'text', created_at: last.created_at, sender_id: last.sender_id },
    last_message_at: last.created_at, unread_count: 1, my_last_read: { message_id: messages[3].id, seq: 4 }, other_last_read: { message_id: messages[3].id, seq: 4 } };
  return { user, coach, profile, exercises, plan, logs, binding, feedback, conversation, messages };
}
