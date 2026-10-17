import { API_BASE_URL } from '@/api/client';
import * as buildTrack from '@/config/build-track';
import { InviteCodeFormat } from '@/domain/coach/invite-code-format';
import { t } from '@/i18n';

/** Student landing page served by plan-web on the same origin as the API (spec 093 §3.4). */
export function inviteLink(code: string, baseUrl: string = API_BASE_URL): string {
  return `${baseUrl.replace(/\/+$/, '')}/i/${code}`;
}

/** Whether copy/share hands out the full invite message. Spec 093 ships on the China track only. */
export function sharesInviteMessage(): boolean {
  return buildTrack.BUILD_TRACK === 'china';
}

/**
 * Text placed on the clipboard when a coach copies a code. China track: a ready-to-send
 * message with the link, grouped code and coach name. Global track: the bare code (iOS parity).
 */
export function inviteCopyText(code: string, coachName?: string | null): string {
  if (!sharesInviteMessage()) return code;
  return t('coach.invites.message', [
    inviteLink(code),
    InviteCodeFormat.grouped(code),
    coachName?.trim() || t('coach.profile.fallbackName'),
  ]);
}
