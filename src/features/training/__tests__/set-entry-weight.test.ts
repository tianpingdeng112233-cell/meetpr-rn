import { describe, expect, test } from '@jest/globals';

import {
  createWeightEntryState,
  weightEntryReducer,
} from '../set-entry-weight';

const suggestion = { weightKg: 155, label: '建议 · 基于 e1RM 200' };

describe('SetEntrySheet suggestion state', () => {
  test('leaves an untouched input empty when no suggestion applies', () => {
    expect(createWeightEntryState('', null)).toMatchObject({
      weightText: '',
      activeSuggestion: null,
      userEdited: false,
    });
  });

  test('clears an auto-filled suggestion when it becomes unavailable', () => {
    const initial = createWeightEntryState('', suggestion);
    expect(
      weightEntryReducer(initial, {
        type: 'suggestionChanged',
        suggestion: null,
      }),
    ).toMatchObject({ weightText: '', activeSuggestion: null });
  });

  test('fills an asynchronously arriving suggestion until the user edits weight', () => {
    const empty = createWeightEntryState('', null);
    const arrived = weightEntryReducer(empty, {
      type: 'suggestionChanged',
      suggestion,
    });
    expect(arrived).toMatchObject({
      weightText: '155',
      activeSuggestion: suggestion,
    });

    const edited = weightEntryReducer(arrived, {
      type: 'userChanged',
      value: '157.5',
    });
    expect(
      weightEntryReducer(edited, {
        type: 'suggestionChanged',
        suggestion: { weightKg: 160, label: '新建议' },
      }),
    ).toMatchObject({ weightText: '157.5', activeSuggestion: null });
  });
});
