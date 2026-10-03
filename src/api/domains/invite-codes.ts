import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { TimestampSchema, UuidSchema } from './shared';

// iOS 202e95db: CoreModels/Entities/Bind/InviteCode + Networking/DTO/BindDTOs.
export const InviteCodeTypeSchema = z.enum(['personal_permanent', 'single_use', 'time_limited']);
export const InviteCodeSchema = z.object({
  id: UuidSchema,
  coach_id: UuidSchema,
  code: z.string().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/),
  type: InviteCodeTypeSchema,
  max_uses: z.number().int().nullable().optional(),
  used_count: z.number().int().nonnegative(),
  expires_at: TimestampSchema.nullable().optional(),
  revoked_at: TimestampSchema.nullable().optional(),
  label: z.string().nullable().optional(),
  created_at: TimestampSchema,
});
export type InviteCode = z.infer<typeof InviteCodeSchema>;

export const CreateInviteCodeRequestSchema = z.object({
  type: InviteCodeTypeSchema,
  label: z.string().max(100).optional(),
  expires_in_days: z.number().int().min(1).max(365).optional(),
}).strict().superRefine((input, context) => {
  if ((input.type === 'time_limited') !== (input.expires_in_days !== undefined)) {
    context.addIssue({ code: 'custom', path: ['expires_in_days'], message: 'Expiry is required only for time-limited codes' });
  }
});
export type CreateInviteCodeRequest = z.infer<typeof CreateInviteCodeRequestSchema>;

export const inviteCodesRepository = {
  async listCodes(): Promise<InviteCode[]> {
    const result = await authenticatedRequest('/coach/invite-codes', {
      schema: z.object({ invite_codes: z.array(InviteCodeSchema) }),
    });
    return result.invite_codes;
  },
  async createCode(input: CreateInviteCodeRequest): Promise<InviteCode> {
    return authenticatedRequest('/coach/invite-codes', {
      method: 'POST', body: CreateInviteCodeRequestSchema.parse(input), schema: InviteCodeSchema,
    });
  },
  async revokeCode(id: string): Promise<void> {
    await authenticatedRequest(`/coach/invite-codes/${UuidSchema.parse(id)}`, { method: 'DELETE' });
  },
};
export type InviteCodesRepository = typeof inviteCodesRepository;
