import { afterEach, expect, jest, test } from '@jest/globals';

import * as buildTrack from '@/config/build-track';
import { setLocaleOverride, t } from '@/i18n';
import { extractInviteCode } from '@/features/onboarding/model';

import { inviteCopyText, inviteLink, sharesInviteMessage } from '../invite-message';

jest.mock('@/config/build-track', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('@/config/build-track')>('@/config/build-track'),
  BUILD_TRACK: 'global',
}));

afterEach(() => {
  setLocaleOverride(null);
  jest.restoreAllMocks();
});

test('invite link points at the landing page on the API origin', () => {
  expect(inviteLink('XK7MPQ2RVT', 'http://121.40.160.241:3000/')).toBe('http://121.40.160.241:3000/i/XK7MPQ2RVT');
});

test('Global track keeps copying the bare code', () => {
  expect(sharesInviteMessage()).toBe(false);
  expect(inviteCopyText('XK7MPQ2RVT', 'Wang')).toBe('XK7MPQ2RVT');
});

test.each(['zh', 'en'] as const)('China track copies the full %s invite message', (locale) => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', 'china');
  setLocaleOverride(locale);
  const message = inviteCopyText('XK7MPQ2RVT', ' 王教练 ');
  expect(sharesInviteMessage()).toBe(true);
  expect(message).toContain('/i/XK7MPQ2RVT');
  expect(message).toContain('XK7M PQ2 RVT');
  expect(message).toContain('王教练');
  expect(message).not.toMatch(/\{\d\}/);
  // The student's paste button must read the code back out of the whole message.
  expect(extractInviteCode(message)).toBe('XK7MPQ2RVT');
});

test('China track falls back to the generic coach name', () => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', 'china');
  setLocaleOverride('zh');
  expect(inviteCopyText('XK7MPQ2RVT', '  ')).toContain(`—— ${t('coach.profile.fallbackName')}`);
});
