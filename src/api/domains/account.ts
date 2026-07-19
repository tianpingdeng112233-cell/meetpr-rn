import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';

export const ChangePasswordRequestSchema = z
  .object({
    old_password: z.string(),
    new_password: z.string(),
  })
  .strict();

export type ChangePasswordRequest = z.infer<
  typeof ChangePasswordRequestSchema
>;

async function changePassword(input: ChangePasswordRequest): Promise<void> {
  const body = ChangePasswordRequestSchema.parse(input);
  await authenticatedRequest('/me/password', {
    method: 'PUT',
    body,
  });
}

async function deleteAccount(): Promise<void> {
  await authenticatedRequest('/me', { method: 'DELETE' });
}

export const accountRepository = { changePassword, deleteAccount };

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountRepository.changePassword,
    onSuccess: () => queryClient.clear(),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountRepository.deleteAccount,
    onSuccess: () => queryClient.clear(),
  });
}
