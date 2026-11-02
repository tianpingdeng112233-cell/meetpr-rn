import type { OnboardingProfile, OnboardingUpsertInput } from '@/api/domains/onboarding';
import { formatBodyWeightKg } from '@/domain/profile/body-weight';
import { onboardingPatchForStep, type OnboardingForm, type OnboardingStep } from '@/features/onboarding/model';
import { BENCH_GRIP_LABELS, DEADLIFT_STYLE_LABELS, INJURY_AREA_LABELS, SQUAT_STANCE_LABELS } from '@/features/onboarding/catalog';
import { t } from '@/i18n';

export type ProfileSection = 'basics' | 'background' | 'injuries' | 'competition' | 'weight' | 'note';
export const profileSteps = { weight: 1, note: 4, basics: 1, background: 2, injuries: 4, competition: 4 } as const;
type ProfilePatch = Omit<OnboardingUpsertInput, 'squat_1rm_kg' | 'bench_1rm_kg' | 'deadlift_1rm_kg'>;

/** Never call onboarding's lift step; the outbound allowlist also protects future changes. */
export function profilePatch(step: OnboardingStep, form: OnboardingForm, section?: ProfileSection): ProfilePatch {
  if (step === 3) return {};
  const patch = onboardingPatchForStep(form, step);
  const allowed = section === 'weight' ? ['weight_kg'] : section === 'note' ? ['note_to_coach'] : section === 'basics' ? ['unit_preference', 'gender', 'birth_date', 'height_cm', 'weight_kg']
    : section === 'injuries' ? ['injury_notes', 'injury_areas']
    : section === 'competition' ? ['is_competing', 'competition_date', 'target_weight_class']
    : ['unit_preference', 'gender', 'birth_date', 'height_cm', 'weight_kg', 'training_years', 'squat_stance', 'deadlift_style', 'bench_grip', 'injury_notes', 'injury_areas', 'is_competing', 'competition_date', 'target_weight_class', 'note_to_coach'];
  return Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
}
export function rowValue(value: string | readonly string[] | null | undefined): string {
  const text = Array.isArray(value) ? value.filter(Boolean).join(' · ') : value;
  return typeof text === 'string' && text.trim() ? text : t('student.myProfileV3Presentation.copy010');
}
export function injurySummary(areas: readonly string[] | null): string {
  const count = areas?.filter((area) => area !== 'other').length ?? 0;
  return count ? t(count === 1 ? 'student.myProfileV3Presentation.copy009.one' : 'student.myProfileV3Presentation.copy009', [count])
    : t(areas?.includes('other') ? 'student.myProfileV3Presentation.copy008' : 'student.myProfileV3Presentation.copy007');
}
export function injuryChips(areas: readonly string[] | null): string[] {
  if (!areas?.length) return [t('student.myProfileV3Presentation.copy007')];
  return areas.map((area) => area === 'other' ? t('student.myProfileV3Presentation.copy008')
    : t('student.myProfileV3Presentation.copy009', [label(INJURY_AREA_LABELS, area)]));
}
export function oneRMValues(profile: Pick<OnboardingProfile, 'squat_1rm_kg' | 'bench_1rm_kg' | 'deadlift_1rm_kg'>) {
  const values = [profile.squat_1rm_kg, profile.bench_1rm_kg, profile.deadlift_1rm_kg].map((v) => v !== null && Number.isFinite(Number(v)) ? Number(v) : null);
  return { lifts: values.map((v) => v === null ? '—' : String(v)), total: values.every((v) => v !== null) ? String(Math.round(values.reduce<number>((sum, v) => sum + (v ?? 0), 0) * 100) / 100) : '—' };
}
function label(labels: Record<string, string>, token: string | null): string {
  return token ? labels[token] ?? token : '';
}
export function profileRowValues(profile: OnboardingProfile): Record<ProfileSection, string> {
  return {
    injuries: injurySummary(profile.injury_areas),
    competition: rowValue(profile.is_competing && profile.competition_date ? [profile.competition_date, profile.target_weight_class ?? ''] : null),
    note: rowValue(profile.note_to_coach?.split(/\r?\n/)[0]),
    weight: rowValue(profile.weight_kg ? `${formatBodyWeightKg(profile.weight_kg)} kg` : null),
    basics: rowValue([profile.height_cm ? `${Number(profile.height_cm)} cm` : '', profile.weight_kg ? `${formatBodyWeightKg(profile.weight_kg)} kg` : '']),
    background: rowValue([profile.training_years === null ? '' : profile.training_years < 1 ? t('student.onboardingLabels.copy045') : profile.training_years >= 10 ? t('student.onboardingLabels.copy046') : t(profile.training_years === 1 ? 'student.onboardingLabels.copy047.one' : 'student.onboardingLabels.copy047', [profile.training_years]), label(SQUAT_STANCE_LABELS, profile.squat_stance), label(DEADLIFT_STYLE_LABELS, profile.deadlift_style), label(BENCH_GRIP_LABELS, profile.bench_grip)]),
  };
}

export function profileInitials(identity: string): string {
  const text = identity.trim();
  if (!text) return '';
  const initials = text.includes('@') || /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)
    ? [...text][0].toUpperCase()
    : text.split(/\s+/).slice(0, 2).map(word => [...word][0]).join('').toUpperCase();
  return /^\p{L}+$/u.test(initials) ? initials : '';
}

/** Step one supplies only session email/phone; a later caller can supply a profile name. */
export function profileIdentity(user: { email?: string | null; phone?: string | null } | null, name?: string | null): string {
  return name?.trim() || user?.email?.trim() || user?.phone?.trim() || '';
}
export function profileCoachName(binding: { status: string; coach_display_name: string | null } | null | undefined): string {
  return binding?.status === 'accepted' ? binding.coach_display_name?.trim() ?? '' : '';
}
export function profileMenuValues(profile: OnboardingProfile) {
  const values = profileRowValues(profile);
  return {
    about: profile.height_cm || profile.weight_kg ? values.basics : '—',
    health: profile.injury_areas?.length ? injurySummary(profile.injury_areas) : t('student.rn.profile.noInjuries'),
    competition: profile.is_competing && profile.competition_date ? values.competition : '—',
    note: profile.note_to_coach?.trim() ? t('student.rn.profile.added') : '—',
    settings: '',
  };
}
