import { t, type TranslationKey } from '@/i18n';

const key = (name: string) => `student.quickLog22.${name}` as TranslationKey;

/** Build 22 quick-log copy; English is the approved Global copy, Chinese mirrors iOS quickLog. */
export const training22 = {
  get entry() { return t(key('entry')); },
  title: (day: string) => t(key('title'), [day]),
  get history() { return t(key('history')); },
  get back() { return t(key('back')); },
  get date() { return t(key('date')); },
  get today() { return t(key('today')); },
  get done() { return t(key('done')); },
  get next() { return t(key('next')); },
  sync: (count: number) => t(key('sync'), [count]),
  get auto() { return t(key('auto')); },
  get weight() { return t(key('weight')); },
  get reps() { return t(key('reps')); },
  get include() { return t(key('include')); },
  get skipped() { return t(key('skipped')); },
  get restore() { return t(key('restore')); },
  count: (count: number, total: number) => t(key('count'), [count, total]),
  summary: (exercises: number, sets: number) => t(key('summary'), [exercises, sets]),
  get empty() { return t(key('empty')); },
  get hold() { return t(key('hold')); },
  get saving() { return t(key('saving')); },
  partial: (saved: number, remaining: number) => t(key('partial'), [saved, remaining]),
  get completionFailed() { return t(key('completionFailed')); },
  get invalid() { return t(key('invalid')); },
  get locked() { return t(key('locked')); },
  saved: (day: string) => t(key('saved'), [day]),
  get previousMonth() { return t(key('previousMonth')); },
  get nextMonth() { return t(key('nextMonth')); },
  includeSet: (set: number) => t(key('includeSet'), [set]),
  field: (field: 'weight' | 'reps' | 'rpe') => t(key(`field.${field}`)),
  cell: (exercise: string, set: number, field: 'weight' | 'reps' | 'rpe', value: string) =>
    t(key('cell'), [exercise, set, t(key(`field.${field}`)), value]),
  padContext: (set: number, field: 'weight' | 'reps' | 'rpe' | 'rir') => t(key('padContext'), [set, field === 'rir' ? 'RIR' : t(key(`field.${field}`))]),
};
