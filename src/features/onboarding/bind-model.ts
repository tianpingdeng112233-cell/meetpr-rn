import { t } from '@/i18n';

import { ApiError } from '@/api/client';
import type { BindRequest } from '@/api/domains/bind';

import type { InviteStash } from './model';

export type BindGateViewState =
  | 'loading'
  | 'needsCode'
  | 'needsOnboarding'
  | 'pendingAcceptance'
  | 'bound'
  | 'welcome'
  | 'handoffSubmitting'
  | 'handoffFailed'
  | 'failed';

export type BindGateResolution = {
  notice: string | null;
  state: BindGateViewState;
};

export const BIND_NOTICES = {
  get rejected() { return t('student.bindGateViewModel.copy001'); },
  get expired() { return t('student.bindGateViewModel.copy002'); },
  get invalidCode() { return t('student.bindGateViewModel.copy003'); },
  get network() { return t('student.bindGateViewModel.copy004'); },
  unlinked(coachName: string | null) {
    const name = coachName?.trim();
    const title = name
      ? t('student.bindGateViewModel.unlinkedNamed', [name])
      : t('student.bindGateViewModel.unlinkedFallback');
    return `${title}\n${t('student.bindGateViewModel.unlinkedHistory')}`;
  },
} as const;

export function resolveBindGateState(
  request: Pick<BindRequest, 'status' | 'ended_at' | 'coach_display_name'> | null,
  hasStash: boolean,
  onboardingComplete: boolean,
  firstRun?: { request: BindRequest; welcomeSeen: boolean },
): BindGateResolution {
  const status = request?.status;
  if (status === 'accepted') return {
    notice: null,
    state: firstRun && !firstRun.welcomeSeen && firstRun.request.first_run?.has_settled_day === false ? 'welcome' : 'bound',
  };
  if (status === 'pending') return { notice: null, state: 'pendingAcceptance' };
  const notice =
    status === 'rejected'
      ? BIND_NOTICES.rejected
      : status === 'expired'
        ? BIND_NOTICES.expired
        : status === 'cancelled' && request?.ended_at
          ? BIND_NOTICES.unlinked(request.coach_display_name)
          : null;
  if (!hasStash) return { notice, state: 'needsCode' };
  if (!onboardingComplete) return { notice, state: 'needsOnboarding' };
  return { notice, state: 'handoffSubmitting' };
}

export type StashHandoffResult =
  | { kind: 'requestSent'; request: BindRequest }
  | { kind: 'invalidCode' }
  | { kind: 'needsReload' }
  | { kind: 'handoffFailed' };

export async function resubmitInviteStash(
  stash: InviteStash,
  create: (input: { code: string; display_name: string }) => Promise<BindRequest>,
  clear: () => Promise<void>,
): Promise<StashHandoffResult> {
  try {
    const request = await create({ code: stash.code, display_name: stash.displayName });
    await clear();
    return { kind: 'requestSent', request };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INVITE_CODE_INVALID') {
      await clear();
      return { kind: 'invalidCode' };
    }
    if (
      error instanceof ApiError &&
      (error.code === 'BIND_REQUEST_ALREADY_PENDING' || error.code === 'BIND_ALREADY_BOUND')
    ) {
      return { kind: 'needsReload' };
    }
    return { kind: 'handoffFailed' };
  }
}
