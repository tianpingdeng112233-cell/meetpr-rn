import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const china = process.env.EXPO_PUBLIC_BUILD_TRACK === 'china';
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const prefix = clientId?.match(/^([\w-]+)\.apps\.googleusercontent\.com$/)?.[1];
  const schemes = typeof config.scheme === 'string' ? [config.scheme] : config.scheme ?? [];
  return {
    ...config,
    name: config.name ?? 'MeetPR',
    slug: config.slug ?? 'meetpr',
    scheme: !china && prefix ? [...schemes, `com.googleusercontent.apps.${prefix}`] : schemes,
    plugins: [
      ...(config.plugins ?? []),
      ['expo-build-properties', { android: { usesCleartextTraffic: china } }],
    ],
  };
};
