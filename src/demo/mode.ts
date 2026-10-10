/** Keep the direct env access for Expo's build-time substitution; callable for Jest toggling. */
export function isDemoMode(): boolean {
  return process.env.EXPO_PUBLIC_DEMO_MODE === '1';
}
