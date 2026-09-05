import { beforeEach, expect, jest, test } from '@jest/globals';
import { emailRegister, requestPasswordReset, UserSchema } from '../auth';

const user = { id: '00000000-0000-4000-8000-000000000001', phone: null, email: 'a@b.co', role: 'coached_student', createdAt: '2026-09-04T12:00:00Z' };
const response = (status: number, body = '') => ({ ok: status < 400, status, text: async () => body }) as Response;
beforeEach(() => { global.fetch = jest.fn<typeof fetch>(); });
test('accepts a Global user with nullable phone and email', () => {
  expect(UserSchema.parse(user)).toMatchObject({ phone: null, email: 'a@b.co' });
});
test('registers email with the fixed student role and device timezone', async () => {
  jest.mocked(fetch).mockResolvedValue(response(201, JSON.stringify({ user, accessToken: 'access', refreshToken: 'refresh' })));
  await emailRegister({ email: 'a@b.co', password: 'password', timezone: 'Europe/London' });
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/email\/register$/), expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@b.co', password: 'password', role: 'coached_student', timezone: 'Europe/London' }) }));
});
test('accepts an empty 204 password reset request response', async () => {
  jest.mocked(fetch).mockResolvedValue(response(204));
  await expect(requestPasswordReset({ email: 'a@b.co' })).resolves.toBeUndefined();
});
test('classifies the AUTH_EMAIL_TAKEN error envelope', async () => {
  jest.mocked(fetch).mockResolvedValue(response(409, '{"error":"AUTH_EMAIL_TAKEN"}'));
  await expect(emailRegister({ email: 'a@b.co', password: 'password', timezone: 'Europe/London' })).rejects.toMatchObject({ name: 'ApiError', code: 'AUTH_EMAIL_TAKEN' });
});
