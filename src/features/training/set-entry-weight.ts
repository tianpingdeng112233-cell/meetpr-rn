import type { WeightSuggestion } from './model';
import { formatWeight } from './policy';

export type WeightEntryState = {
  weightText: string;
  activeSuggestion: WeightSuggestion;
  userEdited: boolean;
  suggestionApplied: boolean;
};

export type WeightEntryAction =
  | { type: 'userChanged'; value: string }
  | { type: 'suggestionChanged'; suggestion: WeightSuggestion };

export function createWeightEntryState(
  draftWeight: string,
  suggestion: WeightSuggestion,
): WeightEntryState {
  if (draftWeight) {
    return {
      weightText: draftWeight,
      activeSuggestion: null,
      userEdited: true,
      suggestionApplied: false,
    };
  }
  return {
    weightText: suggestion ? formatWeight(suggestion.weightKg) : '',
    activeSuggestion: suggestion,
    userEdited: false,
    suggestionApplied: Boolean(suggestion),
  };
}

export function weightEntryReducer(
  state: WeightEntryState,
  action: WeightEntryAction,
): WeightEntryState {
  if (action.type === 'userChanged') {
    return {
      weightText: action.value,
      activeSuggestion: null,
      userEdited: true,
      suggestionApplied: false,
    };
  }
  if (state.userEdited) return state;
  if (!action.suggestion) {
    return {
      ...state,
      weightText: state.suggestionApplied ? '' : state.weightText,
      activeSuggestion: null,
      suggestionApplied: false,
    };
  }
  return {
    ...state,
    weightText: formatWeight(action.suggestion.weightKg),
    activeSuggestion: action.suggestion,
    suggestionApplied: true,
  };
}
