import { t } from '@/i18n';

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { onboardingRepository } from '@/api/domains/onboarding';

import { equipmentLabel, GYM_TIER_LABELS, prefillEquipment, UNIT_LABELS } from '../catalog';
import { DateWheel, DiscreteSlider, sliderValueAt } from '../controls';
import { createEmptyOnboardingForm, type OnboardingForm } from '../model';
import { OnboardingStepContent } from '../OnboardingSteps';
import { OnboardingWizard } from '../OnboardingWizard';
import { onboardingDraftStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
jest.mock('@react-native-community/netinfo', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-community/netinfo/jest/netinfo-mock');
});

const STUDENT_ID = '10000000-0000-4000-8000-000000000000';
let renderer: ReactTestRenderer;

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

function press(label: string) {
  const button = renderer.root.findAll((node) => typeof node.props.onPress === 'function').find((node) =>
    node.findAllByType(Text).some((text) => text.props.children === label),
  );
  expect(button).toBeDefined();
  button!.props.onPress();
}

test('reopening the wizard hides the old form until the draft is loaded', async () => {
  const props = { onCompleted: jest.fn(), onExit: jest.fn(), profile: null, studentId: STUDENT_ID };
  await act(async () => {
    renderer = create(<OnboardingWizard {...props} visible />);
  });
  expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
  act(() => renderer.update(<OnboardingWizard {...props} visible={false} />));

  let finishRead!: (raw: string | null) => void;
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((resolve) => {
    finishRead = resolve;
  }));
  await act(async () => renderer.update(<OnboardingWizard {...props} visible />));
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  await act(async () => finishRead(null));
  expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
});

test('Android wizard back saves the draft and exits only after the save completes', async () => {
  let finishSave!: () => void;
  jest.spyOn(onboardingRepository, 'upsert').mockImplementation(() => new Promise((resolve) => {
    finishSave = () => resolve({} as Awaited<ReturnType<typeof onboardingRepository.upsert>>);
  }));
  const onExit = jest.fn();
  await act(async () => {
    renderer = create(<OnboardingWizard onCompleted={jest.fn()} onExit={onExit} profile={null} studentId={STUDENT_ID} visible />);
  });
  act(() => renderer.root.findAllByType(TextInput)[0].props.onChangeText('181'));
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  expect((await onboardingDraftStorage.read(STUDENT_ID))?.form.heightCm).toBe('181');
  expect(onExit).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  await act(async () => finishSave());
  expect(onExit).toHaveBeenCalledTimes(1);
});

test('Android estimator back closes the estimator without changing the lift', () => {
  const update = jest.fn();
  act(() => {
    renderer = create(<OnboardingStepContent errorFields={new Set()} form={createEmptyOnboardingForm()} step={3} update={update} />);
  });
  act(() => press(t('student.step3StrengthSection.copy005', ['🧮'])));
  expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
  expect(update).not.toHaveBeenCalled();
});

test('equipment sections show the full catalog and dumbbell limits are mutually exclusive', () => {
  let selected: OnboardingForm;
  function Environment() {
    const [form, setForm] = useState<OnboardingForm>({
      ...createEmptyOnboardingForm(), gymTier: 'home_with_rack',
      equipmentOverrides: prefillEquipment('home_with_rack'),
    });
    selected = form;
    return <OnboardingStepContent errorFields={new Set()} form={form} step={4} update={(patch) => setForm((current) => ({ ...current, ...patch }))} />;
  }
  act(() => { renderer = create(<Environment />); });
  const copy = renderer.root.findAllByType(Text).map((node) => node.props.children);
  expect(copy).toEqual(expect.arrayContaining([t('student.step4EnvironmentSection.copy014'), t('student.step4EnvironmentSection.copy015'), t('student.step4EnvironmentSection.copy017'), t('student.step4EnvironmentSection.copy018'), t('student.equipmentCatalog.copy004'), t('student.equipmentCatalog.copy006')]));
  // iOS shows every catalog item in each group; tiers only drive the prefill.
  expect(copy).toContain(t('student.equipmentCatalog.copy005'));
  expect(copy).toContain(equipmentLabel('smith_machine'));
  expect(copy).toContain(equipmentLabel('deadlift_bar'));
  act(() => press(t('student.equipmentCatalog.copy006')));
  expect(selected!.equipmentOverrides).toEqual(['barbell_dumbbell', 'squat_bench_rack', 'pullup_bar', 'db_max_40_plus']);
  act(() => press(t('student.equipmentCatalog.copy004')));
  expect(selected!.equipmentOverrides).toEqual(['barbell_dumbbell', 'squat_bench_rack', 'pullup_bar', 'db_max_20']);
});


test('canonical drafts round-trip while obsolete units and gym tiers read as null', async () => {
  const draft = { form: createEmptyOnboardingForm(), savedAt: '2026-09-04T10:00:00Z' };
  await onboardingDraftStorage.write(STUDENT_ID, draft);
  expect(await onboardingDraftStorage.read(STUDENT_ID)).toEqual(draft);
  for (const invalid of [{ unitPreference: 'metric' }, { unitPreference: 'imperial' }, { gymTier: 'home' }, { gymTier: 'powerlifting' }]) {
    await AsyncStorage.setItem(`meetpr.onboarding.draft.v1.${STUDENT_ID}`, JSON.stringify({
      ...draft, form: { ...draft.form, ...invalid },
    }));
    expect(await onboardingDraftStorage.read(STUDENT_ID)).toBeNull();
  }
});


test('imperial height input preserves each keystroke while storing centimeters', () => {
  let selected: OnboardingForm;
  function Basic() {
    const [form, setForm] = useState<OnboardingForm>({ ...createEmptyOnboardingForm(), unitPreference: 'lb' });
    selected = form;
    return <OnboardingStepContent errorFields={new Set()} form={form} step={1} update={(patch) => setForm((current) => ({ ...current, ...patch }))} />;
  }
  act(() => { renderer = create(<Basic />); });
  for (const [text, centimeters] of [['1', '2.5'], ['1.', '2.5'], ['7', '17.8'], ['70', '177.8'], ['70.', '177.8'], ['70.5', '179.1']]) {
    act(() => renderer.root.findAllByType(TextInput)[0].props.onChangeText(text));
    expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe(text);
    expect(selected!.heightCm).toBe(centimeters);
  }
  act(() => renderer.root.findAllByType(TextInput)[0].props.onChangeText('70.'));
  act(() => renderer.root.findAllByType(TextInput)[0].props.onBlur());
  expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('70');
  act(() => press(UNIT_LABELS.kg));
  expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('177.8');
  act(() => press(UNIT_LABELS.lb));
  expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('70');
});

test('imperial weight input preserves raw text until blur or a unit change', () => {
  let selected: OnboardingForm;
  function Basic() {
    const [form, setForm] = useState<OnboardingForm>({ ...createEmptyOnboardingForm(), unitPreference: 'lb' });
    selected = form;
    return <OnboardingStepContent errorFields={new Set()} form={form} step={1} update={(patch) => setForm((current) => ({ ...current, ...patch }))} />;
  }
  act(() => { renderer = create(<Basic />); });
  for (const [text, kilograms] of [['1', '0.45'], ['1.', '0.45'], ['70.5', '31.98']]) {
    act(() => renderer.root.findAllByType(TextInput)[1].props.onChangeText(text));
    expect(renderer.root.findAllByType(TextInput)[1].props.value).toBe(text);
    expect(selected!.weightKg).toBe(kilograms);
  }
  act(() => renderer.root.findAllByType(TextInput)[1].props.onChangeText('1.'));
  act(() => renderer.root.findAllByType(TextInput)[1].props.onBlur());
  expect(renderer.root.findAllByType(TextInput)[1].props.value).toBe('0.99');
  act(() => press(UNIT_LABELS.kg));
  expect(renderer.root.findAllByType(TextInput)[1].props.value).toBe('0.45');
  act(() => press(UNIT_LABELS.lb));
  expect(renderer.root.findAllByType(TextInput)[1].props.value).toBe('0.99');
});

test('pressing the selected gym preserves customized equipment without an alert or update', () => {
  const alert = jest.spyOn(Alert, 'alert');
  const update = jest.fn();
  const form: OnboardingForm = { ...createEmptyOnboardingForm(), gymTier: 'home_with_rack', equipmentOverrides: ['barbell_dumbbell', 'db_max_40_plus'] };
  act(() => { renderer = create(<OnboardingStepContent errorFields={new Set()} form={form} step={4} update={update} />); });
  act(() => press(GYM_TIER_LABELS.home_with_rack));
  expect(update).not.toHaveBeenCalled();
  expect(form.equipmentOverrides).toEqual(['barbell_dumbbell', 'db_max_40_plus']);
  expect(alert).not.toHaveBeenCalled();
});

test('legacy equipment survives drafts and displays its raw token until deselected', async () => {
  const draft = {
    form: { ...createEmptyOnboardingForm(), gymTier: 'home_with_rack' as const, equipmentOverrides: ['heavy_dumbbells', 'barbell_dumbbell'] },
    savedAt: '2026-09-04T10:00:00Z',
  };
  // Read through storage as well as the visible form: resuming must not lose old equipment.
  await AsyncStorage.setItem(`meetpr.onboarding.draft.v1.${STUDENT_ID}`, JSON.stringify(draft));
  const restored = await onboardingDraftStorage.read(STUDENT_ID);
  expect(restored).toEqual(draft);
  let selected: OnboardingForm;
  function Environment() {
    const [form, setForm] = useState(restored!.form);
    selected = form;
    return <OnboardingStepContent errorFields={new Set()} form={form} step={4} update={(patch) => setForm((current) => ({ ...current, ...patch }))} />;
  }
  act(() => { renderer = create(<Environment />); });
  act(() => press('heavy_dumbbells'));
  expect(selected!.equipmentOverrides).toEqual(['barbell_dumbbell']);
});

test.each([
  ['2026-09-04', '2026-09-04', [4]],
  ['2026-09-04', '2026-09-06', [4, 5, 6]],
])('DateWheel clips same-month options from %s to %s', (minDate, maxDate, days) => {
  act(() => { renderer = create(<DateWheel minDate={minDate} maxDate={maxDate} value={minDate} onChange={jest.fn()} />); });
  const wheels = renderer.root.findAllByType(ScrollView);
  const options = wheels.map((wheel) => wheel.findAllByType(Text).map((text) => text.props.children));
  expect(options).toEqual([[2026], [9], days]);
});

test.each(['2026-09-03', '2026-09-07'])('DateWheel automatically clamps out-of-range value %s', (value) => {
  const onChange = jest.fn();
  act(() => { renderer = create(<DateWheel minDate="2026-09-04" maxDate="2026-09-06" value={value} onChange={onChange} />); });
  expect(onChange).toHaveBeenCalledWith(value === '2026-09-03' ? '2026-09-04' : '2026-09-06');
});

test('Wheel centers the initial value and selects options[k] at ROW_HEIGHT times k', () => {
  const onChange = jest.fn();
  // Exercise Wheel through DateWheel, including the layout that makes offset k the middle row.
  act(() => { renderer = create(<DateWheel value="2000-01-02" onChange={onChange} />); });
  const days = renderer.root.findAllByType(ScrollView)[2];
  expect(StyleSheet.flatten(days.props.contentContainerStyle)).toMatchObject({ paddingVertical: 42 });
  expect(days.props.contentOffset).toEqual({ x: 0, y: 42 });
  for (const [k, date] of [[0, '2000-01-01'], [2, '2000-01-03'], [30, '2000-01-31']] as const) {
    act(() => days.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { y: 42 * k } } }));
    expect(onChange).toHaveBeenLastCalledWith(date);
  }
});

test('the wizard moves its fields above the keyboard on Android as well as iOS', async () => {
  await act(async () => {
    renderer = create(<OnboardingWizard onCompleted={jest.fn()} onExit={jest.fn()} profile={null} studentId={STUDENT_ID} visible />);
  });
  expect(renderer.root.findByType(KeyboardAvoidingView).props.behavior).toBe('padding');
});

test('slider positions map to the nearest mark and clamp at both ends', () => {
  // 11 marks (0–10) across 220px: centres at 10, 30, … 210.
  expect(sliderValueAt(10, 220, 0, 10, 1)).toBe(0);
  expect(sliderValueAt(30, 220, 0, 10, 1)).toBe(1);
  expect(sliderValueAt(118, 220, 0, 10, 1)).toBe(5);
  expect(sliderValueAt(-40, 220, 0, 10, 1)).toBe(0);
  expect(sliderValueAt(400, 220, 0, 10, 1)).toBe(10);
  // 9 RPE marks (6–10 by 0.5) across 180px: centres 20px apart from 10.
  expect(sliderValueAt(90, 180, 6, 10, 0.5)).toBe(8);
  expect(sliderValueAt(100, 180, 6, 10, 0.5)).toBe(8.5);
});

test('tapping or dragging across the slider updates the value as the finger moves', () => {
  const onChange = jest.fn<(value: number) => void>();
  const Harness = () => {
    const [value, setValue] = useState(1);
    return <DiscreteSlider max={10} min={0} onChange={(next) => { onChange(next); setValue(next); }} value={value} />;
  };
  act(() => { renderer = create(<Harness />); });
  const track = () => renderer.root.findAll((node) => node.type === View && typeof node.props.onResponderMove === 'function')[0];
  // 220px wide: mark centres at 10, 30, … 210.
  act(() => track().props.onLayout({ nativeEvent: { layout: { width: 220 } } }));
  let time = 0;
  let previous = 0;
  // PanResponder sums each move's delta from the previous position and ignores a timestamp it has already seen.
  const touch = (locationX: number, dx: number) => ({
    nativeEvent: { locationX, touches: [], changedTouches: [] },
    touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: ++time, touchBank: [{
      touchActive: true, startPageX: 0, startPageY: 0, startTimeStamp: 0, currentPageX: dx, currentPageY: 0,
      currentTimeStamp: time, previousPageX: [previous, previous = dx][0], previousPageY: 0, previousTimeStamp: time - 1,
    }] },
  });
  act(() => track().props.onResponderGrant(touch(70, 0)));
  act(() => track().props.onResponderMove(touch(70, 80)));
  act(() => track().props.onResponderMove(touch(70, 140)));
  expect(onChange.mock.calls.map(([value]) => value)).toEqual([3, 7, 10]);
});
