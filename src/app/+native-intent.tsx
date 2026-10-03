import { BUILD_TRACK } from '@/config/build-track';

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  // AuthSession listens to this same native URL event and validates OAuth state.
  // Keep Router on the form instead of opening an unmatched callback route.
  if (BUILD_TRACK === 'global' && /^com\.googleusercontent\.apps\.[\w-]+:\/oauth2redirect(?:[?#]|$)/.test(path)) {
    return initial ? '/' : null;
  }
  return path;
}
