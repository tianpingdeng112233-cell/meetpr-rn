import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { TimestampSchema, UuidSchema } from './shared';
import { videoKeys } from './videos';

const MEBIBYTE = 1024 * 1024;
const VIDEO_MAX_BYTES = 200 * MEBIBYTE;
const DOCUMENT_MAX_BYTES = 20 * MEBIBYTE;

export const UploadKindSchema = z.enum([
  'set_video',
  'onboarding_video',
  'onboarding_doc',
]);

export const UploadInitiateRequestSchema = z
  .object({
    kind: UploadKindSchema,
    content_type: z.enum([
      'video/mp4',
      'video/quicktime',
      'image/png',
      'image/jpeg',
      'application/pdf',
    ]),
    size_bytes: z.number().int().positive(),
    part_count: z.number().int().min(1).max(200),
    filename: z.string().optional(),
    set_log_id: UuidSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const isDocument = value.kind === 'onboarding_doc';
    const allowedType = isDocument
      ? ['image/png', 'image/jpeg', 'application/pdf'].includes(value.content_type)
      : ['video/mp4', 'video/quicktime'].includes(value.content_type);
    if (!allowedType) {
      context.addIssue({
        code: 'custom',
        message: 'content_type does not match kind',
        path: ['content_type'],
      });
    }
    const maxBytes = isDocument ? DOCUMENT_MAX_BYTES : VIDEO_MAX_BYTES;
    if (value.size_bytes > maxBytes) {
      context.addIssue({
        code: 'too_big',
        maximum: maxBytes,
        origin: 'number',
        path: ['size_bytes'],
        message: 'upload exceeds the size limit for its kind',
      });
    }
    if (value.part_count > Math.ceil(value.size_bytes / MEBIBYTE)) {
      context.addIssue({
        code: 'custom',
        message: 'part_count exceeds the 1 MiB part ceiling',
        path: ['part_count'],
      });
    }
    if (value.kind !== 'set_video' && value.set_log_id !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'set_log_id is only valid for set_video',
        path: ['set_log_id'],
      });
    }
  });

export const UploadInitiateResponseSchema = z.object({
  attachment_id: UuidSchema,
  upload_id: z.string(),
  part_urls: z.array(
    z.object({
      part_number: z.number().int().min(1).max(200),
      url: z.string().url(),
    }),
  ),
});

export const UploadCompleteRequestSchema = z
  .object({
    parts: z
      .array(
        z
          .object({
            part_number: z.number().int().min(1).max(200),
            etag: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const numbers = new Set<number>();
    value.parts.forEach(({ part_number }, index) => {
      if (numbers.has(part_number)) {
        context.addIssue({
          code: 'custom',
          message: 'part_number must be unique',
          path: ['parts', index, 'part_number'],
        });
      }
      numbers.add(part_number);
    });
  });

export const AttachmentSchema = z.object({
  id: UuidSchema,
  owner_id: UuidSchema,
  kind: UploadKindSchema,
  oss_key: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int(),
  filename: z.string().nullable(),
  set_log_id: UuidSchema.nullable(),
  source_plan_id: UuidSchema.nullable(),
  source_coach_id: UuidSchema.nullable(),
  is_unlinked_explicit: z.boolean(),
  part_count: z.number().int(),
  actual_size_bytes: z.number().int().nullable(),
  status: z.literal('ready'),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const UploadAbortRequestSchema = z.object({}).strict();

export const UploadUrlResponseSchema = z.object({
  url: z.string().url(),
  expires_in: z.literal(900),
});

export type UploadInitiateRequest = z.infer<typeof UploadInitiateRequestSchema>;
export type UploadInitiateResponse = z.infer<typeof UploadInitiateResponseSchema>;
export type UploadCompleteRequest = z.infer<typeof UploadCompleteRequestSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;

async function initiate(
  input: UploadInitiateRequest,
): Promise<UploadInitiateResponse> {
  const body = UploadInitiateRequestSchema.parse(input);
  return authenticatedRequest('/uploads/initiate', {
    method: 'POST',
    body,
    schema: UploadInitiateResponseSchema,
  });
}

async function complete(
  attachmentId: string,
  input: UploadCompleteRequest,
): Promise<Attachment> {
  const id = UuidSchema.parse(attachmentId);
  const body = UploadCompleteRequestSchema.parse(input);
  return authenticatedRequest(`/uploads/${id}/complete`, {
    method: 'POST',
    body,
    schema: AttachmentSchema,
  });
}

async function abort(attachmentId: string): Promise<void> {
  const id = UuidSchema.parse(attachmentId);
  await authenticatedRequest(`/uploads/${id}/abort`, {
    method: 'POST',
    body: UploadAbortRequestSchema.parse({}),
  });
}

async function remove(attachmentId: string): Promise<void> {
  const id = UuidSchema.parse(attachmentId);
  await authenticatedRequest(`/uploads/${id}`, { method: 'DELETE' });
}

async function url(attachmentId: string): Promise<UploadUrlResponse> {
  const id = UuidSchema.parse(attachmentId);
  return authenticatedRequest(`/uploads/${id}/url`, {
    schema: UploadUrlResponseSchema,
  });
}

export const uploadsRepository = { abort, complete, initiate, remove, url };

export const uploadKeys = {
  all: ['uploads'] as const,
  url: (attachmentId: string) => ['uploads', attachmentId, 'url'] as const,
};

export function useUploadUrl(attachmentId: string) {
  return useQuery({
    queryKey: uploadKeys.url(attachmentId),
    queryFn: () => uploadsRepository.url(attachmentId),
    enabled: Boolean(attachmentId),
  });
}

export function useInitiateUpload() {
  return useMutation({ mutationFn: uploadsRepository.initiate });
}

export function useCompleteUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attachmentId, input }: {
      attachmentId: string;
      input: UploadCompleteRequest;
    }) => uploadsRepository.complete(attachmentId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: uploadKeys.all }),
        queryClient.invalidateQueries({ queryKey: videoKeys.all }),
      ]),
  });
}

export function useAbortUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadsRepository.abort,
    onSuccess: (_, attachmentId) =>
      queryClient.invalidateQueries({ queryKey: uploadKeys.url(attachmentId) }),
  });
}

export function useRemoveUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadsRepository.remove,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: uploadKeys.all }),
        queryClient.invalidateQueries({ queryKey: videoKeys.all }),
      ]),
  });
}
