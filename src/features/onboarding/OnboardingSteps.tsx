import { decimalInput, metricDisplay, metricStored } from '@/domain/measurement';
import { useState, useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, useColors, type Colors, radius, spacing, typography } from '@/design';
import { MEET_FEDERATIONS, parseMeetClass, formatMeetClass, meetClassTableSex, weightClassesFor, type MeetFederation } from '@/domain/meet/weight-class';
import { bodyWeightInput, bodyWeightInputFromKg, bodyWeightKgFromInput } from '@/domain/profile/body-weight';
import { t, type TranslationKey } from '@/i18n';

import {
  BENCH_GRIPS, BENCH_GRIP_LABELS, DEADLIFT_STYLES, DEADLIFT_STYLE_LABELS,
  GENDERS, GENDER_LABELS, INJURY_AREAS, INJURY_AREA_LABELS,
  SQUAT_STANCES, SQUAT_STANCE_LABELS, UNIT_PREFERENCES, UNIT_LABELS,
} from './catalog';
import {
  ChoiceGroup,
  DateWheel,
  DiscreteSlider,
  FieldLabel,
  FormInput,
  MultiChoice,
} from './controls';
import {
  estimateOneRepMax,
  onboardingDateBounds,
  type OnboardingErrorField,
  type OnboardingForm,
  type OnboardingStep,
} from './model';

type Props = {
  errorFields: ReadonlySet<OnboardingErrorField>;
  form: OnboardingForm;
  step: OnboardingStep;
  update: (patch: Partial<OnboardingForm>) => void;
};

export function BasicStep({ errorFields, form, update, profileLayout = false }: Omit<Props, 'step'> & { profileLayout?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <FieldLabel>{t('student.step1BasicsSection.copy004')}</FieldLabel>
      <ChoiceGroup
        layout={profileLayout ? 'segmented' : 'wrap'}
        choices={UNIT_PREFERENCES.map((value) => ({ value, label: UNIT_LABELS[value] }))}
        onChange={(unitPreference) => update({ unitPreference })}
        selected={form.unitPreference}
      />
      <FieldLabel>{t('student.step1BasicsSection.copy001')}</FieldLabel>
      <ChoiceGroup
        layout={profileLayout ? 'row' : 'wrap'}
        choices={GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }))}
        error={errorFields.has('gender')}
        onChange={(gender) => update({ gender })}
        selected={form.gender}
      />
      <FieldLabel>{t('student.step1BasicsSection.copy007')}</FieldLabel>
      <View style={errorFields.has('birthDate') && styles.dateError}>
        <DateWheel {...onboardingDateBounds().birth} onChange={(birthDate) => update({ birthDate })} value={form.birthDate} />
      </View>
      <BodyMeasurementsSection stacked={profileLayout} errorFields={errorFields} form={form} update={update} />
    </View>
  );
}

export function BodyMeasurementsSection({ errorFields, form, update, stacked = false }: Omit<Props, 'step'> & { stacked?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const imperial = form.unitPreference === 'lb';
  const [heightText, setHeightText] = useState(() => metricDisplay(form.heightCm, 0.3937007874));
  return (
    <View style={stacked ? styles.section : styles.twoColumns}>
      <View style={!stacked && styles.column}>
        <FieldLabel>{t('student.step1BasicsSection.copy002')}{!stacked && `(${imperial ? 'in' : 'cm'})`}</FieldLabel>
        <View style={stacked && styles.measurementRow}>
          <FormInput
            style={stacked && styles.measurementInput}
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
          {stacked ? <Text style={styles.measurementUnit}>{imperial ? 'in' : 'cm'}</Text> : null}
        </View>
      </View>
      <View style={!stacked && styles.column}><WeightSection labelKey="student.step1BasicsSection.copy003" stacked={stacked} errorFields={errorFields} form={form} update={update} /></View>
    </View>
  );
}


export function WeightSection({ errorFields, form, update, stacked = true, showHelp = false, labelKey = 'student.rn.weight.label' }: Omit<Props, 'step'> & { stacked?: boolean; showHelp?: boolean; labelKey?: TranslationKey }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const unit = form.unitPreference === 'lb' ? 'lb' : 'kg';
  const [text, setText] = useState(() => bodyWeightInputFromKg(form.weightKg, unit));
  return <>
    <FieldLabel>{t(labelKey)}{!stacked && `(${unit})`}</FieldLabel>
    <View style={stacked && styles.measurementRow}>
      <FormInput style={stacked && styles.measurementInput} error={errorFields.has('weightKg')}
        onBlur={() => setText(bodyWeightInputFromKg(form.weightKg, unit))}
        keyboardType="decimal-pad" placeholder={unit === 'lb' ? '183' : '83'} value={text}
        onChangeText={(value) => {
          const filtered = bodyWeightInput(value);
          setText(filtered);
          update({ weightKg: bodyWeightKgFromInput(filtered, unit) });
        }} />
      {stacked ? <Text style={styles.measurementUnit}>{unit}</Text> : null}
    </View>
    {showHelp ? <Text style={styles.help}>{t('student.rn.bodyWeight.precision')}</Text> : null}
  </>;
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

function AdditionalStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.section}>
    <InjuriesSection form={form} update={update} errorFields={errorFields} />
    <CompetitionSection form={form} update={update} errorFields={errorFields} />
    <FieldLabel>{t('student.step7ExtrasSection.copy009')}</FieldLabel>
    <NoteSection form={form} update={update} />
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

export function NoteSection({ form, update }: Pick<Props, 'form' | 'update'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <FormInput multiline onChangeText={(noteToCoach) => update({ noteToCoach })} placeholder={t('student.step7ExtrasSection.copy010')} style={styles.textArea} value={form.noteToCoach} />;
}

export function CompetitionSection({ errorFields, form, update, profileLayout = false }: Omit<Props, 'step'> & { profileLayout?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const parsed = parseMeetClass(form.targetWeightClass);
  const [federation, setFederation] = useState<MeetFederation | null>(() => parsed?.federation ?? null);
  const [sex, setSex] = useState(() => meetClassTableSex(parsed?.federation, parsed?.weightClass, form.gender));
  const [legacy] = useState(() => !parsed ? form.targetWeightClass : '');
  const expanded = profileLayout || form.isCompeting === true;
  const classes = federation ? weightClassesFor(federation, sex) : [];
  const selectedClass = parsed?.federation === federation ? parsed?.weightClass : null;
  const remove = () => { setFederation(null); update({ isCompeting: false, competitionDate: '', targetWeightClass: '' }); };
  return <>
    {!profileLayout ? <View style={styles.meetHeading}>
      <FieldLabel>{t('student.rn.meet.title')}</FieldLabel>
      {expanded ? <Pressable accessibilityRole="button" onPress={remove}><Text style={styles.link}>{t('student.rn.meet.removeAction')}</Text></Pressable> : null}
    </View> : null}
    {!expanded ? <>
      <Pressable accessibilityRole="button" style={styles.addMeet} onPress={() => update({ isCompeting: true, competitionDate: form.competitionDate || onboardingDateBounds().competition.minDate })}>
        <Text style={styles.addMeetText}>+ {t('student.rn.meet.addOptional')}</Text>
      </Pressable>
      <Text style={styles.help}>{t('student.rn.meet.help')}</Text>
    </> : <>
      <FieldLabel error={errorFields.has('competitionDate')}>{t('student.step7ExtrasSection.copy011')}</FieldLabel>
      <View style={errorFields.has('competitionDate') && styles.dateError}>
        <DateWheel {...onboardingDateBounds().competition} onChange={(competitionDate) => update({ competitionDate })} value={form.competitionDate} />
      </View>
      <FieldLabel error={!federation && errorFields.has('federation')}>{t('student.rn.meet.federation')}</FieldLabel>
      {legacy ? <Text accessibilityLabel={t('student.rn.meet.previous', [legacy])} style={styles.help}>{t('student.rn.meet.previous', [''])}<Text style={{ ...typography.monoLabel, color: colors.textPrimary }}>{legacy}</Text></Text> : null}
      <ChoiceGroup layout="row" appearance="meet" choices={MEET_FEDERATIONS.map(value => ({ value, label: value }))} selected={federation}
        onChange={(value) => { if (value !== federation) { setFederation(value); update({ targetWeightClass: '' }); } }} />
      {federation ? <>
        <View style={styles.meetHeading}>
          <FieldLabel error={!selectedClass && errorFields.has('weightClass')}>{t('student.rn.meet.weightClass')}</FieldLabel>
          {form.gender !== 'male' && form.gender !== 'female' ? <ChoiceGroup layout="segmented" choices={[{ value: 'male', label: t('student.rn.meet.men') }, { value: 'female', label: t('student.rn.meet.women') }]} selected={sex}
            onChange={(value) => { setSex(value); if (selectedClass && !weightClassesFor(federation, value).includes(selectedClass)) update({ targetWeightClass: '' }); }} /> : null}
        </View>
        {Array.from({ length: Math.ceil(classes.length / 4) }, (_, index) => <ChoiceGroup key={index} columns={4} layout="row" appearance="meet"
          choices={classes.slice(index * 4, index * 4 + 4).map(value => ({ value, label: `${value} kg` }))} selected={selectedClass}
          onChange={(value) => update({ targetWeightClass: formatMeetClass(federation, value) })} />)}
      </> : null}
    </>}
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
      return <AdditionalStep {...props} />;
  }
}

const createStyles = (colors: Colors) => StyleSheet.create({
  meetHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  addMeet: { borderStyle: 'dashed', borderWidth: spacing.point1, borderColor: colors.borderStrong, borderRadius: radius.control, padding: spacing.base, alignItems: 'center' },
  addMeetText: { color: colors.goldText, ...typography.bodyEmphasis },
  section: { gap: spacing.md },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1 },
  measurementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  measurementInput: { flex: 1, minWidth: 0 },
  measurementUnit: { color: colors.textSecondary, ...typography.bodyEmphasis },
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
  textArea: { minHeight: 104, textAlignVertical: 'top' },
  dateError: { borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1 },
});
