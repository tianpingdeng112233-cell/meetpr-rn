import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { TimestampSchema, UuidSchema } from './shared';

export const BindRequestStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'expired',
  'cancelled',
]);

export const BindRequestSchema = z.object({
  id: UuidSchema,
  student_id: UuidSchema,
  coach_id: UuidSchema,
  coach_display_name: z.string().nullable(),
  invite_code_id: UuidSchema.nullable(),
  status: BindRequestStatusSchema,
  submitted_at: TimestampSchema,
  responded_at: TimestampSchema.nullable(),
  expired_at: TimestampSchema,
  skip_evaluation: z.boolean(),
  skip_reason: z.string().nullable(),
});

export const CreateBindRequestSchema = z
  .object({
    code: z.string().min(1).max(20),
    display_name: z.string().min(1).max(100),
  })
  .strict();

export const MineBindRequestResponseSchema = z.object({
  bind_request: BindRequestSchema.nullable(),
});

export type BindRequest = z.infer<typeof BindRequestSchema>;
export type CreateBindRequest = z.infer<typeof CreateBindRequestSchema>;
export type MineBindRequestResponse = z.infer<
  typeof MineBindRequestResponseSchema
>;

async function create(input: CreateBindRequest): Promise<BindRequest> {
  const body = CreateBindRequestSchema.parse(input);
  return authenticatedRequest('/bind-requests', {
    method: 'POST',
    body,
    schema: BindRequestSchema,
  });
}

async function mine(): Promise<MineBindRequestResponse> {
  return authenticatedRequest('/bind-requests/mine', {
    schema: MineBindRequestResponseSchema,
  });
}

async function cancel(bindRequestId: string): Promise<void> {
  const id = UuidSchema.parse(bindRequestId);
  await authenticatedRequest(`/bind-requests/${id}`, { method: 'DELETE' });
}

export const bindRepository = { cancel, create, mine };

export const bindKeys = {
  mine: ['bind-requests', 'mine'] as const,
};

/** Role gate: bind-request endpoints are available only to `coached_student`. */
export function useMineBindRequest() {
  return useQuery({ queryKey: bindKeys.mine, queryFn: bindRepository.mine });
}

/** Role gate: bind-request endpoints are available only to `coached_student`. */
export function useCreateBindRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bindRepository.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bindKeys.mine }),
  });
}

/** Role gate: bind-request endpoints are available only to `coached_student`. */
export function useCancelBindRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bindRepository.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bindKeys.mine }),
  });
}
