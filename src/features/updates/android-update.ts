import legacyNotes from '@/i18n/generated/android-release-notes-zh-Hant.json';
import { getLocaleHeader, getLocale } from '@/i18n';
import { z } from 'zod';

export const ANDROID_RELEASE_URL = 'https://dl.meetpr.cn/android/latest.json';

const releaseSchema = z.object({
  schemaVersion: z.literal(1),
  packageName: z.literal('com.meetpr.app'),
  versionCode: z.number().int().positive().max(2100000000),
  versionName: z.string().trim().min(1).max(32),
  releaseNotes: z.string().trim().min(1).max(1200),
  releaseNotesZhHant: z.string().trim().min(1).max(12000).optional(),
  downloadUrl: z.string(),
}).refine(release => release.downloadUrl ===
  `https://dl.meetpr.cn/android/releases/${release.versionCode}/meetpr-cn.apk`);

/** Older manifests have no localized field; known shipped notes have a generated fallback. */
export function androidReleaseNotes(release: AndroidRelease): string {
  if (getLocale() !== 'zh-Hant') return release.releaseNotes;
  return release.releaseNotesZhHant ??
    (Object.hasOwn(legacyNotes, release.releaseNotes) ? (legacyNotes as Record<string, string>)[release.releaseNotes] : '');
}

export type AndroidRelease = z.infer<typeof releaseSchema>;

export type InstalledAndroidApp = {
  platform: string;
  track: string;
  applicationId: string | null;
  buildVersion: string | null;
};

/** null means a successful check with no newer build; undefined means no successful check. */
export async function checkForAndroidUpdate(
  installed: InstalledAndroidApp,
  signal?: AbortSignal,
): Promise<AndroidRelease | null | undefined> {
  const build = Number(installed.buildVersion);
  if (installed.platform !== 'android' || installed.track !== 'china' ||
      installed.applicationId !== 'com.meetpr.app' || !Number.isSafeInteger(build) || build < 1 || signal?.aborted) {
    return undefined;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 8000);
  try {
    const cancelled = new Promise<undefined>(resolve => {
      controller.signal.addEventListener('abort', () => resolve(undefined), { once: true });
    });
    const request = async () => {
      const response = await fetch(ANDROID_RELEASE_URL, { cache: 'no-store', signal: controller.signal, headers: { 'X-MeetPR-Locale': getLocaleHeader() } });
      if (!response.ok) return undefined;
      const release = releaseSchema.safeParse(await response.json());
      if (controller.signal.aborted || !release.success) return undefined;
      return release.data.versionCode > build ? release.data : null;
    };
    return await Promise.race([request(), cancelled]);
  } catch {
    // Checking for an optional update must never prevent use of the app.
    return undefined;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
