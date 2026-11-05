import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '@/api/client';
import { bindRepository, BindRequestSchema, type MineBindRequestResponse } from '@/api/domains/bind';
import { storageQueue } from '@/features/training/set-sync/queue';
import { readWorkoutSnapshot } from '@/features/training/set-sync/workout-snapshot';

/** Live authority wins. Only a prior accepted account with a workout can resume offline. */
export async function loadTrainingBinding(
  studentId: string, isCurrent: () => boolean,
): Promise<MineBindRequestResponse> {
  const key = `meetpr.bind.offline.v1.${studentId}`;
  const writes = storageQueue(AsyncStorage, key);
  let response: MineBindRequestResponse;
  try {
    response = await bindRepository.mine();
  } catch (error) {
    if (!isCurrent()) throw error;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await writes.enqueue(() => isCurrent() ? AsyncStorage.removeItem(key) : Promise.resolve());
    }
    if (!(error instanceof ApiError) || error.kind !== 'network' || error.status !== undefined) throw error;
    try {
      const raw = await writes.enqueue(() => AsyncStorage.getItem(key));
      const parsed = raw ? BindRequestSchema.safeParse(JSON.parse(raw)) : null;
      if (parsed?.success && parsed.data.student_id === studentId &&
        parsed.data.status === 'accepted' && !parsed.data.ended_at &&
        await readWorkoutSnapshot(studentId)) return { bind_request: parsed.data };
    } catch { /* Unreadable local state cannot establish access. */ }
    throw error;
  }
  if (isCurrent()) {
    const request = response.bind_request;
    await writes.enqueue(async () => {
      if (!isCurrent()) return;
      if (request?.student_id === studentId && request.status === 'accepted' && !request.ended_at) {
        await AsyncStorage.setItem(key, JSON.stringify(request));
      } else {
        await AsyncStorage.removeItem(key);
      }
    }).catch(() => {}); // Cache availability must not revoke a live accepted binding.
  }
  return response;
}
