import { describe, expect, test } from '@jest/globals';

import { ChangePasswordRequestSchema } from '../account';
import {
  BindRequestSchema,
  MineBindRequestResponseSchema,
} from '../bind';
import { FeedbackResponseSchema } from '../feedback';
import {
  OnboardingProfileSchema,
  OnboardingUpsertRequestSchema,
} from '../onboarding';
import {
  PlanDetailSchema,
  PlansResponseSchema,
  ShiftPlanResponseSchema,
} from '../plans';
import {
  ReadinessCheckinSchema,
  ReadinessResponseSchema,
} from '../readiness';
import {
  SetLogsResponseSchema,
  SetLogUpsertRequestSchema,
  SetLogUpsertResponseSchema,
} from '../sets';
import {
  AttachmentSchema,
  UploadCompleteRequestSchema,
  UploadInitiateResponseSchema,
  UploadUrlResponseSchema,
} from '../uploads';
import { StudentVideosResponseSchema } from '../videos';

const STUDENT_ID = '10000000-0000-4000-8000-000000000000';
const COACH_ID = '20000000-0000-4000-8000-000000000000';
const PLAN_ID = '30000000-0000-4000-8000-000000000000';
const DAY_ID = '40000000-0000-4000-8000-000000000000';
const PLAN_EXERCISE_ID = '50000000-0000-4000-8000-000000000000';
const EXERCISE_ID = '60000000-0000-4000-8000-000000000000';
const SET_ID = '70000000-0000-4000-8000-000000000000';
const ATTACHMENT_ID = '80000000-0000-4000-8000-000000000000';
const NOW = '2026-07-19T12:00:00.123Z';

const planSummary = {
  id: PLAN_ID,
  coach_id: COACH_ID,
  trainee_id: STUDENT_ID,
  name: '力量周期',
  start_date: '2026-07-14',
  end_date: '2026-08-10',
  plan_weeks: 4,
  source: 'coach' as const,
  source_template_id: null,
  status: 'published' as const,
  kind: 'regular' as const,
  created_at: NOW,
  updated_at: NOW,
  total_shift_days: 0,
  latest_shift_created_at: null,
};

describe('plans snake_case schemas', () => {
  test('parses list, detail, shift response, and the documented empty state', () => {
    expect(PlansResponseSchema.parse({ plans: [] })).toEqual({ plans: [] });
    expect(PlansResponseSchema.parse({ plans: [planSummary] }).plans[0].coach_id).toBe(
      COACH_ID,
    );

    const detail = PlanDetailSchema.parse({
      ...planSummary,
      days: [
        {
          id: DAY_ID,
          plan_id: PLAN_ID,
          day_of_week: 1,
          week_number: 1,
          sort_order: 0,
          shifted_to_date: null,
          exercises: [
            {
              id: PLAN_EXERCISE_ID,
              plan_day_id: DAY_ID,
              exercise_id: EXERCISE_ID,
              is_main_lift: true,
              sort_order: 0,
              notes: null,
              sets: [
                {
                  id: SET_ID,
                  plan_exercise_id: PLAN_EXERCISE_ID,
                  set_number: 1,
                  target_reps: 5,
                  target_reps_max: null,
                  intensity_mode: 'weight',
                  target_value: '120.00',
                  set_type: 'working',
                  rest_seconds: null,
                  coach_note: null,
                  created_at: NOW,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(detail.days[0].exercises[0].sets[0].target_value).toBe('120.00');
    expect(detail.days[0].exercises[0]).toMatchObject({ notes: null });
    expect(detail.days[0].exercises[0].sets[0]).toMatchObject({
      target_reps_max: null,
      rest_seconds: null,
      coach_note: null,
    });

    expect(
      ShiftPlanResponseSchema.parse({
        batch_id: ATTACHMENT_ID,
        shifted_days: [{ day_id: DAY_ID, shifted_to_date: '2026-07-20' }],
        total_offset_days: 1,
      }).shifted_days[0].shifted_to_date,
    ).toBe('2026-07-20');
  });
});

describe('sets snake_case schemas', () => {
  test('keeps Decimal strings and accepts nullable plan_exercise_id', () => {
    expect(SetLogsResponseSchema.parse({ logs: [] })).toEqual({ logs: [] });
    const response = SetLogsResponseSchema.parse({
      logs: [
        {
          id: SET_ID,
          student_id: STUDENT_ID,
          plan_exercise_id: null,
          exercise_id: EXERCISE_ID,
          set_index: 0,
          weight_kg: '100.00',
          reps: 5,
          rpe: '8.5',
          completed: true,
          failed: false,
          assumed: false,
          adhoc: true,
          logged_date: '2026-07-19',
          logged_at: NOW,
        },
      ],
    });
    expect(response.logs[0]).toMatchObject({
      plan_exercise_id: null,
      weight_kg: '100.00',
      rpe: '8.5',
    });
    expect(
      SetLogUpsertResponseSchema.parse({ id: SET_ID, logged_at: NOW }),
    ).toEqual({ id: SET_ID, logged_at: NOW });
    expect(
      SetLogUpsertRequestSchema.parse({
        plan_exercise_id: PLAN_EXERCISE_ID,
        set_index: 0,
        weight_kg: '100.00',
        reps: 5,
        rpe: null,
        completed: true,
      }).rpe,
    ).toBeNull();
  });
});

describe('readiness snake_case schemas', () => {
  test('parses a checkin and the checkin:null empty state', () => {
    expect(ReadinessResponseSchema.parse({ checkin: null })).toEqual({
      checkin: null,
    });
    expect(
      ReadinessCheckinSchema.parse({
        id: SET_ID,
        student_id: STUDENT_ID,
        checkin_date: '2026-07-19',
        sleep_quality: 4,
        mood: 5,
        stress: 3,
        muscle_fatigue: [{ muscle_group: 'quads', severity: 2 }],
        submitted_at: NOW,
        updated_at: NOW,
      }).muscle_fatigue,
    ).toEqual([{ muscle_group: 'quads', severity: 2 }]);
  });
});

describe('feedback snake_case schemas', () => {
  test('parses unread feedback and the items:[] empty state', () => {
    expect(FeedbackResponseSchema.parse({ items: [] })).toEqual({ items: [] });
    const response = FeedbackResponseSchema.parse({
      items: [
        {
          id: SET_ID,
          coach_id: COACH_ID,
          student_id: STUDENT_ID,
          day_date: '2026-07-19',
          plan_exercise_id: null,
          text: '动作节奏很好',
          posted_at: NOW,
          read_at: null,
        },
      ],
    });
    expect(response.items[0].read_at).toBeNull();
    expect(response.items[0].plan_exercise_id).toBeNull();
  });
});

describe('uploads snake_case schemas', () => {
  test('parses initiate, ready attachment, and short-link responses', () => {
    expect(
      UploadInitiateResponseSchema.parse({
        attachment_id: ATTACHMENT_ID,
        upload_id: 'oss-upload-id',
        part_urls: [{ part_number: 1, url: 'https://oss.example/part/1' }],
      }).attachment_id,
    ).toBe(ATTACHMENT_ID);

    expect(
      AttachmentSchema.parse({
        id: ATTACHMENT_ID,
        owner_id: STUDENT_ID,
        kind: 'set_video',
        oss_key: 'student/video.mp4',
        content_type: 'video/mp4',
        size_bytes: 1024,
        filename: null,
        set_log_id: SET_ID,
        source_plan_id: PLAN_ID,
        source_coach_id: COACH_ID,
        is_unlinked_explicit: false,
        part_count: 1,
        actual_size_bytes: null,
        status: 'ready',
        created_at: NOW,
        updated_at: NOW,
      }),
    ).toMatchObject({
      filename: null,
      actual_size_bytes: null,
      status: 'ready',
    });
    expect(
      UploadUrlResponseSchema.parse({
        url: 'https://oss.example/video.mp4',
        expires_in: 900,
      }).expires_in,
    ).toBe(900);
  });

  test('validates complete multipart parts locally', () => {
    expect(
      UploadCompleteRequestSchema.parse({
        parts: [
          { part_number: 1, etag: 'etag-1' },
          { part_number: 200, etag: 'etag-200' },
        ],
      }).parts,
    ).toHaveLength(2);

    const invalidFixtures = [
      { parts: [] },
      { parts: [{ part_number: 1, etag: '' }] },
      { parts: [{ part_number: 0, etag: 'etag-0' }] },
      { parts: [{ part_number: 201, etag: 'etag-201' }] },
      {
        parts: [
          { part_number: 1, etag: 'etag-a' },
          { part_number: 1, etag: 'etag-b' },
        ],
      },
    ];

    invalidFixtures.forEach((fixture) => {
      expect(UploadCompleteRequestSchema.safeParse(fixture).success).toBe(false);
    });
  });
});

describe('videos snake_case schemas', () => {
  test('parses video metadata and the videos:[] empty state', () => {
    expect(StudentVideosResponseSchema.parse({ videos: [] })).toEqual({
      videos: [],
    });
    const response = StudentVideosResponseSchema.parse({
      videos: [
        {
          id: ATTACHMENT_ID,
          set_log_id: null,
          plan_exercise_id: null,
          exercise_name: null,
          set_index: null,
          weight_kg: null,
          reps: null,
          content_type: 'video/mp4',
          size_bytes: 1024,
          filename: null,
          created_at: NOW,
          logged_at: null,
        },
      ],
    });
    expect(response.videos[0]).toMatchObject({
      set_log_id: null,
      plan_exercise_id: null,
      exercise_name: null,
      set_index: null,
      weight_kg: null,
      reps: null,
      filename: null,
      logged_at: null,
    });
  });
});

describe('bind snake_case schemas', () => {
  test('parses a request and the bind_request:null empty state', () => {
    expect(
      MineBindRequestResponseSchema.parse({ bind_request: null }),
    ).toEqual({ bind_request: null });
    expect(
      BindRequestSchema.parse({
        id: SET_ID,
        student_id: STUDENT_ID,
        coach_id: COACH_ID,
        coach_display_name: null,
        invite_code_id: null,
        status: 'pending',
        submitted_at: NOW,
        responded_at: null,
        expired_at: '2026-07-26T12:00:00Z',
        skip_evaluation: true,
        skip_reason: null,
      }),
    ).toMatchObject({
      coach_display_name: null,
      invite_code_id: null,
      responded_at: null,
      skip_reason: null,
    });
  });
});

describe('onboarding snake_case schemas', () => {
  test('parses every constant nullable response key when explicitly null', () => {
    const profile = OnboardingProfileSchema.parse({
      user_id: STUDENT_ID,
      unit_preference: null,
      gender: null,
      birth_date: null,
      height_cm: null,
      weight_kg: null,
      training_years: null,
      squat_stance: null,
      deadlift_style: null,
      bench_grip: null,
      squat_1rm_kg: null,
      bench_1rm_kg: null,
      deadlift_1rm_kg: null,
      training_days: null,
      gym_tier: null,
      equipment_overrides: null,
      daily_life_intensity: null,
      life_stress: null,
      recovery_speed: null,
      sleep_hours: null,
      muscle_groups_to_strengthen: null,
      injury_notes: null,
      injury_areas: null,
      is_competing: null,
      competition_date: null,
      target_weight_class: null,
      note_to_coach: null,
      completed_at: null,
      created_at: NOW,
      updated_at: NOW,
      upload_attachment_ids: [ATTACHMENT_ID],
    });
    expect(profile).toMatchObject({
      unit_preference: null,
      equipment_overrides: null,
      completed_at: null,
    });
  });

  test('accepts explicit null clears and upload attachment ids in PUT bodies', () => {
    expect(
      OnboardingUpsertRequestSchema.parse({
        bench_grip: null,
        training_days: null,
        equipment_overrides: null,
        muscle_groups_to_strengthen: null,
        injury_notes: null,
        injury_areas: null,
        competition_date: null,
        target_weight_class: null,
        note_to_coach: null,
        upload_attachment_ids: [ATTACHMENT_ID],
      }),
    ).toEqual({
      bench_grip: null,
      training_days: null,
      equipment_overrides: null,
      muscle_groups_to_strengthen: null,
      injury_notes: null,
      injury_areas: null,
      competition_date: null,
      target_weight_class: null,
      note_to_coach: null,
      upload_attachment_ids: [ATTACHMENT_ID],
    });
  });
});

describe('account snake_case schemas', () => {
  test('accepts only old_password/new_password request keys', () => {
    expect(
      ChangePasswordRequestSchema.parse({
        old_password: 'old-password',
        new_password: 'new-password',
      }),
    ).toEqual({
      old_password: 'old-password',
      new_password: 'new-password',
    });
    expect(
      ChangePasswordRequestSchema.safeParse({
        oldPassword: 'old-password',
        newPassword: 'new-password',
      }).success,
    ).toBe(false);
  });
});
