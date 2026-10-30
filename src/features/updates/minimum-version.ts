import { z } from 'zod';
import { API_BASE_URL } from '@/api/client';

const minimumVersionSchema = z.object({ min_build: z.number().int().min(0).max(2100000000) });

/** null releases startup, including unknown builds, invalid responses and transport failures. */
export async function checkMinimumAndroidVersion(buildVersion: string | null, signal?: AbortSignal): Promise<number | null> {
  const build = Number(buildVersion);
  if (!buildVersion || !/^\d+$/.test(buildVersion) || !Number.isSafeInteger(build) || build < 1 || signal?.aborted) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 8000);
  try {
    const cancelled = new Promise<null>(resolve => {
      controller.signal.addEventListener('abort', () => resolve(null), { once: true });
    });
    const request = async () => {
      const response = await fetch(`${API_BASE_URL}/app/min-version?platform=android`, {
        method: 'GET', signal: controller.signal,
      });
      if (!response.ok) return null;
      const result = minimumVersionSchema.safeParse(await response.json());
      if (controller.signal.aborted || !result.success) return null;
      return build < result.data.min_build ? result.data.min_build : null;
    };
    // Some transports ignore AbortSignal; the deadline must still release startup.
    return await Promise.race([request(), cancelled]);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
