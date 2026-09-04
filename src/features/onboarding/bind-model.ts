import { t } from '@/i18n';

import { ApiError } from '@/api/client';
import type { BindRequest, BindRequestStatus } from '@/api/domains/bind';

import type { InviteStash } from './model';

export type BindGateViewState =
  | 'loading'
  | 'needsCode'
  | 'needsOnboarding'
  | 'pendingAcceptance'
  | 'bound'
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
} as const;

export function resolveBindGateState(
  status: BindRequestStatus | 'none',
  hasStash: boolean,
  onboardingComplete: boolean,
): BindGateResolution {
  if (status === 'accepted') return { notice: null, state: 'bound' };
  if (status === 'pending') return { notice: null, state: 'pendingAcceptance' };
  const notice =
    status === 'rejected'
      ? BIND_NOTICES.rejected
      : status === 'expired'
        ? BIND_NOTICES.expired
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

