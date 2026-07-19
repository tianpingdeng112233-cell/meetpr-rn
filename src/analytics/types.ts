import { z } from 'zod';

/** The iOS registry has 22 names; its "21 events" release count excludes the
 * deferred eval_summary_action instrumentation point, not the wire value. */
export enum AnalyticsEvent {
  AppOpen = 'app_open',
  ScreenView = 'screen_view',
  WorkoutLogStart = 'workout_log_start',
  SetLogged = 'set_logged',
  WorkoutLogSave = 'workout_log_save',
  OnboardingStep = 'onboarding_step',
  OnboardingComplete = 'onboarding_complete',
  BindCoachAction = 'bind_coach_action',
  PlanViewed = 'plan_viewed',
  ProgressViewed = 'progress_viewed',
  CoachOpenStudent = 'coach_open_student',
  CoachFeedbackSent = 'coach_feedback_sent',
  CoachPlanAssigned = 'coach_plan_assigned',
  CoachIntakeAction = 'coach_intake_action',
  EvalSummaryAction = 'eval_summary_action',
  ValidationError = 'validation_error',
  FieldReEdit = 'field_re_edit',
  NavBack = 'nav_back',
  FlowCancel = 'flow_cancel',
  ClientError = 'client_error',
  FrictionFeedback = 'friction_feedback',
  MediaUpload = 'media_upload',
}

export enum AnalyticsScreen {
  TodayWorkout = 'today_workout',
  Dashboard = 'dashboard',
  Plan = 'plan',
  ProgressHistory = 'progress_history',
  OnboardingWizard = 'onboarding_wizard',
  BindEnterCode = 'bind_enter_code',
  PendingBind = 'pending_bind',
  Account = 'account',
}

export type AnalyticsPropertyValue = string | number | boolean;
export type AnalyticsProperties = Readonly<Record<string, AnalyticsPropertyValue>>;

export type AnalyticsEventEnvelope = {
  event_id: string;
  session_id: string;
  seq: number;
  name: AnalyticsEvent;
  props: AnalyticsProperties;
  schema_version: 1;
  ts_client: string;
};

const AnalyticsPropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const AnalyticsEventEnvelopeSchema = z.object({
  event_id: z.uuid(),
  session_id: z.uuid(),
  seq: z.number().int().nonnegative(),
  name: z.enum(AnalyticsEvent),
  props: z.record(z.string(), AnalyticsPropertyValueSchema),
  schema_version: z.literal(1),
  ts_client: z.iso.datetime(),
});

export const ANALYTICS_PLATFORM = 'android' as const;

export type AnalyticsBatchEnvelope = {
  anon_id: string;
  app_version: string;
  build: string;
  platform: typeof ANALYTICS_PLATFORM;
  events: AnalyticsEventEnvelope[];
};

export type AnalyticsConfig = {
  enabled: boolean;
  sample_rate: number;
};

export function createBatchEnvelope(
  metadata: Omit<AnalyticsBatchEnvelope, 'events' | 'platform'>,
  events: AnalyticsEventEnvelope[],
): AnalyticsBatchEnvelope {
  return {
    ...metadata,
    platform: ANALYTICS_PLATFORM,
    events,
  };
}
