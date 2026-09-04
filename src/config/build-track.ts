export const BUILD_TRACK = process.env.EXPO_PUBLIC_BUILD_TRACK === 'china' ? 'china' : 'global';
export const DEFAULT_API_BASE_URL = BUILD_TRACK === 'global'
  ? 'https://api.meetpr.app'
  : 'http://121.40.160.241:3000';
