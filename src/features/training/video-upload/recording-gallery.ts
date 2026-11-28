import { SerialTaskQueue } from '../serial-task-queue';

/** MediaCodec capacity is shared by the compressor and both Media3 export paths. */
export const videoTranscodes = new SerialTaskQueue();

type RecordingSave = { presentation: string; savedBadge: Promise<boolean> };
type UploadPreparation = { done: Promise<void>; finish: () => void; attached: boolean };
const uploads = new Map<string, UploadPreparation>();
const recordings = new Map<string, RecordingSave>();

function preparationFor(uri: string): UploadPreparation {
  const existing = uploads.get(uri);
  if (existing) return existing;
  let resolve!: () => void;
  const done = new Promise<void>(ready => { resolve = ready; });
  const finish = () => {
    resolve();
    for (const [key, job] of uploads) if (job.done === done) uploads.delete(key);
  };
  const preparation = { done, finish, attached: false };
  uploads.set(uri, preparation);
  return preparation;
}

/** Uploads from the library or with Photos switched off can also be opened in replay. */
export function beginUploadPreparation(uri: string) {
  const preparation = preparationFor(uri);
  preparation.attached = true;
  return preparation.finish;
}

export function pendingUploadPreparation(uri: string) {
  return uploads.get(uri)?.done;
}

export function startRecordingSave(uri: string, presentation: string, save: (prepared: Promise<void>) => Promise<boolean>) {
  const preparation = preparationFor(uri);
  const savedBadge = save(preparation.done).finally(() => {
    if (!preparation.attached) preparation.finish();
    for (const [key, job] of recordings) if (job.savedBadge === savedBadge) recordings.delete(key);
  });
  recordings.set(uri, { presentation, savedBadge });
  return savedBadge;
}

export function aliasRecordingSource(from: string, to: string) {
  const upload = uploads.get(from);
  if (upload) uploads.set(to, upload);
  const recording = recordings.get(from);
  if (recording) recordings.set(to, recording);
}

export function uploadPreparationFinished(uri: string) {
  uploads.get(uri)?.finish();
}

export function pendingRecordingSave(uri: string) {
  return recordings.get(uri);
}
