import { t } from '@/i18n';

import { useState, useMemo } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, useColors, type Colors, radius, spacing, typography } from '@/design';

import {
  BENCH_GRIPS, BENCH_GRIP_LABELS, DEADLIFT_STYLES, DEADLIFT_STYLE_LABELS,
  EQUIPMENT_CATALOG, EQUIPMENT_GROUPS, EQUIPMENT_GROUP_LABELS, equipmentLabel,
  GENDERS, GENDER_LABELS, GYM_TIERS, GYM_TIER_LABELS, GYM_TIER_SUBTITLES,
  INJURY_AREAS, INJURY_AREA_LABELS, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS,
  prefillEquipment, SQUAT_STANCES, SQUAT_STANCE_LABELS, TRAINING_DAYS,
  TRAINING_DAY_LABELS, UNIT_PREFERENCES, UNIT_LABELS,
} from './catalog';
import {
  ChoiceGroup,
  DateWheel,
  DiscreteSlider,
  FieldLabel,
  FormInput,
  MultiChoice,
  Scale,
} from './controls';
import {
  estimateOneRepMax,
  onboardingDateBounds,
  type OnboardingForm,
  type OnboardingStep,
} from './model';

type Props = {
  errorFields: ReadonlySet<keyof OnboardingForm>;
  form: OnboardingForm;
  step: OnboardingStep;
  update: (patch: Partial<OnboardingForm>) => void;
};

function decimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

function metricDisplay(value: string, factor: number): string {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(Math.round(number * factor * 10) / 10) : '';
}

function metricStored(value: string, factor: number): string {
  const number = Number(decimalInput(value));
  return Number.isFinite(number) && number > 0 ? String(Math.round((number / factor) * 10) / 10) : '';
}

function BasicStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <FieldLabel>{t('student.step1BasicsSection.copy004')}</FieldLabel>
      <ChoiceGroup
        choices={UNIT_PREFERENCES.map((value) => ({ value, label: UNIT_LABELS[value] }))}
        onChange={(unitPreference) => update({ unitPreference })}
        selected={form.unitPreference}
      />
      <FieldLabel>{t('student.step1BasicsSection.copy001')}</FieldLabel>
      <ChoiceGroup
        choices={GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }))}
        error={errorFields.has('gender')}
        onChange={(gender) => update({ gender })}
        selected={form.gender}
      />
      <FieldLabel>{t('student.step1BasicsSection.copy007')}</FieldLabel>
      <View style={errorFields.has('birthDate') && styles.dateError}>
        <DateWheel {...onboardingDateBounds().birth} onChange={(birthDate) => update({ birthDate })} value={form.birthDate} />
      </View>
      <BodyMeasurementsSection errorFields={errorFields} form={form} update={update} />
    </View>
  );
}

export function BodyMeasurementsSection({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const imperial = form.unitPreference === 'lb';
  const [heightText, setHeightText] = useState(() => metricDisplay(form.heightCm, 0.3937007874));
  const [weightText, setWeightText] = useState(() => metricDisplay(form.weightKg, 2.2046226218));
  return (
    <View style={styles.twoColumns}>
      <View style={styles.column}>
        <FieldLabel>{t('student.step1BasicsSection.copy002')}({imperial ? 'in' : 'cm'})</FieldLabel>
        <FormInput
          error={errorFields.has('heightCm')}
          keyboardType="decimal-pad"
          onBlur={() => setHeightText(metricDisplay(form.heightCm, 0.3937007874))}
          onChangeText={(value) => {
            setHeightText(value);
            update({ heightCm: imperial ? metricStored(value, 0.3937007874) : decimalInput(value) });
          }}
          placeholder={imperial ? '70' : '178'}
          value={imperial ? heightText : form.heightCm}
        />
      </View>
      <View style={styles.column}>
        <FieldLabel>{t('student.step1BasicsSection.copy003')}({imperial ? 'lb' : 'kg'})</FieldLabel>
        <FormInput
          error={errorFields.has('weightKg')}
          keyboardType="decimal-pad"
          onBlur={() => setWeightText(metricDisplay(form.weightKg, 2.2046226218))}
          onChangeText={(value) => {
            setWeightText(value);
            update({ weightKg: imperial ? metricStored(value, 2.2046226218) : decimalInput(value) });
          }}
          placeholder={imperial ? '183' : '83'}
          value={imperial ? weightText : form.weightKg}
        />
      </View>
    </View>
  );
}


export function BackgroundStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const yearsLabel =
    form.trainingYears === 0
      ? t('student.onboardingLabels.copy045')
      : form.trainingYears === 10
        ? t('student.onboardingLabels.copy046')
        : t(form.trainingYears === 1 ? 'student.onboardingLabels.copy047.one' : 'student.onboardingLabels.copy047', [form.trainingYears]);
  return (
    <View style={styles.section}>
      <FieldLabel>{t('student.step2BackgroundSection.copy003')} · {yearsLabel}</FieldLabel>
      <DiscreteSlider max={10} min={0} onChange={(trainingYears) => update({ trainingYears })} value={form.trainingYears} />
      <FieldLabel>{t('student.step2BackgroundSection.copy001')}</FieldLabel>
      <ChoiceGroup
        choices={SQUAT_STANCES.map((value) => ({ value, label: SQUAT_STANCE_LABELS[value] }))}
        error={errorFields.has('squatStance')}
        onChange={(squatStance) => update({ squatStance })}
        selected={form.squatStance}
      />
      <FieldLabel>{t('coach.planning.lift.deadlift')}</FieldLabel>
      <ChoiceGroup
        choices={DEADLIFT_STYLES.map((value) => ({ value, label: DEADLIFT_STYLE_LABELS[value] }))}
        error={errorFields.has('deadliftStyle')}
        onChange={(deadliftStyle) => update({ deadliftStyle })}
        selected={form.deadliftStyle}
      />
      <FieldLabel>{t('student.step2BackgroundSection.copy006')}</FieldLabel>
      <ChoiceGroup
        choices={BENCH_GRIPS.map((value) => ({ value, label: BENCH_GRIP_LABELS[value] }))}
        onChange={(benchGrip) => update({ benchGrip })}
        selected={form.benchGrip}
      />
      {form.benchGrip ? (
        <Pressable onPress={() => update({ benchGrip: null })}>
          <Text style={styles.link}>{t('student.step2BackgroundSection.copy007')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type LiftField = 'squat1RMKg' | 'bench1RMKg' | 'deadlift1RMKg';

function OneRMEstimator({
  onClose,
  onFill,
}: {
  onClose: () => void;
  onFill: (value: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState(8);
  const estimate = estimateOneRepMax(Number(weight), Number(reps), rpe);
  const conservativeEstimate = estimateOneRepMax(Number(weight), Number(reps), rpe, true);
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('student.step3StrengthSection.copy006')}</Text>
          <Pressable onPress={onClose}><Text style={styles.link}>{t('chat.close')}</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <FieldLabel>{t('student.step3StrengthSection.copy007')}(kg)</FieldLabel>
          <FormInput keyboardType="decimal-pad" onChangeText={(v) => setWeight(decimalInput(v))} value={weight} />
          <FieldLabel>{t('student.step3StrengthSection.copy008')}</FieldLabel>
          <FormInput keyboardType="number-pad" onChangeText={(v) => setReps(v.replace(/\D/g, ''))} value={reps} />
          <FieldLabel>RPE · {rpe.toFixed(1)}</FieldLabel>
          <DiscreteSlider max={10} min={6} onChange={setRpe} step={0.5} value={rpe} />
          <Text style={styles.help}>
            {t('student.step3StrengthSection.copy010')}
          </Text>
          {estimate === null ? (
            <Text style={styles.empty}>{t('student.step3StrengthSection.copy014')}</Text>
          ) : (
            <>
              <Text style={styles.estimate}>{t('student.step3StrengthSection.copy011', [estimate])}</Text>
              <AppButton label={t('student.step3StrengthSection.copy012')} onPress={() => onFill(String(estimate))} />
              <AppButton
                label={t('student.step3StrengthSection.copy013', [String(conservativeEstimate)])}
                onPress={() => onFill(String(conservativeEstimate))}
                variant="secondary"
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function LiftingInput({
  error,
  field,
  form,
  label,
  update,
}: {
  error: boolean;
  field: LiftField;
  form: OnboardingForm;
  label: string;
  update: Props['update'];
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  return (
    <Card style={styles.liftCard}>
      <FieldLabel>{label} 1RM(kg)</FieldLabel>
      <View style={styles.liftRow}>
        <FormInput
          error={error}
          keyboardType="decimal-pad"
          onChangeText={(value) => update({ [field]: decimalInput(value) })}
          placeholder="0"
          style={styles.liftInput}
          value={form[field]}
        />
        <Pressable onPress={() => setEstimatorOpen(true)} style={styles.calculator}>
          <Text style={styles.calculatorText}>{t('student.step3StrengthSection.copy005', ['🧮'])}</Text>
        </Pressable>
      </View>
      {estimatorOpen ? (
        <OneRMEstimator
          onClose={() => setEstimatorOpen(false)}
          onFill={(value) => {
            update({ [field]: value });
            setEstimatorOpen(false);
          }}
        />
      ) : null}
    </Card>
  );
}

function LiftsStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.warning}>{t('student.step3StrengthSection.copy001')}</Text>
      <LiftingInput error={errorFields.has('squat1RMKg')} field="squat1RMKg" form={form} label={t('coach.planning.lift.squat')} update={update} />
      <LiftingInput error={errorFields.has('bench1RMKg')} field="bench1RMKg" form={form} label={t('coach.planning.lift.benchPress')} update={update} />
      <LiftingInput error={errorFields.has('deadlift1RMKg')} field="deadlift1RMKg" form={form} label={t('coach.planning.lift.deadlift')} update={update} />
    </View>
  );
}

export function EnvironmentStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const legacyEquipment = form.equipmentOverrides.filter((token) => !EQUIPMENT_CATALOG.some((item) => item.token === token));
  const chooseGym = (gymTier: NonNullable<OnboardingForm['gymTier']>) => {
    if (gymTier === form.gymTier) return;
    const apply = () => update({ gymTier, equipmentOverrides: prefillEquipment(gymTier) });
    if (form.gymTier) {
      Alert.alert(t('student.step4EnvironmentSection.copy002'), undefined, [
        { text: t('student.step4EnvironmentSection.copy004'), style: 'cancel' },
        { text: t('student.step4EnvironmentSection.copy003'), onPress: apply },
      ]);
    } else apply();
  };
  return (
    <View style={styles.section}>
      <FieldLabel>{t('student.step4EnvironmentSection.copy001')}</FieldLabel>
      <MultiChoice
        choices={TRAINING_DAYS.map((day, index) => ({ label: TRAINING_DAY_LABELS[day], value: String(index + 1) }))}
        error={errorFields.has('trainingDays')}
        max={6}
        onChange={(days) => update({ trainingDays: days.map(Number).sort() })}
        selected={form.trainingDays.map(String)}
      />
      {form.trainingDays.length < 2 ? (
        <Text style={styles.error}>{t(form.trainingDays.length === 1 ? 'student.step4EnvironmentSection.copy006.one' : 'student.step4EnvironmentSection.copy006', [form.trainingDays.length])}</Text>
      ) : (
        <Text style={styles.help}>{t('student.step4EnvironmentSection.copy007', [form.trainingDays.length])}</Text>
      )}
      <FieldLabel>{t('student.step4EnvironmentSection.copy008')}</FieldLabel>
      <ChoiceGroup error={errorFields.has('gymTier')} choices={GYM_TIERS.map((value) => ({ value, label: GYM_TIER_LABELS[value], subtitle: GYM_TIER_SUBTITLES[value] }))} onChange={chooseGym} selected={form.gymTier} />
      {form.gymTier ? (
        <Card style={styles.equipmentCard}>
          <FieldLabel>{t('student.step4EnvironmentSection.copy012')}</FieldLabel>
          {EQUIPMENT_GROUPS.map((group) => {
            const items = EQUIPMENT_CATALOG.filter((item) => item.group === group);
            const choices = items
              .map(({ token }) => ({ value: token, label: equipmentLabel(token) }));
            const selected = form.equipmentOverrides.filter((token) =>
              items.some((item) => item.token === token),
            );
            const otherGroups = form.equipmentOverrides.filter((token) =>
              !items.some((item) => item.token === token),
            );
            return (
              <View key={group} style={styles.section}>
                <FieldLabel>{EQUIPMENT_GROUP_LABELS[group]}</FieldLabel>
                {group === 'dumbbellMax' ? (
                  <ChoiceGroup
                    choices={choices}
                    onChange={(token) => update({ equipmentOverrides: [...otherGroups, token] })}
                    selected={selected[0] ?? null}
                  />
                ) : (
                  <MultiChoice
                    choices={choices}
                    max={items.length}
                    onChange={(tokens) => update({ equipmentOverrides: [...otherGroups, ...tokens] })}
                    selected={selected}
                  />
                )}
              </View>
            );
          })}
          <MultiChoice
            choices={legacyEquipment.map((token) => ({ value: token, label: equipmentLabel(token) }))}
            max={legacyEquipment.length}
            onChange={(tokens) => update({ equipmentOverrides: form.equipmentOverrides.filter((token) => !legacyEquipment.includes(token) || tokens.includes(token)) })}
            selected={legacyEquipment}
          />
        </Card>
      ) : null}
    </View>
  );
}

export function RecoveryStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Scale
        error={errorFields.has('dailyLifeIntensity')}
        footnote={t('student.step5RecoverySection.copy002')}
        labels={[t('student.onboardingLabels.copy048'), t('student.onboardingLabels.copy052')]}
        onChange={(dailyLifeIntensity) => update({ dailyLifeIntensity })}
        title={t('student.step5RecoverySection.copy001')}
        value={form.dailyLifeIntensity}
      />
      <Scale error={errorFields.has('lifeStress')} labels={[t('student.onboardingLabels.copy048'), t('student.onboardingLabels.copy052')]} onChange={(lifeStress) => update({ lifeStress })} title={t('student.step5RecoverySection.copy003')} value={form.lifeStress} />
      <Scale
        error={errorFields.has('recoverySpeed')}
        footnote={t('student.step5RecoverySection.copy005')}
        labels={[t('student.onboardingLabels.copy054'), t('student.onboardingLabels.copy058')]}
        onChange={(recoverySpeed) => update({ recoverySpeed })}
        title={t('student.step5RecoverySection.copy004')}
        value={form.recoverySpeed}
      />
      <Scale error={errorFields.has('sleepHours')} labels={['≤5h', '9h+']} onChange={(sleepHours) => update({ sleepHours })} title={t('student.step5RecoverySection.copy006')} value={form.sleepHours} />
    </View>
  );
}

function MaterialsStep({ form, update }: Omit<Props, 'step' | 'errorFields'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      {/* iOS step 6 shows the plan-upload and big-three-video cards as coming soon. */}
      {[t('student.step6MaterialsSection.copy001'), t('student.step6MaterialsSection.copy002')].map((title) => (
        <Card key={title} style={styles.disabledUpload}>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.disabledText}>{t('student.step6MaterialsSection.copy005')}</Text>
        </Card>
      ))}
      <MusclesSection form={form} update={update} />
    </View>
  );
}

export function MusclesSection({ form, update }: Omit<Props, 'step' | 'errorFields'>) {
  return <>
      <FieldLabel>{t('student.step6MaterialsSection.copy004')}</FieldLabel>
      <MultiChoice choices={MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_GROUP_LABELS[value] }))} max={3} onChange={(muscleGroupsToStrengthen) => update({ muscleGroupsToStrengthen })} selected={form.muscleGroupsToStrengthen} />
  </>;
}

function AdditionalStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.section}>
    <InjuriesSection form={form} update={update} errorFields={errorFields} />
    <CompetitionSection form={form} update={update} errorFields={errorFields} />
      <FieldLabel>{t('student.step7ExtrasSection.copy009')}</FieldLabel>
      <FormInput multiline onChangeText={(noteToCoach) => update({ noteToCoach })} placeholder={t('student.step7ExtrasSection.copy010')} style={styles.textArea} value={form.noteToCoach} />
  </View>;
}

export function InjuriesSection({ form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <>
      <FieldLabel>{t('student.myProfileView.copy005')}</FieldLabel>
      <FormInput
        multiline
        onChangeText={(injuryNotes) => update({ injuryNotes })}
        placeholder={t('student.step7ExtrasSection.copy002')}
        style={styles.textArea}
        value={form.injuryNotes}
      />
      <FieldLabel>{t('student.step7ExtrasSection.copy003')}</FieldLabel>
      <MultiChoice choices={INJURY_AREAS.map((value) => ({ value, label: INJURY_AREA_LABELS[value] }))} max={8} onChange={(injuryAreas) => update({ injuryAreas })} selected={form.injuryAreas} />
  </>;
}

export function CompetitionSection({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <>
      <FieldLabel>{t('student.step7ExtrasSection.copy004')}</FieldLabel>
      <ChoiceGroup
        choices={[
          { label: t('student.step7ExtrasSection.copy005'), value: 'no' },
          { label: t('student.step7ExtrasSection.copy006'), value: 'yes' },
        ]}
        error={errorFields.has('isCompeting')}
        onChange={(value) => update({ isCompeting: value === 'yes' })}
        selected={form.isCompeting === null ? null : form.isCompeting ? 'yes' : 'no'}
      />
      {form.isCompeting ? (
        <>
          <FieldLabel>{t('student.step7ExtrasSection.copy011')}</FieldLabel>
          <View style={errorFields.has('competitionDate') && styles.dateError}>
            <DateWheel
              {...onboardingDateBounds().competition}
              onChange={(competitionDate) => update({ competitionDate })}
              value={form.competitionDate}
            />
          </View>
          <FieldLabel>{t('student.step7ExtrasSection.copy007')}</FieldLabel>
          <FormInput onChangeText={(targetWeightClass) => update({ targetWeightClass })} placeholder={t('student.step7ExtrasSection.copy008')} value={form.targetWeightClass} />
        </>
      ) : null}
  </>;
}

export function OnboardingStepContent(props: Props) {
  switch (props.step) {
    case 1:
      // Switching units discards raw input text and initializes it from the metric form.
      return <BasicStep key={props.form.unitPreference ?? 'unset'} {...props} />;
    case 2:
      return <BackgroundStep {...props} />;
    case 3:
      return <LiftsStep {...props} />;
    case 4:
      return <EnvironmentStep {...props} />;
    case 5:
      return <RecoveryStep {...props} />;
    case 6:
      return <MaterialsStep {...props} />;
    case 7:
      return <AdditionalStep {...props} />;
  }
}

const createStyles = (colors: Colors) => StyleSheet.create({
  section: { gap: spacing.md },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1 },
  link: { color: colors.textPrimary, paddingVertical: spacing.sm, ...typography.bodyEmphasis },
  help: { color: colors.textSecondary, lineHeight: 20, ...typography.footnote },
  empty: { color: colors.textTertiary, paddingVertical: spacing.xl, textAlign: 'center', ...typography.body },
  warning: { color: colors.danger, lineHeight: 22, ...typography.bodyEmphasis },
  error: { color: colors.danger, ...typography.footnote },
  liftCard: { gap: spacing.md, padding: spacing.base },
  liftRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  liftInput: { flex: 1 },
  calculator: { backgroundColor: colors.goldSoft, borderColor: colors.gold500, borderRadius: radius.md, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  calculatorText: { color: colors.gold500, ...typography.bodyEmphasis },
  modalRoot: { backgroundColor: colors.bgBase, flex: 1 },
  modalHeader: { alignItems: 'center', borderBottomColor: colors.borderDefault, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing.base },
  modalTitle: { color: colors.textPrimary, ...typography.headline },
  modalContent: { gap: spacing.md, padding: spacing.base },
  estimate: { color: colors.textPrimary, paddingVertical: spacing.lg, textAlign: 'center', ...typography.title2 },
  equipmentCard: { gap: spacing.md, padding: spacing.base },
  disabledUpload: { gap: spacing.sm, opacity: 0.55, padding: spacing.base },
  uploadTitle: { color: colors.textSecondary, ...typography.bodyEmphasis },
  disabledText: { color: colors.textTertiary, ...typography.footnote },
  textArea: { minHeight: 104, textAlignVertical: 'top' },
  dateError: { borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1 },
});
