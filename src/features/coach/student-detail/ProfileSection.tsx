import { View } from 'react-native';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import { Card, useColors } from '@/design';
import { localDate } from '@/domain/coach/detail-week';
import { t, type TranslationKey } from '@/i18n';
import { Capsule, Copy, SectionCard, styles } from './components';
import { dateText, deviceLocale } from './presentation';

const equipment: Record<string, TranslationKey> = {
  barbell_dumbbell: 'coach.bind.equipment.barbellDumbbell', squat_bench_rack: 'coach.bind.equipment.squatBenchRack', pullup_bar: 'coach.bind.equipment.pullupBar',
  db_max_20: 'coach.bind.equipment.dbMax20', db_max_40: 'coach.bind.equipment.dbMax40', db_max_40_plus: 'coach.bind.equipment.dbMax40Plus',
  smith_machine: 'coach.bind.equipment.smithMachine', cable_crossover: 'coach.bind.equipment.cableCrossover', lat_pulldown: 'coach.bind.equipment.latPulldown',
  leg_press_machine: 'coach.bind.equipment.legPress', leg_curl_extension: 'coach.bind.equipment.legCurlExtension', seated_row: 'coach.bind.equipment.seatedRow',
  landmine: 'coach.bind.equipment.landmine', seal_row: 'coach.bind.equipment.sealRow', hack_squat: 'coach.bind.equipment.hackSquat', power_bar_stiff: 'coach.bind.equipment.powerBar',
  deadlift_bar: 'coach.bind.equipment.deadliftBar', safety_bar: 'coach.bind.equipment.safetyBar', fractional_plates: 'coach.bind.equipment.fractionalPlates', lifting_platform: 'coach.bind.equipment.liftingPlatform',
  rack_pins_blocks: 'coach.bind.equipment.rackPinsBlocks', chains_bands: 'coach.bind.equipment.chainsBands', ghr: 'coach.bind.equipment.ghr', belt_squat: 'coach.bind.equipment.beltSquat',
  reverse_hyper: 'coach.bind.equipment.reverseHyper', heavy_dumbbells: 'coach.bind.equipment.heavyDumbbells', blocks_chains_bands: 'coach.bind.equipment.blocksChainsBands', cable_lat_pulldown: 'coach.bind.equipment.cableLatPulldown',
};
const focus: Record<string, TranslationKey> = {
  tibialis: 'coach.planning.common.other', trap: 'coach.planning.common.other', mobility: 'coach.planning.common.other', cardio: 'coach.planning.common.other', grip: 'coach.planning.common.other',
  chest: 'coach.planning.muscle.chest',
  shoulder: 'coach.planning.muscle.shoulder',
  back: 'coach.planning.muscle.back',
  biceps: 'coach.planning.muscle.biceps',
  triceps: 'coach.planning.muscle.triceps',
  forearm: 'coach.planning.muscle.forearm',
  core: 'coach.planning.muscle.core',
  quad: 'coach.planning.muscle.quadriceps',
  hamstring: 'coach.planning.muscle.hamstrings',
  glute: 'coach.planning.muscle.glutes',
  hip: 'coach.planning.muscle.hip',
  hip_flexor: 'coach.planning.muscle.hip',
  adductor: 'coach.planning.muscle.adductors',
  calf: 'coach.planning.muscle.calves',
};
const gym: Record<string, TranslationKey> = { home_with_rack: 'coach.bind.gym.homeWithRack', commercial: 'coach.bind.gym.commercial', professional: 'coach.bind.gym.professional' };
const injury: Record<string, TranslationKey> = { shoulder: 'coach.bind.injury.shoulder', elbow: 'coach.bind.injury.elbow', wrist: 'coach.bind.injury.wrist', lower_back: 'coach.bind.injury.lowerBack', hip: 'coach.bind.injury.hip', knee: 'coach.bind.injury.knee', ankle: 'coach.bind.injury.ankle', other: 'coach.bind.injury.other' };
const gender: Record<string, TranslationKey> = { male: 'coach.bind.gender.male', female: 'coach.bind.gender.female', other: 'coach.bind.gender.other' };
const label = (value: string | null, keys: Record<string, TranslationKey>) => value == null ? null : keys[value] ? t(keys[value]) : value;
const join = (values: (string | null | undefined)[]) => values.filter(Boolean).join(' · ') || null;

export function ProfileSection({ profile: p, now }: { profile: OnboardingProfile; now: Date }) {
  const colors = useColors();
  const decimal = (value: string | null) => value == null ? t('coach.profile.notProvided') : new Intl.NumberFormat(deviceLocale(), { maximumFractionDigits: 2 }).format(Number(value));
  const birth = p.birth_date ? localDate(p.birth_date) : null;
  const age = birth ? now.getFullYear() - birth.getFullYear() - (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0) : null;
  const years = p.training_years;
  const training = years == null ? null : years <= 0 ? t('coach.bind.training.lessThanOne') : years >= 10 ? t('coach.bind.training.tenPlus') : t('coach.bind.training.years %lld', [years]);
  const rows: { key: TranslationKey; value: string | null; mono?: boolean; size?: number }[] = [
    { key: 'coach.profile.basicInfo', value: join([label(p.gender, gender), age != null && age >= 0 ? t('coach.profile.age', [age]) : null, p.height_cm != null ? `${decimal(p.height_cm)} cm` : null, p.weight_kg != null ? `${decimal(p.weight_kg)} kg` : null]) },
    { key: 'coach.profile.weightClass', value: p.target_weight_class },
    { key: 'coach.profile.trainingHistory', value: join([training, p.training_days?.length ? t('coach.profile.weeklyFrequency %lld', [p.training_days.length]) : null]) },
    { key: 'coach.profile.trainingEnvironment', value: join([label(p.gym_tier, gym), ...(p.equipment_overrides ?? []).map((value) => label(value, equipment))]) },
    { key: 'coach.profile.targetMeet', value: p.is_competing ? join([p.competition_date ? dateText(localDate(p.competition_date), true) : null, p.target_weight_class]) : null },
    { key: 'coach.profile.focus', value: join([...new Set((p.muscle_groups_to_strengthen ?? []).map((value) => label(value, focus)))]) },
    { key: 'coach.profile.injuryHistory', value: join([...(p.injury_areas ?? []).map((value) => label(value, injury)), p.injury_notes]) },
    { key: 'coach.profile.diet', value: null },
    { key: 'coach.profile.studentSaid', value: p.note_to_coach ? `「${p.note_to_coach}」` : null, size: 14 },
    { key: 'coach.profile.joinedAt', value: dateText(new Date(p.created_at), true), mono: true },
  ];
  return <View style={styles.stack}>
    <SectionCard><View style={styles.between}><Copy size={11} bold tone="gold500" style={{ flex: 1 }}>{t('coach.profile.currentOneRM')}</Copy><Capsule label={t('coach.profile.edit')} disabled hint={t('coach.profile.editUnavailable')} /></View>
      <Copy mono size={17} bold>{`S:${decimal(p.squat_1rm_kg)}　B:${decimal(p.bench_1rm_kg)}　D:${decimal(p.deadlift_1rm_kg)} (kg)`}</Copy>
      <Copy size={12} tone="textTertiary">{t('coach.profile.oneRMExplanation')}</Copy>
    </SectionCard>
    <Copy mono size={12} tone="textTertiary" style={{ marginTop: 12 }}>{t('coach.profile.registrationAnswers')}</Copy>
    <Card style={{ paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>{rows.map((row) => <View key={row.key} style={{ paddingHorizontal: 16, paddingVertical: 13, gap: 4, borderTopWidth: 1, borderColor: colors.borderHairline }}>
      <Copy size={11} tone="textTertiary">{t(row.key)}</Copy><Copy size={row.size ?? 15} bold mono={row.mono} style={{ lineHeight: 22 }}>{row.value ?? t('coach.profile.notProvided')}</Copy>
    </View>)}</Card>
  </View>;
}
