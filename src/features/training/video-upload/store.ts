import { SetLogUpsertRequestSchema } from '@/api/domains/sets';
import { videosRepository, type StudentVideo } from '@/api/domains/videos';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';

import {
  EMPTY_VIDEO_UPLOAD,
  type VideoUploadEvent,
  type VideoUploadRecord,
  videoUploadReducer,
} from './model';

const VIDEO_UPLOAD_STORAGE_KEY = 'training.videoUploads.v1';

const SelectedVideoSchema = z.object({
  uri: z.string(),
  width: z.number(),
  height: z.number(),
  durationMs: z.number().nullable(),
  mimeType: z.string().nullable(),
  fileName: z.string().nullable(),
  codec: z.string().nullable(),
  rotationDegrees: z.number(),
});

const VideoUploadRecordSchema = z.object({
  logRequest: SetLogUpsertRequestSchema.nullable().default(null),
  createdAt: z.number().default(0),
  retry: z
    .object({
      failureCount: z.number(),
      firstFailureAt: z.number(),
      lastFailureAt: z.number(),
      failure: z.enum(['network', 'deterministic', 'unknown']),
    })
    .nullable()
    .default(null),
  session: z
    .object({
      attachment_id: z.string(),
      upload_id: z.string(),
      part_urls: z.array(
        z.object({ part_number: z.number(), url: z.string() }),
      ),
    })
    .nullable()
    .default(null),
  parts: z
    .array(z.object({ part_number: z.number(), etag: z.string() }))
    .default([]),
  status: z.enum([
    'none',
    'pending',
    'preparing',
    'uploading',
    'uploaded',
    'failed',
    'waiting',
  ]),
  progress: z.number().min(0).max(1),
  source: SelectedVideoSchema.nullable(),
  setLogId: z.string().nullable(),
  localUri: z.string().nullable(),
  sizeBytes: z.number().positive().nullable(),
  prepared: z.boolean(),
  attachmentId: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

const StoredUploadsSchema = z.object({
  version: z.literal(1),
  records: z.record(z.string(), VideoUploadRecordSchema),
});

function uploadKey(studentId: string, stableSetId: string): string {
  return `${studentId}:${stableSetId}`;
}

async function persist(
  records: Record<string, VideoUploadRecord>,
): Promise<void> {
  await AsyncStorage.setItem(
    VIDEO_UPLOAD_STORAGE_KEY,
    JSON.stringify({ version: 1, records }),
  );
}

let persistChain: Promise<void> = Promise.resolve();
const remoteRequests = new Map<string, symbol>();

function schedulePersist(records: Record<string, VideoUploadRecord>): void {
  persistChain = persistChain
    .catch(() => undefined)
    .then(() => persist(records));
  void persistChain.catch(() => undefined);
}

type VideoUploadStore = {
  hydrated: boolean;
  records: Record<string, VideoUploadRecord>;
  hydrate: () => Promise<void>;
  dispatch: (
    studentId: string,
    stableSetId: string,
    event: VideoUploadEvent,
  ) => VideoUploadRecord;
};

export const useVideoUploadStore = create<VideoUploadStore>((set, get) => ({
  hydrated: false,
  records: {},
  hydrate: async () => {
    if (get().hydrated) return;
    let records: Record<string, VideoUploadRecord> = {};
    try {
      const raw = await AsyncStorage.getItem(VIDEO_UPLOAD_STORAGE_KEY);
      if (raw) {
        const parsed = StoredUploadsSchema.safeParse(JSON.parse(raw));
        if (parsed.success) records = parsed.data.records;
      }
    } catch {
      records = {};
    }

    // Never overwrite newer in-memory records when root and attach hydrate together.
    if (!get().hydrated)
      set({ hydrated: true, records: { ...records, ...get().records } });
  },
  dispatch: (studentId, stableSetId, event) => {
    const key = uploadKey(studentId, stableSetId);
    remoteRequests.delete(key);
    const current = get().records[key] ?? EMPTY_VIDEO_UPLOAD;
    const next = videoUploadReducer(current, event);
    const records = { ...get().records };
    if (next.status === 'none') delete records[key];
    else records[key] = next;
    set({ records });
    schedulePersist(records);
    return next;
  },
}));

export function selectVideoUpload(
  studentId: string,
  stableSetId: string,
): (state: VideoUploadStore) => VideoUploadRecord {
  const key = uploadKey(studentId, stableSetId);
  return (state) => state.records[key] ?? EMPTY_VIDEO_UPLOAD;
}

export async function hydrateVideoUploads(): Promise<void> {
  await useVideoUploadStore.getState().hydrate();
}

export type VideoAttachmentSet = { stableSetId: string; setLogId: string };

/** One student-wide fetch; only the selected day's existing logs are reconciled. */
export async function hydrateRemoteVideoAttachments(
  studentId: string,
  sets: readonly VideoAttachmentSet[],
): Promise<void> {
  if (!studentId || sets.length === 0) return;
  const request = Symbol('remote attachments');
  const keys = sets.map(({ stableSetId }) => uploadKey(studentId, stableSetId));
  try {
    await hydrateVideoUploads();
    keys.forEach((key) => remoteRequests.set(key, request));
    const { videos } = await videosRepository.list(studentId);
    const bySetLog = new Map<string, StudentVideo[]>();
    for (const video of videos) {
      if (!video.set_log_id) continue;
      const group = bySetLog.get(video.set_log_id) ?? [];
      group.push(video);
      bySetLog.set(video.set_log_id, group);
    }
    const records = { ...useVideoUploadStore.getState().records };
    for (const { stableSetId, setLogId } of sets) {
      const key = uploadKey(studentId, stableSetId);
      // Local mutations and newer refreshes win over an in-flight response.
      if (remoteRequests.get(key) !== request) continue;
      const remote = bySetLog.get(setLogId) ?? [];
      const current = records[key];
      if (current) {
        if (
          current.status === 'uploaded' &&
          current.setLogId === setLogId &&
          !remote.some((video) => video.id === current.attachmentId)
        ) delete records[key];
        continue;
      }
      const video = remote[0];
      if (!video) continue;
      records[key] = {
        ...EMPTY_VIDEO_UPLOAD,
        status: 'uploaded',
        progress: 1,
        attachmentId: video.id,
        setLogId,
        sizeBytes: video.size_bytes,
        createdAt: Date.parse(video.created_at),
      };
    }
    useVideoUploadStore.setState({ records });
    schedulePersist(records);
    await flushVideoUploads();
  } catch {
    // Attachment refresh must never block recording; the next refresh retries.
  } finally {
    keys.forEach((key) => {
      if (remoteRequests.get(key) === request) remoteRequests.delete(key);
    });
  }
}

export function resetVideoUploadStoreForTests(): void {
  persistChain = Promise.resolve();
  remoteRequests.clear();
  useVideoUploadStore.setState({ hydrated: false, records: {} });
}

export async function flushVideoUploads(): Promise<void> {
  await persistChain;
}
