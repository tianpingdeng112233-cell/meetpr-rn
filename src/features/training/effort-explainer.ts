import { t, type TranslationKey } from '@/i18n';
import type { EffortKind } from './actual-effort';

type EffortExplainer = {
  title: TranslationKey;
  subtitle: TranslationKey;
  rows: readonly { value: string; copy: TranslationKey }[];
  example: { before: TranslationKey; answer: TranslationKey } | null;
  footer: TranslationKey;
};

const explainers: Record<EffortKind, EffortExplainer> = {
  rpe: {
    title: 'training.explainer.rpe.title',
    subtitle: 'training.explainer.rpe.subtitle',
    rows: [
      { value: '10', copy: 'student.setEntryRpe.copy011' },
      { value: '9.5', copy: 'student.setEntryRpe.copy010' },
      { value: '9', copy: 'student.setEntryRpe.copy009' },
      { value: '8.5', copy: 'student.setEntryRpe.copy008' },
      { value: '8', copy: 'student.setEntryRpe.copy007' },
      { value: '7.5', copy: 'student.setEntryRpe.copy006' },
      { value: '7', copy: 'student.setEntryRpe.copy005' },
      { value: '5–6', copy: 'student.setEntryRpe.copy001' },
    ],
    example: null,
    footer: 'training.explainer.rpe.footer',
  },
  rir: {
    title: 'training.explainer.rir.title',
    subtitle: 'training.explainer.rir.subtitle',
    rows: [],
    example: { before: 'training.explainer.rir.example', answer: 'training.explainer.rir.answer' },
    footer: 'training.explainer.rir.footer',
  },
};

export function effortExplainerFor(kind: EffortKind): EffortExplainer {
  return explainers[kind];
}

/** The hint describes the entered RIR directly; it never converts to RPE. */
export function rirStepperCopy(value: string): string | null {
  if (!value.trim()) return null;
  const reps = Number(value);
  if (!Number.isInteger(reps) || reps < 0 || reps > 9) return null;
  return reps === 0 ? t('student.setEntryRpe.copy011') : t('training.explainer.rir.remaining', [reps]);
}
