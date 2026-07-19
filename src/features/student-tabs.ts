import { create } from 'zustand';

/**
 * Cross-tab sync tokens mirroring iOS StudentRootView: bumping a token tells
 * the owning tab to reload or react. Screens subscribe to the token value and
 * re-run their load effect when it changes.
 */
type StudentTabsStore = {
  /** Bumped when returning to the 今日 tab — Dashboard reloads. */
  todayReloadToken: number;
  /** Bumped by the Dashboard CTA — 训练 tab jumps to today. */
  trainingJumpToken: number;
  /** Bumped after a plan shift — plan-derived views reload. */
  planRevision: number;
  /** Bumped after imported-history backfill — 成长 tab reloads. */
  importedHistoryRefreshToken: number;
  /** Dashboard feedback card asks 成长 to focus its feedback section. */
  feedbackJumpToken: number;
  bumpTodayReload: () => void;
  bumpTrainingJump: () => void;
  bumpPlanRevision: () => void;
  bumpImportedHistoryRefresh: () => void;
  bumpFeedbackJump: () => void;
};

export const useStudentTabsStore = create<StudentTabsStore>((set) => ({
  todayReloadToken: 0,
  trainingJumpToken: 0,
  planRevision: 0,
  importedHistoryRefreshToken: 0,
  feedbackJumpToken: 0,
  bumpTodayReload: () => set((s) => ({ todayReloadToken: s.todayReloadToken + 1 })),
  bumpTrainingJump: () => set((s) => ({ trainingJumpToken: s.trainingJumpToken + 1 })),
  bumpPlanRevision: () => set((s) => ({ planRevision: s.planRevision + 1 })),
  bumpImportedHistoryRefresh: () =>
    set((s) => ({ importedHistoryRefreshToken: s.importedHistoryRefreshToken + 1 })),
  // TODO(W1 Growth): consume this token and scroll to 教练反馈记录.
  bumpFeedbackJump: () =>
    set((s) => ({ feedbackJumpToken: s.feedbackJumpToken + 1 })),
}));
