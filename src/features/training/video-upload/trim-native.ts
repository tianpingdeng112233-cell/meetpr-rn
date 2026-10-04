import { File, Paths } from 'expo-file-system';
import { requireNativeModule, uuid } from 'expo-modules-core';
import { deleteLocalVideo } from './native';
import type { TrimmedVideo } from './trim-session';

type TrimNativeModule = {
  trimInfo(uri: string): Promise<{ durationMs: number; videoTrackCount: number }>;
  thumbnails(uri: string, count: number): Promise<string[]>;
  trim(uri: string, startMs: number, endMs: number): Promise<TrimmedVideo>;
  cancelTrim(uri: string): Promise<void>;
};

export const trainingVideoTrim = () => requireNativeModule<TrimNativeModule>('TrainingVideo');

/** Only this new cache file belongs to the trim session; never remove the caller's original. */
export async function copyTrimSource(uri: string): Promise<string> {
  // The compressor owns bare UUID MP4s in this directory and may reclaim them on failure.
  const copy = new File(Paths.cache, `training-trim-${uuid.v4()}.mp4`);
  try {
    await new File(uri).copy(copy);
    if (!copy.exists || copy.size <= 0) throw new Error('Empty trim source');
    return copy.uri;
  } catch (error) {
    deleteLocalVideo(copy.uri);
    throw error;
  }
}
