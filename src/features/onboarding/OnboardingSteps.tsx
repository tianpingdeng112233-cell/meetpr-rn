import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, colors, radius, spacing, typography } from '@/design';

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
  const imperial = form.unitPreference === 'lb';
  const [heightText, setHeightText] = useState(() => metricDisplay(form.heightCm, 0.3937007874));
  const [weightText, setWeightText] = useState(() => metricDisplay(form.weightKg, 2.2046226218));
  return (
    <View style={styles.section}>
      <FieldLabel>单位</FieldLabel>
      <ChoiceGroup
        choices={UNIT_PREFERENCES.map((value) => ({ value, label: UNIT_LABELS[value] }))}
        onChange={(unitPreference) => update({ unitPreference })}
        selected={form.unitPreference}
      />
      <FieldLabel>性别</FieldLabel>
      <ChoiceGroup
        choices={GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }))}
        error={errorFields.has('gender')}
        onChange={(gender) => update({ gender })}
        selected={form.gender}
      />
      <FieldLabel>生日</FieldLabel>
      <View style={errorFields.has('birthDate') && styles.dateError}>
        <DateWheel {...onboardingDateBounds().birth} onChange={(birthDate) => update({ birthDate })} value={form.birthDate} />
      </View>
      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <FieldLabel>身高({imperial ? 'in' : 'cm'})</FieldLabel>
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
          <FieldLabel>体重({imperial ? 'lb' : 'kg'})</FieldLabel>
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
    </View>
  );
}

function BackgroundStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const yearsLabel =
    form.trainingYears === 0
      ? '<1 年'
      : form.trainingYears === 10
        ? '10+ 年'
        : `${form.trainingYears} 年`;
  return (
    <View style={styles.section}>
      <FieldLabel>训练年限 · {yearsLabel}</FieldLabel>
      <DiscreteSlider max={10} min={0} onChange={(trainingYears) => update({ trainingYears })} value={form.trainingYears} />
      <FieldLabel>深蹲杠位</FieldLabel>
      <ChoiceGroup
        choices={SQUAT_STANCES.map((value) => ({ value, label: SQUAT_STANCE_LABELS[value] }))}
        error={errorFields.has('squatStance')}
        onChange={(squatStance) => update({ squatStance })}
        selected={form.squatStance}
      />
      <FieldLabel>硬拉</FieldLabel>
      <ChoiceGroup
        choices={DEADLIFT_STYLES.map((value) => ({ value, label: DEADLIFT_STYLE_LABELS[value] }))}
        error={errorFields.has('deadliftStyle')}
        onChange={(deadliftStyle) => update({ deadliftStyle })}
        selected={form.deadliftStyle}
      />
      <FieldLabel>卧推握距(选填)</FieldLabel>
      <ChoiceGroup
        choices={BENCH_GRIPS.map((value) => ({ value, label: BENCH_GRIP_LABELS[value] }))}
        onChange={(benchGrip) => update({ benchGrip })}
        selected={form.benchGrip}
      />
      {form.benchGrip ? (
        <Pressable onPress={() => update({ benchGrip: null })}>
          <Text style={styles.link}>跳过此项</Text>
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
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState(8);
  const estimate = estimateOneRepMax(Number(weight), Number(reps), rpe);
  const conservativeEstimate = estimateOneRepMax(Number(weight), Number(reps), rpe, true);
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>用近期训练估算 1RM</Text>
          <Pressable onPress={onClose}><Text style={styles.link}>关闭</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <FieldLabel>重量(kg)</FieldLabel>
          <FormInput keyboardType="decimal-pad" onChangeText={(v) => setWeight(decimalInput(v))} value={weight} />
          <FieldLabel>次数</FieldLabel>
          <FormInput keyboardType="number-pad" onChangeText={(v) => setReps(v.replace(/\D/g, ''))} value={reps} />
          <FieldLabel>RPE · {rpe.toFixed(1)}</FieldLabel>
          <DiscreteSlider max={10} min={6} onChange={setRpe} step={0.5} value={rpe} />
          <Text style={styles.help}>
            RPE = 这组做完有多吃力:10=力竭、9=还能多做 1 次、8=还能多做 2 次。
          </Text>
          {estimate === null ? (
            <Text style={styles.empty}>输入重量与次数后显示估算结果</Text>
          ) : (
            <>
              <Text style={styles.estimate}>估算 1RM ≈ {estimate} kg</Text>
              <AppButton label="填入估算值" onPress={() => onFill(String(estimate))} />
              <AppButton
                label={`保守填入 90% (${conservativeEstimate} kg)`}
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
          <Text style={styles.calculatorText}>🧮 估算器</Text>
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
  return (
    <View style={styles.section}>
      <Text style={styles.warning}>⚠️ 1RM 一旦填写,完成后只有教练能改</Text>
      <LiftingInput error={errorFields.has('squat1RMKg')} field="squat1RMKg" form={form} label="深蹲" update={update} />
      <LiftingInput error={errorFields.has('bench1RMKg')} field="bench1RMKg" form={form} label="卧推" update={update} />
      <LiftingInput error={errorFields.has('deadlift1RMKg')} field="deadlift1RMKg" form={form} label="硬拉" update={update} />
    </View>
  );
}

function EnvironmentStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  const legacyEquipment = form.equipmentOverrides.filter((token) => !EQUIPMENT_CATALOG.some((item) => item.token === token));
  const chooseGym = (gymTier: NonNullable<OnboardingForm['gymTier']>) => {
    if (gymTier === form.gymTier) return;
    const apply = () => update({ gymTier, equipmentOverrides: prefillEquipment(gymTier) });
    if (form.gymTier) {
      Alert.alert('切换场馆类型?', undefined, [
        { text: '取消', style: 'cancel' },
        { text: '切换并重置器械清单', onPress: apply },
      ]);
    } else apply();
  };
  return (
    <View style={styles.section}>
      <FieldLabel>每周哪几天能练?</FieldLabel>
      <MultiChoice
        choices={TRAINING_DAYS.map((day, index) => ({ label: TRAINING_DAY_LABELS[day], value: String(index + 1) }))}
        error={errorFields.has('trainingDays')}
        max={6}
        onChange={(days) => update({ trainingDays: days.map(Number).sort() })}
        selected={form.trainingDays.map(String)}
      />
      {form.trainingDays.length < 2 ? (
        <Text style={styles.error}>已选 {form.trainingDays.length} 天/周 — 至少选 2 天</Text>
      ) : (
        <Text style={styles.help}>已选 {form.trainingDays.length} 天/周</Text>
      )}
      <FieldLabel>训练场馆</FieldLabel>
      <ChoiceGroup error={errorFields.has('gymTier')} choices={GYM_TIERS.map((value) => ({ value, label: GYM_TIER_LABELS[value], subtitle: GYM_TIER_SUBTITLES[value] }))} onChange={chooseGym} selected={form.gymTier} />
      {form.gymTier ? (
        <Card style={styles.equipmentCard}>
          <FieldLabel>器械微调</FieldLabel>
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

function RecoveryStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  return (
    <View style={styles.section}>
      <Scale
        error={errorFields.has('dailyLifeIntensity')}
        footnote="按身体消耗选择 — 久坐 ≠ 低消耗,也请考虑通勤和站立时间。"
        labels={['轻松', '很累']}
        onChange={(dailyLifeIntensity) => update({ dailyLifeIntensity })}
        title="学习/工作强度"
        value={form.dailyLifeIntensity}
      />
      <Scale error={errorFields.has('lifeStress')} labels={['很低', '很高']} onChange={(lifeStress) => update({ lifeStress })} title="生活压力" value={form.lifeStress} />
      <Scale
        error={errorFields.has('recoverySpeed')}
        footnote="按训练后恢复到正常状态所需时间选择,拿不准就选 3。"
        labels={['很快', '很慢']}
        onChange={(recoverySpeed) => update({ recoverySpeed })}
        title="练后恢复时长"
        value={form.recoverySpeed}
      />
      <Scale error={errorFields.has('sleepHours')} labels={['≤5h', '9h+']} onChange={(sleepHours) => update({ sleepHours })} title="睡眠时长" value={form.sleepHours} />
    </View>
  );
}

function MaterialsStep({ form, update }: Omit<Props, 'step' | 'errorFields'>) {
  return (
    <View style={styles.section}>
      {['上传训练视频', '上传训练资料'].map((title) => (
        <Card key={title} style={styles.disabledUpload}>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.disabledText}>即将开放</Text>
        </Card>
      ))}
      <FieldLabel>想增强的肌群(最多 3 个,可选)</FieldLabel>
      <MultiChoice choices={MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_GROUP_LABELS[value] }))} max={3} onChange={(muscleGroupsToStrengthen) => update({ muscleGroupsToStrengthen })} selected={form.muscleGroupsToStrengthen} />
    </View>
  );
}

function AdditionalStep({ errorFields, form, update }: Omit<Props, 'step'>) {
  return (
    <View style={styles.section}>
      <FieldLabel>伤病记录</FieldLabel>
      <FormInput
        multiline
        onChangeText={(injuryNotes) => update({ injuryNotes })}
        placeholder="如:左肩撞击综合征,深蹲低杠位时疼"
        style={styles.textArea}
        value={form.injuryNotes}
      />
      <FieldLabel>伤病部位</FieldLabel>
      <MultiChoice choices={INJURY_AREAS.map((value) => ({ value, label: INJURY_AREA_LABELS[value] }))} max={8} onChange={(injuryAreas) => update({ injuryAreas })} selected={form.injuryAreas} />
      <FieldLabel>是否在备赛?</FieldLabel>
      <ChoiceGroup
        choices={[
          { label: '没有', value: 'no' },
          { label: '有比赛计划', value: 'yes' },
        ]}
        error={errorFields.has('isCompeting')}
        onChange={(value) => update({ isCompeting: value === 'yes' })}
        selected={form.isCompeting === null ? null : form.isCompeting ? 'yes' : 'no'}
      />
      {form.isCompeting ? (
        <>
          <FieldLabel>比赛日期</FieldLabel>
          <View style={errorFields.has('competitionDate') && styles.dateError}>
            <DateWheel
              {...onboardingDateBounds().competition}
              onChange={(competitionDate) => update({ competitionDate })}
              value={form.competitionDate}
            />
          </View>
          <FieldLabel>目标体重级别</FieldLabel>
          <FormInput onChangeText={(targetWeightClass) => update({ targetWeightClass })} placeholder="例:IPF 83kg / WP -82.5kg" value={form.targetWeightClass} />
        </>
      ) : null}
      <FieldLabel>想对教练说什么?(可选)</FieldLabel>
      <FormInput multiline onChangeText={(noteToCoach) => update({ noteToCoach })} placeholder="目标、习惯、顾虑都可以写" style={styles.textArea} value={form.noteToCoach} />
    </View>
  );
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

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1 },
  link: { color: colors.fgPrimary, paddingVertical: spacing.sm, ...typography.bodyEmphasis },
  help: { color: colors.fgSecondary, lineHeight: 20, ...typography.footnote },
  empty: { color: colors.fgTertiary, paddingVertical: spacing.xl, textAlign: 'center', ...typography.body },
  warning: { color: colors.brandRed, lineHeight: 22, ...typography.bodyEmphasis },
  error: { color: colors.brandRed, ...typography.footnote },
  liftCard: { gap: spacing.md, padding: spacing.base },
  liftRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  liftInput: { flex: 1 },
  calculator: { backgroundColor: colors.brandRedSoft, borderColor: colors.brandRed, borderRadius: radius.md, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  calculatorText: { color: colors.brandRed, ...typography.bodyEmphasis },
  modalRoot: { backgroundColor: colors.bg, flex: 1 },
  modalHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing.base },
  modalTitle: { color: colors.fgPrimary, ...typography.headline },
  modalContent: { gap: spacing.md, padding: spacing.base },
  estimate: { color: colors.fgPrimary, paddingVertical: spacing.lg, textAlign: 'center', ...typography.title2 },
  equipmentCard: { gap: spacing.md, padding: spacing.base },
  disabledUpload: { gap: spacing.sm, opacity: 0.55, padding: spacing.base },
  uploadTitle: { color: colors.fgSecondary, ...typography.bodyEmphasis },
  disabledText: { color: colors.fgTertiary, ...typography.footnote },
  textArea: { minHeight: 104, textAlignVertical: 'top' },
  dateError: { borderColor: colors.brandRed, borderRadius: radius.md, borderWidth: 1 },
});
