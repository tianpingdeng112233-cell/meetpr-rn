import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';

import {
  EMPTY_VIDEO_UPLOAD,
  recoverInterruptedVideoUploads,
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
  status: z.enum([
    'none',
    'pending',
    'preparing',
    'uploading',
    'uploaded',
    'failed',
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

async function persist(records: Record<string, VideoUploadRecord>): Promise<void> {
  await AsyncStorage.setItem(
    VIDEO_UPLOAD_STORAGE_KEY,
    JSON.stringify({ version: 1, records }),
  );
}

let persistChain: Promise<void> = Promise.resolve();

function schedulePersist(records: Record<string, VideoUploadRecord>): void {
  persistChain = persistChain
    .then(() => persist(records))
    .catch(() => undefined);
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

    let changed = false;
    changed = Object.values(records).some(
      (record) =>
        record.status === 'pending' ||
        record.status === 'preparing' ||
        record.status === 'uploading',
    );
    records = recoverInterruptedVideoUploads(records);
    set({ hydrated: true, records });
    if (changed) await persist(records);
  },
  dispatch: (studentId, stableSetId, event) => {
    const key = uploadKey(studentId, stableSetId);
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

export function resetVideoUploadStoreForTests(): void {
  persistChain = Promise.resolve();
  useVideoUploadStore.setState({ hydrated: false, records: {} });
}
