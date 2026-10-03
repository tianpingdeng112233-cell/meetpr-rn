import { t } from '@/i18n';

/** Wire tokens from peripheral-screens.md Appendix B; labels are display-only. */
export const UNIT_PREFERENCES = ['kg', 'lb'] as const;
export const GENDERS = ['male', 'female', 'other'] as const;
export const SQUAT_STANCES = ['high_bar', 'low_bar'] as const;
export const DEADLIFT_STYLES = ['conventional', 'sumo', 'both'] as const;
export const BENCH_GRIPS = ['narrow', 'standard', 'wide'] as const;
export const TRAINING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const GYM_TIERS = ['home_with_rack', 'commercial', 'professional'] as const;
export const MUSCLE_GROUPS = [
  'quad', 'hamstring', 'glute', 'back', 'chest', 'shoulder', 'triceps', 'biceps', 'core', 'calf',
] as const;
export const INJURY_AREAS = [
  'shoulder', 'elbow', 'wrist', 'lower_back', 'hip', 'knee', 'ankle', 'other',
] as const;

export type GymTier = (typeof GYM_TIERS)[number];
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type InjuryArea = (typeof INJURY_AREAS)[number];

export const UNIT_LABELS = { get kg() { return t('student.step1BasicsSection.copy005'); }, get lb() { return t('student.step1BasicsSection.copy006'); } } as const;
export const GENDER_LABELS = { get male() { return t('student.onboardingLabels.copy001'); }, get female() { return t('student.onboardingLabels.copy002'); }, get other() { return t('student.onboardingLabels.copy003'); } } as const;
export const SQUAT_STANCE_LABELS = { get high_bar() { return t('student.onboardingLabels.copy004'); }, get low_bar() { return t('student.onboardingLabels.copy005'); } } as const;
export const DEADLIFT_STYLE_LABELS = { get conventional() { return t('student.onboardingLabels.copy006'); }, get sumo() { return t('student.onboardingLabels.copy007'); }, get both() { return t('student.onboardingLabels.copy008'); } } as const;
export const BENCH_GRIP_LABELS = { get narrow() { return t('student.onboardingLabels.copy009'); }, get standard() { return t('student.onboardingLabels.copy010'); }, get wide() { return t('student.onboardingLabels.copy011'); } } as const;
export const TRAINING_DAY_LABELS = {
  get mon() { return t('student.onboardingLabels.copy015'); }, get tue() { return t('student.onboardingLabels.copy016'); }, get wed() { return t('student.onboardingLabels.copy017'); }, get thu() { return t('student.onboardingLabels.copy018'); }, get fri() { return t('student.onboardingLabels.copy019'); }, get sat() { return t('student.onboardingLabels.copy020'); }, get sun() { return t('student.onboardingLabels.copy021'); },
} as const;
export const GYM_TIER_LABELS = {
  get home_with_rack() { return t('student.onboardingLabels.copy012'); }, get commercial() { return t('student.onboardingLabels.copy013'); }, get professional() { return t('student.onboardingLabels.copy014'); },
} as const;
export const GYM_TIER_SUBTITLES = {
  get home_with_rack() { return t('student.step4EnvironmentSection.copy009'); },
  get commercial() { return t('student.step4EnvironmentSection.copy010'); },
  get professional() { return t('student.step4EnvironmentSection.copy011'); },
} as const;
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  get quad() { return t('student.onboardingLabels.copy036'); }, get hamstring() { return t('student.onboardingLabels.copy037'); }, get glute() { return t('student.onboardingLabels.copy038'); }, get back() { return t('student.onboardingLabels.copy039'); }, get chest() { return t('student.onboardingLabels.copy040'); },
  get shoulder() { return t('student.onboardingLabels.copy029'); }, get triceps() { return t('student.onboardingLabels.copy041'); }, get biceps() { return t('student.onboardingLabels.copy042'); }, get core() { return t('student.onboardingLabels.copy043'); }, get calf() { return t('student.onboardingLabels.copy044'); },
};
export const INJURY_AREA_LABELS: Record<InjuryArea, string> = {
  get shoulder() { return t('student.onboardingLabels.copy029'); }, get elbow() { return t('student.onboardingLabels.copy030'); }, get wrist() { return t('student.onboardingLabels.copy031'); }, get lower_back() { return t('student.onboardingLabels.copy032'); }, get hip() { return t('student.onboardingLabels.copy033'); }, get knee() { return t('student.onboardingLabels.copy034'); }, get ankle() { return t('student.onboardingLabels.copy035'); }, get other() { return t('student.onboardingLabels.copy003'); },
};

export const EQUIPMENT_GROUPS = ['basics', 'dumbbellMax', 'machines', 'powerlifting'] as const;
export const EQUIPMENT_GROUP_LABELS = {
  get basics() { return t('student.step4EnvironmentSection.copy014'); }, get dumbbellMax() { return t('student.step4EnvironmentSection.copy015'); }, get machines() { return t('student.step4EnvironmentSection.copy017'); }, get powerlifting() { return t('student.step4EnvironmentSection.copy018'); },
} as const;
const ALL_TIERS: readonly GymTier[] = GYM_TIERS;
const HOME: readonly GymTier[] = ['home_with_rack'];
const COMMERCIAL: readonly GymTier[] = ['commercial'];
const PROFESSIONAL: readonly GymTier[] = ['professional'];
const GYMS: readonly GymTier[] = ['commercial', 'professional'];
const NO_PREFILL: readonly GymTier[] = [];

export const EQUIPMENT_CATALOG = [
  { token: 'barbell_dumbbell', group: 'basics', tiers: ALL_TIERS },
  { token: 'squat_bench_rack', group: 'basics', tiers: ALL_TIERS },
  { token: 'pullup_bar', group: 'basics', tiers: ALL_TIERS },
  { token: 'db_max_20', group: 'dumbbellMax', tiers: HOME },
  { token: 'db_max_40', group: 'dumbbellMax', tiers: GYMS },
  { token: 'db_max_40_plus', group: 'dumbbellMax', tiers: NO_PREFILL },
  { token: 'smith_machine', group: 'machines', tiers: COMMERCIAL },
  { token: 'cable_crossover', group: 'machines', tiers: GYMS },
  { token: 'lat_pulldown', group: 'machines', tiers: GYMS },
  { token: 'leg_press_machine', group: 'machines', tiers: GYMS },
  { token: 'leg_curl_extension', group: 'machines', tiers: GYMS },
  { token: 'seated_row', group: 'machines', tiers: GYMS },
  { token: 'landmine', group: 'machines', tiers: GYMS },
  { token: 'seal_row', group: 'machines', tiers: PROFESSIONAL },
  { token: 'hack_squat', group: 'machines', tiers: PROFESSIONAL },
  { token: 'power_bar_stiff', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'deadlift_bar', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'safety_bar', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'fractional_plates', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'lifting_platform', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'rack_pins_blocks', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'chains_bands', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'ghr', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'belt_squat', group: 'powerlifting', tiers: PROFESSIONAL },
] as const;
export type EquipmentToken = (typeof EQUIPMENT_CATALOG)[number]['token'];
export const EQUIPMENT_TOKENS = EQUIPMENT_CATALOG.map(({ token }) => token);
export const EQUIPMENT_LABELS: Record<EquipmentToken, string> = {
  get barbell_dumbbell() { return t('student.equipmentCatalog.copy001'); },
  get squat_bench_rack() { return t('student.equipmentCatalog.copy002'); },
  get pullup_bar() { return t('student.equipmentCatalog.copy003'); },
  get db_max_20() { return t('student.equipmentCatalog.copy004'); },
  get db_max_40() { return t('student.equipmentCatalog.copy005'); },
  get db_max_40_plus() { return t('student.equipmentCatalog.copy006'); },
  get smith_machine() { return t('student.equipmentCatalog.copy007'); },
  get cable_crossover() { return t('student.equipmentCatalog.copy008'); },
  get lat_pulldown() { return t('student.equipmentCatalog.copy009'); },
  get leg_press_machine() { return t('student.equipmentCatalog.copy010'); },
  get leg_curl_extension() { return t('student.equipmentCatalog.copy011'); },
  get seated_row() { return t('student.equipmentCatalog.copy012'); },
  get landmine() { return t('student.equipmentCatalog.copy013'); },
  get seal_row() { return t('student.equipmentCatalog.copy014'); },
  get hack_squat() { return t('student.equipmentCatalog.copy015'); },
  get power_bar_stiff() { return t('student.equipmentCatalog.copy016'); },
  get deadlift_bar() { return t('student.equipmentCatalog.copy017'); },
  get safety_bar() { return t('student.equipmentCatalog.copy018'); },
  get fractional_plates() { return t('student.equipmentCatalog.copy019'); },
  get lifting_platform() { return t('student.equipmentCatalog.copy020'); },
  get rack_pins_blocks() { return t('student.equipmentCatalog.copy021'); },
  get chains_bands() { return t('student.equipmentCatalog.copy022'); },
  get ghr() { return t('student.equipmentCatalog.copy023'); },
  get belt_squat() { return t('student.equipmentCatalog.copy024'); },
};

export function prefillEquipment(tier: GymTier): EquipmentToken[] {
  return EQUIPMENT_CATALOG.filter((item) => item.tiers.includes(tier)).map(({ token }) => token);
}

export function equipmentLabel(token: string): string {
  return Object.hasOwn(EQUIPMENT_LABELS, token) ? EQUIPMENT_LABELS[token as EquipmentToken] : token;
}
