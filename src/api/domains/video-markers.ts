import { z } from 'zod';
import { authenticatedRequest } from '../session';
import { TimestampSchema, UuidSchema } from './shared';
export const VideoMarkerSchema = z.object({ id: UuidSchema, video_id: UuidSchema, coach_id: UuidSchema, time_ms: z.number().int().nonnegative(), level: z.enum(['info', 'warn', 'bad']), note: z.string(), created_at: TimestampSchema, attachment_id: UuidSchema.nullish(), annotation_url: z.string().url().nullish(), annotation_expires_in: z.number().nullish() });
export const CreateVideoMarkerSchema = z.object({ time_ms: z.number().int().nonnegative(), level: z.literal('info'), note: z.string().refine(value => Array.from(value).length <= 500, 'Maximum 500 characters') }).strict();
export type VideoMarker = z.infer<typeof VideoMarkerSchema>;
const path = (id: string) => `/videos/${UuidSchema.parse(id)}/markers`;
export const videoMarkersRepository = {
  list: (id: string) => authenticatedRequest(path(id), { schema: z.object({ markers: z.array(VideoMarkerSchema) }) }),
  create: (id: string, time: number, note: string) => authenticatedRequest(path(id), { method: 'POST', body: CreateVideoMarkerSchema.parse({ time_ms: time, level: 'info', note }), schema: VideoMarkerSchema }),
  remove: async (id: string, markerID: string): Promise<void> => { await authenticatedRequest(`${path(id)}/${UuidSchema.parse(markerID)}`, { method: 'DELETE' }); },
};
export function sortedMarkers(markers: readonly VideoMarker[]) { return [...markers].sort((a, b) => a.time_ms - b.time_ms || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); }
