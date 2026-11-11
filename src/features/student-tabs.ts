import type { PlanDetail } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { create } from 'zustand';

/**
 * Cross-tab sync tokens mirroring iOS StudentRootView: bumping a token tells
 * the owning tab to reload or react. Screens subscribe to the token value and
 * re-run their load effect when it changes.
 */
export type TrainingHandoff = { plan: PlanDetail; dayID: string; existingLogs: SetLog[] };
type StudentTabsStore = {
  trainingHandoff: TrainingHandoff | null;
  videoNotificationDay: { studentId: string; dayId: string } | null;
  handoffTraining: (handoff: TrainingHandoff) => void;
  completionRevision: number;
  bumpCompletionRevision: () => void;
  /** Bumped by a training deep link — 训练 tab consumes a day-ID handoff. */
  trainingJumpToken: number;
  /** Bumped after a plan change — plan-derived views reload. */
  planRevision: number;
  /** Bumped after imported-history backfill — 成长 tab reloads. */
  importedHistoryRefreshToken: number;
  bumpTrainingJump: () => void;
  bumpPlanRevision: () => void;
  bumpImportedHistoryRefresh: () => void;
};

export const useStudentTabsStore = create<StudentTabsStore>((set) => ({
  trainingHandoff: null,
  videoNotificationDay: null,
  handoffTraining: (trainingHandoff) => set(s => ({ trainingHandoff, trainingJumpToken: s.trainingJumpToken + 1 })),
  completionRevision: 0,
  bumpCompletionRevision: () => set(s => ({ completionRevision: s.completionRevision + 1, planRevision: s.planRevision + 1 })),
  trainingJumpToken: 0,
  planRevision: 0,
  importedHistoryRefreshToken: 0,
  bumpTrainingJump: () => set((s) => ({ trainingJumpToken: s.trainingJumpToken + 1 })),
  bumpPlanRevision: () => set((s) => ({ planRevision: s.planRevision + 1 })),
  bumpImportedHistoryRefresh: () =>
    set((s) => ({ importedHistoryRefreshToken: s.importedHistoryRefreshToken + 1 })),
}));
